import binanceService, { BinanceTradeEvent } from "../services/binanceService";
import {
  processTrade,
  GeneratedSignal,
  SignalType,
  clearAnalyzerData,
  setAnalyzerSymbol,
} from "../utils/signalGenerator";

// Define SignalData interface locally instead of importing from mockApi
export interface SignalData {
  signal: SignalType;
  entryPoint: number;
  stopLoss: number;
  targetPrice: number;
  confidence: number;
  reasoning: string;
  timestamp: string;
}

// Cache for the latest signals by symbol and timeframe
// Format: {"SYMBOL_TIMEFRAME": { data: SignalData, timestamp: number }}
// Use a module-level variable that persists between renders
interface CachedSignal {
  data: SignalData;
  timestamp: number;
  priceAtGeneration: number;
}

const signalCache: Record<string, CachedSignal> = {};

// Debounce configuration - significantly reduced to ensure fresher data
const SIGNAL_DEBOUNCE_TIME: Record<string, number> = {
  "1m": 30000, // 30 seconds for 1m timeframe (reduced from 60s)
  "5m": 60000, // 1 minute for 5m timeframe (reduced from 3m)
  "15m": 120000, // 2 minutes for 15m timeframe (reduced from 5m)
  "1h": 300000, // 5 minutes for 1h timeframe (reduced from 10m)
  "4h": 600000, // 10 minutes for 4h timeframe (reduced from 20m)
  "1d": 900000, // 15 minutes for 1d timeframe (reduced from 30m)
};

// Price change threshold that would trigger a new signal regardless of debounce time
// Values represent percentage change (e.g., 0.01 = 1%)
const PRICE_CHANGE_THRESHOLD: Record<string, number> = {
  "1m": 0.01, // 1.0% for 1m timeframe
  "5m": 0.015, // 1.5% for 5m timeframe
  "15m": 0.02, // 2.0% for 15m timeframe
  "1h": 0.025, // 2.5% for 1h timeframe
  "4h": 0.03, // 3.0% for 4h timeframe
  "1d": 0.04, // 4.0% for 1d timeframe
};

// Flag to track if real-time data has been initialized
let realTimeDataInitialized = false;

// Initialize WebSocket connection
let isInitialized = false;
let reconnectTimer: number | null = null;

// Helper function to generate current timestamp in the correct format
function getCurrentTimestamp(timeframe: string): string {
  // Ensure we're using the current time for all timestamp generation
  const now = new Date();
  console.log(
    `[API] Generating current timestamp for ${timeframe}: ${now.toISOString()}`,
  );
  // Format: "2023-07-21 14:32:05 (15m)" - ISO string with space instead of T, truncated to seconds
  // CRITICAL: This format MUST be consistent and parseable by new Date() in the SignalVerifierImproved component
  // The format is: "YYYY-MM-DD HH:MM:SS (timeframe)" with the timeframe in parentheses
  // WARNING: Do not change this format without updating the parsing logic in SignalVerifierImproved.tsx

  // Force the timestamp to be in UTC to avoid timezone issues
  const formattedTimestamp = `${now.toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`;

  // Verify the timestamp is valid by parsing it back
  const timestampPart = formattedTimestamp.split(" (")[0];
  const parsedDate = new Date(timestampPart);

  // Log warning if the timestamp doesn't parse back correctly
  if (isNaN(parsedDate.getTime())) {
    console.error(
      `[API] Generated timestamp ${formattedTimestamp} doesn't parse correctly!`,
    );
  }

  return formattedTimestamp;
}

function initializeWebSocket() {
  if (isInitialized) {
    console.log("[API] WebSocket already initialized, skipping initialization");
    return;
  }

  console.log("[API] Initializing Binance Futures WebSocket connection...");

  // Set to Futures mode and connect to Binance WebSocket
  binanceService.setFuturesMode(true); // Explicitly set to Futures mode
  console.log("[API] Setting Binance service to Futures mode");
  binanceService.connect();

  // Listen for trade events from Binance Futures
  binanceService.on("trade", (trade: BinanceTradeEvent, symbol: string) => {
    console.log(
      `[API] Received trade event from Binance Futures WebSocket for ${symbol}:`,
      {
        price: parseFloat(trade.p),
        quantity: parseFloat(trade.q),
        time: new Date(parseInt(trade.T)).toISOString(),
        isFutures: true,
      },
    );
    // Process each timeframe
    ["1m", "5m", "15m", "1h", "4h", "1d"].forEach((timeframe) => {
      try {
        // Set the analyzer symbol to ensure signals are generated for the correct symbol
        setAnalyzerSymbol(symbol);

        const signal = processTrade(trade, timeframe, symbol);
        if (signal) {
          console.log(
            `[API] Generated new signal for ${symbol} on timeframe: ${timeframe}`,
            signal,
          );

          // Convert to SignalData format
          const signalData = convertToSignalData(signal);
          const cacheKey = `${symbol}_${timeframe}`;
          const currentPrice = parseFloat(trade.p);

          // Check if we should update the cached signal
          const shouldUpdateSignal = shouldUpdateCachedSignal(
            cacheKey,
            signalData,
            currentPrice,
            timeframe,
          );

          if (shouldUpdateSignal) {
            console.log(
              `[API] Updating cached signal for ${symbol} on ${timeframe} due to significant change`,
            );
            // CRITICAL: Always update the timestamp to current time
            signalData.timestamp = getCurrentTimestamp(timeframe);
            console.log(
              `[API] Updated signal timestamp for ${symbol} on ${timeframe} to: ${signalData.timestamp}`,
            );

            signalCache[cacheKey] = {
              data: signalData,
              timestamp: Date.now(),
              priceAtGeneration: currentPrice,
            };
          } else {
            console.log(
              `[API] Skipping signal update for ${symbol} on ${timeframe} (debounced)`,
            );
          }
        }
      } catch (error) {
        console.error(
          `[API] Error processing trade for ${symbol} on ${timeframe}:`,
          error,
        );
      }
    });
  });

  // Listen for ticker data events
  binanceService.on("tickerData", (tickerData: any, symbol: string) => {
    console.log(
      `[API] Received ticker data from Binance Futures API for ${symbol}:`,
      tickerData,
    );
    // Process ticker data for each timeframe
    ["1m", "5m", "15m", "1h", "4h", "1d"].forEach((timeframe) => {
      // Create a basic signal from ticker data if we don't have one yet
      const cacheKey = `${symbol}_${timeframe}`;
      if (!signalCache[cacheKey]) {
        // Create a basic signal based on price movement
        const priceChange = parseFloat(tickerData.priceChangePercent);
        const signal: SignalType =
          priceChange > 1 ? "BUY" : priceChange < -1 ? "SELL" : "HOLD";
        const price = parseFloat(tickerData.lastPrice);

        // Log the actual price we're using
        console.log(
          `[API] Using actual price from Binance Futures for ${symbol}: ${price}`,
        );

        // Always use current time for timestamp
        const currentTimestamp = getCurrentTimestamp(timeframe);

        const signalData: SignalData = {
          signal: signal,
          entryPoint: price,
          stopLoss: signal === "BUY" ? price * 0.97 : price * 1.03,
          targetPrice: signal === "BUY" ? price * 1.05 : price * 0.95,
          confidence: Math.min(95, Math.max(65, Math.abs(priceChange) * 10)),
          reasoning: `Signal based on Futures price movement. 24h change: ${priceChange}%. Volume: ${tickerData.volume}. Current price: ${price.toFixed(2)}. Additional indicators being calculated.`,
          timestamp: currentTimestamp,
        };

        signalCache[cacheKey] = {
          data: signalData,
          timestamp: Date.now(),
          priceAtGeneration: price,
        };

        console.log(
          `[API] Created initial signal from Futures ticker data for ${symbol} on timeframe: ${timeframe}`,
          signalData,
        );
      }
    });

    realTimeDataInitialized = true;
  });

  // Handle connection events
  binanceService.on("connected", () => {
    console.log("[API] Connected to Binance Futures WebSocket");
    // Clear any reconnect timer when successfully connected
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  binanceService.on("disconnected", (reason) => {
    console.log(`[API] Disconnected from Binance WebSocket: ${reason}`);
    // Auto-reconnect if disconnected
    if (reconnectTimer === null) {
      console.log("[API] Scheduling reconnect in 3 seconds...");
      reconnectTimer = window.setTimeout(() => {
        console.log("[API] Attempting to reconnect to Binance WebSocket");
        binanceService.connect();
        reconnectTimer = null;
      }, 3000);
    }
  });

  binanceService.on("error", (error) => {
    console.error("[API] Binance WebSocket error:", error);
    // Try to reconnect on error if not already reconnecting
    if (reconnectTimer === null) {
      console.log("[API] Scheduling reconnect after error in 5 seconds...");
      reconnectTimer = window.setTimeout(() => {
        console.log("[API] Attempting to reconnect after error");
        binanceService.connect();
        reconnectTimer = null;
      }, 5000);
    }
  });

  isInitialized = true;
  console.log("[API] WebSocket initialization complete");
}

// Convert GeneratedSignal to SignalData format
function convertToSignalData(signal: GeneratedSignal): SignalData {
  // Add ML prediction info to reasoning if available
  let reasoning = signal.reasoning;
  if (signal.mlPrediction) {
    // Only add ML explanation if it's not already in the reasoning
    if (!reasoning.includes("ML model")) {
      reasoning += ` ${signal.mlPrediction.explanation}`;
    }
  }

  return {
    signal: signal.signal,
    entryPoint: signal.entryPoint,
    stopLoss: signal.stopLoss,
    targetPrice: signal.targetPrice,
    confidence: signal.confidence,
    reasoning: reasoning,
    timestamp: signal.timestamp,
  };
}

// Fetch signal data based on timeframe and symbol
export async function getSignal(
  timeframe: string = "15m",
  symbol: string = "ETHUSDT",
  forceRefresh: boolean = false,
): Promise<SignalData> {
  console.log(
    `[API] getSignal called with timeframe: ${timeframe}, symbol: ${symbol}, forceRefresh: ${forceRefresh}`,
  );

  // Initialize WebSocket if not already done
  if (!isInitialized) {
    initializeWebSocket();
  }

  // Normalize symbol to lowercase for consistency
  const normalizedSymbol = symbol.toLowerCase();

  // Create a cache key combining symbol and timeframe
  const cacheKey = `${normalizedSymbol}_${timeframe}`;

  // If forceRefresh is true, clear the cache for this symbol/timeframe
  if (forceRefresh && signalCache[cacheKey]) {
    console.log(`[API] Force refreshing signal for ${cacheKey}`);
    delete signalCache[cacheKey];
  }

  try {
    // Force reconnect if not connected
    if (!binanceService["isConnected"]) {
      console.log(`[API] WebSocket not connected, attempting to connect...`);
      binanceService.connect();
    }

    console.log(
      `[API] Setting symbol in binance service to: ${normalizedSymbol}`,
    );
    binanceService.setSymbol(normalizedSymbol);

    // Also set the analyzer symbol to ensure signals are generated for the correct symbol
    setAnalyzerSymbol(normalizedSymbol);

    // If we have a cached signal for this timeframe and symbol, check if it's still valid
    if (signalCache[cacheKey]) {
      const cachedSignal = signalCache[cacheKey];
      const now = Date.now();
      const timeSinceLastUpdate = now - cachedSignal.timestamp;

      // Define max age based on timeframe (shorter timeframes need fresher data)
      // Significantly reduced cache times to ensure fresher signals
      const maxAgeInMs =
        {
          "1m": 10 * 1000, // 10 seconds
          "5m": 20 * 1000, // 20 seconds
          "15m": 30 * 1000, // 30 seconds
          "1h": 60 * 1000, // 1 minute
          "4h": 2 * 60 * 1000, // 2 minutes
          "1d": 5 * 60 * 1000, // 5 minutes
        }[timeframe] || 30 * 1000; // Default to 30 seconds

      // Only use cache if it's fresh enough
      if (timeSinceLastUpdate < maxAgeInMs) {
        console.log(
          `[API] Returning cached signal for timeframe: ${timeframe} and symbol: ${normalizedSymbol} (age: ${Math.round(timeSinceLastUpdate / 1000)}s)`,
          cachedSignal.data,
        );

        // IMPORTANT: Always update the timestamp to current time to ensure freshness
        // This ensures the displayed timestamp is always current
        const updatedSignalData = { ...cachedSignal.data };
        updatedSignalData.timestamp = getCurrentTimestamp(timeframe);
        console.log(
          `[API] Updated cached signal timestamp for ${normalizedSymbol} on ${timeframe} to: ${updatedSignalData.timestamp}`,
        );

        return updatedSignalData;
      } else {
        console.log(
          `[API] Cached signal for ${cacheKey} is too old (${Math.round(timeSinceLastUpdate / 1000)}s), fetching fresh data`,
        );
        delete signalCache[cacheKey]; // Remove stale cache entry
      }
    }

    // If we're connected but don't have a signal yet, wait for real data
    if (binanceService["isConnected"]) {
      console.log(
        `[API] WebSocket connected but no signal yet for timeframe: ${timeframe} and symbol: ${normalizedSymbol}, waiting for real data...`,
      );

      // Fetch kline data to generate a signal based on real data
      await binanceService.fetchKlineData(normalizedSymbol, timeframe, 100);

      // Wait a bit longer for the kline data to be processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check again after waiting
      if (signalCache[cacheKey]) {
        console.log(
          `[API] Signal received after fetching klines for timeframe: ${timeframe} and symbol: ${normalizedSymbol}`,
          signalCache[cacheKey].data,
        );
        return signalCache[cacheKey].data;
      }

      // If still no signal, try to manually process the latest trades
      const trades = binanceService.getTradesForSymbol(normalizedSymbol);
      if (trades && trades.length > 0) {
        console.log(
          `[API] Processing ${trades.length} existing trades to generate signal`,
        );
        // Process the most recent trade to generate a signal
        const signal = processTrade(trades[0], timeframe, normalizedSymbol);
        if (signal) {
          const signalData = convertToSignalData(signal);
          const currentPrice = parseFloat(trades[0].p);

          // CRITICAL: Always update the timestamp to current time
          signalData.timestamp = getCurrentTimestamp(timeframe);
          console.log(
            `[API] Updated signal timestamp for ${normalizedSymbol} on ${timeframe} to: ${signalData.timestamp}`,
          );

          signalCache[cacheKey] = {
            data: signalData,
            timestamp: Date.now(),
            priceAtGeneration: currentPrice,
          };

          console.log(
            `[API] Generated signal from existing trades:`,
            signalCache[cacheKey].data,
          );
          return signalCache[cacheKey].data;
        }
      }
    }

    // If we still don't have a signal, fetch fresh data and create a fallback signal
    console.log(
      `[API] No signal available yet for timeframe: ${timeframe} and symbol: ${normalizedSymbol}, fetching fresh data...`,
    );

    // Fetch both ticker and kline data to ensure we have enough data for signal generation
    try {
      // Fetch ticker data first
      await binanceService.fetchTickerData(normalizedSymbol);

      // Then fetch kline data
      await binanceService.fetchKlineData(normalizedSymbol, timeframe, 100);

      // Wait a bit for data processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if we have a signal now
      if (signalCache[cacheKey]) {
        console.log(
          `[API] Signal generated after fetching fresh data for ${normalizedSymbol}`,
        );
        return signalCache[cacheKey].data;
      }
    } catch (error) {
      console.error(
        `[API] Error fetching fresh data for ${normalizedSymbol}:`,
        error,
      );
    }

    // Check one more time after getting real data
    if (signalCache[cacheKey]) {
      return signalCache[cacheKey].data;
    }

    // If we still don't have a signal, create a fallback signal with real price data
    // Always use current time for timestamp
    const currentTimestamp = getCurrentTimestamp(timeframe);

    // Get current price from binance service
    let currentPrice = 0;
    try {
      currentPrice = binanceService.getCurrentPrice
        ? binanceService.getCurrentPrice(normalizedSymbol)
        : 0;
    } catch (e) {
      console.error("Error getting current price:", e);
    }

    // If we couldn't get a real price, use default values based on the symbol
    if (currentPrice <= 0) {
      currentPrice = normalizedSymbol.includes("btc")
        ? 29500.0
        : normalizedSymbol.includes("eth")
          ? 1618.0
          : 100.0;
    }

    // Create a fallback signal with the current price
    const fallbackSignal: SignalData = {
      signal: "HOLD",
      entryPoint: currentPrice,
      stopLoss: currentPrice * 0.95,
      targetPrice: currentPrice * 1.05,
      confidence: 50, // Use 50% confidence instead of 0 to avoid showing the waiting message
      reasoning: `Using fallback signal for ${symbol} on ${timeframe} timeframe. Current price: ${currentPrice.toFixed(2)}. This signal is based on limited data and should be used with caution.`,
      timestamp: currentTimestamp,
    };

    // Cache this fallback signal to avoid repeated fallbacks
    signalCache[cacheKey] = {
      data: fallbackSignal,
      timestamp: Date.now(),
      priceAtGeneration: currentPrice,
    };

    console.log(
      `[API] Created fallback signal for ${normalizedSymbol} on ${timeframe}:`,
      fallbackSignal,
    );
    return fallbackSignal;
  } catch (error) {
    console.error("Failed to fetch signal data:", error);

    // If we have any cached signal, return the most recent one
    if (Object.keys(signalCache).length > 0) {
      const fallbackTimeframe = Object.keys(signalCache)[0];
      console.log(
        `[API] Error fetching signal, returning fallback from timeframe: ${fallbackTimeframe}`,
        signalCache[fallbackTimeframe].data,
      );
      return signalCache[fallbackTimeframe].data;
    }

    // Create a default error signal with realistic values
    console.log(`[API] No fallback signal available, creating error signal`);
    const mockPrice = normalizedSymbol.includes("btc")
      ? 29500.0
      : normalizedSymbol.includes("eth")
        ? 1618.0
        : 100.0;

    // Always use current time for timestamp
    const currentTimestamp = getCurrentTimestamp(timeframe);

    const errorSignal: SignalData = {
      signal: "HOLD",
      entryPoint: mockPrice,
      stopLoss: mockPrice * 0.95,
      targetPrice: mockPrice * 1.05,
      confidence: 0, // Set to 0 to indicate this is an error signal
      reasoning:
        "Unable to connect to data source. Using fallback signal based on recent market conditions.",
      timestamp: currentTimestamp,
    };

    return errorSignal;
  }
}

// Track in-progress refreshes to prevent duplicate requests
const refreshInProgress: Record<string, boolean> = {};

// Function to manually refresh the signal with updated timestamp
export async function refreshSignal(
  timeframe: string = "15m",
  symbol: string = "ETHUSDT",
): Promise<SignalData> {
  console.log(
    `[API] refreshSignal called with timeframe: ${timeframe}, symbol: ${symbol}`,
  );

  // Normalize symbol to lowercase for consistency
  const normalizedSymbol = symbol.toLowerCase();
  const cacheKey = `${normalizedSymbol}_${timeframe}`;

  // Check if a refresh is already in progress for this symbol/timeframe
  if (refreshInProgress[cacheKey]) {
    console.log(
      `[API] Refresh already in progress for ${cacheKey}, returning existing data`,
    );
    // Return existing data if available, otherwise wait for the refresh to complete
    if (signalCache[cacheKey]) {
      return signalCache[cacheKey].data;
    }

    // Wait for the existing refresh to complete (max 3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    if (signalCache[cacheKey]) {
      return signalCache[cacheKey].data;
    }
  }

  // Mark this refresh as in progress
  refreshInProgress[cacheKey] = true;

  console.log(
    `[API] Manually refreshing signal for timeframe: ${timeframe} and symbol: ${symbol}`,
  );

  // Force clear all cached signals for this symbol and timeframe
  // Clear all timeframes for this symbol to ensure complete refresh
  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
  timeframes.forEach((tf) => {
    const tfCacheKey = `${normalizedSymbol}_${tf}`;
    if (signalCache[tfCacheKey]) {
      console.log(
        `[API] Clearing cached signal for ${tfCacheKey} to ensure fresh data across all timeframes`,
      );
      delete signalCache[tfCacheKey]; // Completely remove from cache
    }
  });

  // Also clear analyzer data to ensure fresh signal generation
  clearAnalyzerData(normalizedSymbol);
  console.log(
    `[API] Cleared analyzer data for ${normalizedSymbol} to ensure fresh signal generation`,
  );

  // Ensure WebSocket is initialized
  if (!isInitialized) {
    console.log(`[API] WebSocket not initialized, initializing now`);
    initializeWebSocket();
  }

  /**
   * Determines whether a cached signal should be updated based on debounce time and price change
   * @param cacheKey The cache key (symbol_timeframe)
   * @param newSignal The newly generated signal
   * @param currentPrice The current price
   * @param timeframe The timeframe (1m, 5m, 15m, 1h, 4h, 1d)
   * @returns boolean indicating whether the signal should be updated
   */
  function shouldUpdateCachedSignal(
    cacheKey: string,
    newSignal: SignalData,
    currentPrice: number,
    timeframe: string,
  ): boolean {
    // If no cached signal exists, always update
    if (!signalCache[cacheKey]) {
      return true;
    }

    const cachedSignal = signalCache[cacheKey];
    const now = Date.now();
    const timeSinceLastUpdate = now - cachedSignal.timestamp;

    // Get the debounce time for this timeframe (default to 30 seconds if not specified)
    const debounceTime = SIGNAL_DEBOUNCE_TIME[timeframe] || 30000;

    // Get the price change threshold for this timeframe (default to 0.5% if not specified)
    const priceChangeThreshold = PRICE_CHANGE_THRESHOLD[timeframe] || 0.005;

    // Calculate price change percentage
    const priceChangePercent =
      Math.abs(currentPrice - cachedSignal.priceAtGeneration) /
      cachedSignal.priceAtGeneration;

    // Check if signal type has changed (BUY/SELL/HOLD)
    const signalTypeChanged = newSignal.signal !== cachedSignal.data.signal;

    // Always update if the signal type has changed and we're past half the debounce time
    // This prevents rapid oscillation while still allowing legitimate signal changes
    if (signalTypeChanged && timeSinceLastUpdate > debounceTime / 2) {
      console.log(
        `[API] Signal type changed from ${cachedSignal.data.signal} to ${newSignal.signal} after ${timeSinceLastUpdate}ms`,
      );
      return true;
    }

    // Update if we've exceeded the debounce time
    if (timeSinceLastUpdate > debounceTime) {
      console.log(
        `[API] Debounce time exceeded: ${timeSinceLastUpdate}ms > ${debounceTime}ms`,
      );
      return true;
    }

    // Update if price has changed significantly regardless of time
    if (priceChangePercent > priceChangeThreshold) {
      console.log(
        `[API] Significant price change detected: ${(priceChangePercent * 100).toFixed(2)}% > ${(priceChangeThreshold * 100).toFixed(2)}%`,
      );
      return true;
    }

    // Don't update if we're within debounce time and price hasn't changed significantly
    return false;
  }

  // Log the current cache state for debugging
  console.log(
    `[API] Current cache state before refresh:`,
    Object.keys(signalCache).map((key) => ({
      key,
      signal: signalCache[key]?.data.signal,
    })),
  );

  try {
    // When manually refreshing, we'll force a refresh regardless of debounce time
    console.log(
      `[API] Forcing refresh for ${cacheKey} to generate fresh signal`,
    );
    // We don't delete the cache entry completely, but we'll mark it for refresh by setting timestamp to 0
    if (signalCache[cacheKey]) {
      signalCache[cacheKey].timestamp = 0;
    }

    // Make sure we're connected
    if (!binanceService["isConnected"]) {
      console.log(`[API] WebSocket not connected, attempting to connect...`);
      binanceService.connect();

      // Give it a moment to establish connection
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Set the symbol to ensure we get data for it
    console.log(
      `[API] Setting symbol in binance service to: ${normalizedSymbol}`,
    );
    binanceService.setSymbol(normalizedSymbol);

    // Also set the analyzer symbol to ensure signals are generated for the correct symbol
    setAnalyzerSymbol(normalizedSymbol);

    // Clear any existing analyzer data to ensure fresh signal generation
    clearAnalyzerData(normalizedSymbol);
    console.log(
      `[API] Cleared analyzer data for ${normalizedSymbol} to ensure fresh signal`,
    );

    // Fetch fresh kline data to generate signals based on real candles
    console.log(
      `[API] Fetching fresh kline data for ${normalizedSymbol} on ${timeframe}`,
    );
    await binanceService.fetchKlineData(normalizedSymbol, timeframe, 100);

    // Wait for kline data to be processed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Process kline data to generate signals
    const klineHandler = (klineEvent: any, klineSymbol: string) => {
      if (klineSymbol === normalizedSymbol) {
        console.log(
          `[API] Processing kline data for signal generation:`,
          klineEvent.k,
        );
        // Convert kline to trade format for processing
        const tradeFromKline = {
          e: "trade",
          E: Date.now(),
          s: klineEvent.s,
          t: klineEvent.k.t,
          p: klineEvent.k.c, // Use close price
          q: klineEvent.k.v, // Use volume
          b: 0,
          a: 0,
          T: klineEvent.k.T,
          m: false,
          M: false,
        };

        // Process the kline as a trade to generate a signal
        const signal = processTrade(
          tradeFromKline,
          timeframe,
          normalizedSymbol,
        );
        if (signal) {
          const signalData = convertToSignalData(signal);
          const currentPrice = parseFloat(tradeFromKline.p);

          // CRITICAL: Always update the timestamp to current time when refreshing
          signalData.timestamp = getCurrentTimestamp(timeframe);
          console.log(
            `[API] Updated signal timestamp for ${symbol} on ${timeframe} to: ${signalData.timestamp}`,
          );

          signalCache[cacheKey] = {
            data: signalData,
            timestamp: Date.now(),
            priceAtGeneration: currentPrice,
          };

          console.log(
            `[API] Generated signal from kline data:`,
            signalCache[cacheKey].data,
          );
        }
      }
    };

    // Register the handler temporarily
    binanceService.on("kline", klineHandler);

    // Also fetch ticker data as a backup
    try {
      await new Promise<void>((resolve) => {
        const tickerHandler = (data: any, tickerSymbol: string) => {
          if (tickerSymbol === normalizedSymbol) {
            console.log(
              `[API] Received fresh ticker data for ${normalizedSymbol}`,
              data,
            );
            binanceService.off("tickerData", tickerHandler);
            resolve();
          }
        };

        binanceService.on("tickerData", tickerHandler);
        binanceService.fetchTickerData(normalizedSymbol);

        // Set a timeout in case we don't get a response
        setTimeout(() => {
          binanceService.off("tickerData", tickerHandler);
          resolve();
        }, 2000);
      });
    } catch (fetchError) {
      console.error(`[API] Error during ticker data fetch: ${fetchError}`);
    }

    // Wait for signal processing
    console.log(`[API] Waiting for signal processing...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Remove the kline handler
    binanceService.off("kline", klineHandler);

    // Get the fresh signal
    console.log(`[API] Fetching fresh signal after refresh`);
    const result = await getSignal(timeframe, symbol);
    console.log(`[API] Refresh complete, returning signal:`, result.signal);
    return result;
  } catch (error) {
    console.error(`[API] Error refreshing signal: ${error}`);
    console.log(`[API] Falling back to regular getSignal`);
    return getSignal(timeframe, symbol);
  } finally {
    // Clear the in-progress flag
    refreshInProgress[cacheKey] = false;
  }
}

// Function to change the symbol
export function changeSymbol(symbol: string): void {
  // Extract the actual symbol from TradingView format (e.g., "BINANCE:ETHUSDT" -> "ETHUSDT")
  const actualSymbol = symbol.includes(":") ? symbol.split(":")[1] : symbol;

  console.log(`[API] Changing symbol to: ${actualSymbol}`);

  // Clear analyzer data when changing symbols to prevent signal contamination
  clearAnalyzerData();

  // Set the analyzer symbol to ensure signals are generated for the correct symbol
  setAnalyzerSymbol(actualSymbol.toLowerCase());

  // Clear the specific symbol's cache entries to force fresh data
  const normalizedSymbol = actualSymbol.toLowerCase();
  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

  // Reset cache entries for this symbol to force refresh on next request
  timeframes.forEach((tf) => {
    const tfCacheKey = `${normalizedSymbol}_${tf}`;
    if (signalCache[tfCacheKey]) {
      console.log(
        `[API] Resetting cache timestamp for ${tfCacheKey} to force refresh`,
      );
      signalCache[tfCacheKey].timestamp = 0;
    }
  });

  // Update the symbol in the binance service
  binanceService.setSymbol(actualSymbol);
  console.log(`[API] Updated binance service with symbol: ${actualSymbol}`);

  // Force a ticker data fetch for the new symbol
  if (binanceService["fetchTickerData"]) {
    console.log(`[API] Forcing ticker data fetch for: ${actualSymbol}`);
    binanceService["fetchTickerData"](actualSymbol.toLowerCase());
  }
}

// Function to get available symbols
export function getAvailableSymbols(): string[] {
  return [
    "ETHUSDT",
    "BTCUSDT",
    "SOLUSDT",
    "BNBUSDT",
    "ADAUSDT",
    "DOGEUSDT",
    "XRPUSDT",
    "DOTUSDT",
    "LINKUSDT",
    "MATICUSDT",
    "AVAXUSDT",
  ];
}
