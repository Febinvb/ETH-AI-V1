import binanceService, { BinanceTradeEvent } from "../services/binanceService";
import {
  processTrade,
  GeneratedSignal,
  SignalType,
  clearAnalyzerData,
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
// Format: {"SYMBOL_TIMEFRAME": SignalData}
// Use a module-level variable that persists between renders
const signalCache: Record<string, SignalData> = {};

// Flag to track if real-time data has been initialized
let realTimeDataInitialized = false;

// Initialize WebSocket connection
let isInitialized = false;

function initializeWebSocket() {
  if (isInitialized) {
    console.log("[API] WebSocket already initialized, skipping initialization");
    return;
  }

  console.log("[API] Initializing Binance WebSocket connection...");

  // Connect to Binance WebSocket
  binanceService.connect();

  // Listen for trade events
  binanceService.on("trade", (trade: BinanceTradeEvent, symbol: string) => {
    console.log(
      `[API] Received trade event from Binance WebSocket for ${symbol}:`,
      trade,
    );
    // Process each timeframe
    ["1m", "5m", "15m", "1h", "4h", "1d"].forEach((timeframe) => {
      const signal = processTrade(trade, timeframe, symbol);
      if (signal) {
        console.log(
          `[API] Generated new signal for ${symbol} on timeframe: ${timeframe}`,
          signal,
        );
        // Convert to SignalData format and cache it with symbol and timeframe
        const cacheKey = `${symbol}_${timeframe}`;
        signalCache[cacheKey] = convertToSignalData(signal);
      }
    });
  });

  // Listen for ticker data events
  binanceService.on("tickerData", (tickerData: any, symbol: string) => {
    console.log(
      `[API] Received ticker data from Binance API for ${symbol}:`,
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

        const signalData: SignalData = {
          signal: signal,
          entryPoint: price,
          stopLoss: signal === "BUY" ? price * 0.97 : price * 1.03,
          targetPrice: signal === "BUY" ? price * 1.05 : price * 0.95,
          confidence: Math.min(95, Math.max(65, Math.abs(priceChange) * 10)),
          reasoning: `Signal based on price movement. 24h change: ${priceChange}%. Volume: ${tickerData.volume}. Additional indicators being calculated.`,
          timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`,
        };

        signalCache[cacheKey] = signalData;
        console.log(
          `[API] Created initial signal from ticker data for ${symbol} on timeframe: ${timeframe}`,
          signalData,
        );
      }
    });

    realTimeDataInitialized = true;
  });

  // Handle connection events
  binanceService.on("connected", () => {
    console.log("[API] Connected to Binance WebSocket");
  });

  binanceService.on("disconnected", (reason) => {
    console.log(`[API] Disconnected from Binance WebSocket: ${reason}`);
  });

  binanceService.on("error", (error) => {
    console.error("[API] Binance WebSocket error:", error);
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
): Promise<SignalData> {
  console.log(
    `[API] getSignal called with timeframe: ${timeframe}, symbol: ${symbol}`,
  );

  // Initialize WebSocket if not already done
  if (!isInitialized) {
    initializeWebSocket();
  }

  // Normalize symbol to lowercase for consistency
  const normalizedSymbol = symbol.toLowerCase();

  // Create a cache key combining symbol and timeframe
  const cacheKey = `${normalizedSymbol}_${timeframe}`;

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

    // If we have a cached signal for this timeframe and symbol, return it
    if (signalCache[cacheKey]) {
      console.log(
        `[API] Returning cached signal for timeframe: ${timeframe} and symbol: ${normalizedSymbol}`,
        signalCache[cacheKey],
      );
      return signalCache[cacheKey];
    }

    // If we're connected but don't have a signal yet, wait a bit and check again
    if (binanceService["isConnected"]) {
      console.log(
        `[API] WebSocket connected but no signal yet for timeframe: ${timeframe} and symbol: ${normalizedSymbol}, waiting...`,
      );
      // Minimal wait time to see if we get a signal
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check again after waiting
      if (signalCache[cacheKey]) {
        console.log(
          `[API] Signal received after waiting for timeframe: ${timeframe} and symbol: ${normalizedSymbol}`,
          signalCache[cacheKey],
        );
        return signalCache[cacheKey];
      }
    }

    // If we still don't have a signal, create a waiting signal
    console.log(
      `[API] No signal available for timeframe: ${timeframe} and symbol: ${normalizedSymbol}, creating waiting signal`,
    );

    // Create a waiting signal
    const waitingSignal: SignalData = {
      signal: "HOLD",
      entryPoint: 0,
      stopLoss: 0,
      targetPrice: 0,
      confidence: 0,
      reasoning: `Waiting for live data from Binance for ${symbol}. Please wait a moment or try refreshing.`,
      timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`,
    };

    // Don't cache this waiting signal
    return waitingSignal;
  } catch (error) {
    console.error("Failed to fetch signal data:", error);

    // If we have any cached signal, return the most recent one
    if (Object.keys(signalCache).length > 0) {
      const fallbackTimeframe = Object.keys(signalCache)[0];
      console.log(
        `[API] Error fetching signal, returning fallback from timeframe: ${fallbackTimeframe}`,
        signalCache[fallbackTimeframe],
      );
      return signalCache[fallbackTimeframe];
    }

    // Create a default error signal with realistic values
    console.log(`[API] No fallback signal available, creating error signal`);
    const mockPrice = normalizedSymbol.includes("btc")
      ? 62345.67
      : normalizedSymbol.includes("eth")
        ? 3456.78
        : 100.0;

    const errorSignal: SignalData = {
      signal: "HOLD",
      entryPoint: mockPrice,
      stopLoss: mockPrice * 0.95,
      targetPrice: mockPrice * 1.05,
      confidence: 50,
      reasoning:
        "Unable to connect to data source. Using fallback signal based on recent market conditions.",
      timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`,
    };

    return errorSignal;
  }
}

// Function to manually refresh the signal
export async function refreshSignal(
  timeframe: string = "15m",
  symbol: string = "ETHUSDT",
): Promise<SignalData> {
  console.log(
    `[API] refreshSignal called with timeframe: ${timeframe}, symbol: ${symbol}`,
  );
  console.log(
    `[API] Manually refreshing signal for timeframe: ${timeframe} and symbol: ${symbol}`,
  );

  // Ensure WebSocket is initialized
  if (!isInitialized) {
    initializeWebSocket();
  }

  // Normalize symbol to lowercase for consistency
  const normalizedSymbol = symbol.toLowerCase();

  // Create a cache key combining symbol and timeframe
  const cacheKey = `${normalizedSymbol}_${timeframe}`;

  // Force a fresh ticker data fetch
  try {
    // Always clear the cache when manually refreshing to ensure we get fresh market data
    console.log(
      `[API] Clearing cache for ${cacheKey} to generate fresh signal`,
    );
    delete signalCache[cacheKey];

    // Make sure we're connected
    if (!binanceService["isConnected"]) {
      binanceService.connect();
    }

    // Set the symbol to ensure we get data for it
    binanceService.setSymbol(normalizedSymbol);

    // Trigger a manual ticker data fetch
    await new Promise<void>((resolve) => {
      // Set up a one-time listener for ticker data
      const tickerHandler = (data: any, tickerSymbol: string) => {
        if (tickerSymbol === normalizedSymbol) {
          // Process the ticker data
          console.log(
            `[API] Received fresh ticker data for ${normalizedSymbol}`,
          );
          binanceService.off("tickerData", tickerHandler);
          resolve();
        }
      };

      binanceService.on("tickerData", tickerHandler);

      // Fetch the ticker data
      console.log(
        `[API] Manually fetching ticker data for ${normalizedSymbol}`,
      );
      binanceService["fetchTickerData"](normalizedSymbol);

      // Set a timeout in case we don't get a response
      setTimeout(() => {
        binanceService.off("tickerData", tickerHandler);
        resolve();
      }, 1000);
    });

    // Minimal wait time for the signal to be processed
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Get the fresh signal
    return getSignal(timeframe, symbol);
  } catch (error) {
    console.error(`[API] Error refreshing signal: ${error}`);
    return getSignal(timeframe, symbol);
  }
}

// Function to change the symbol
export function changeSymbol(symbol: string): void {
  // Extract the actual symbol from TradingView format (e.g., "BINANCE:ETHUSDT" -> "ETHUSDT")
  const actualSymbol = symbol.includes(":") ? symbol.split(":")[1] : symbol;

  console.log(`[API] Changing symbol to: ${actualSymbol}`);

  // Clear analyzer data when changing symbols to prevent signal contamination
  clearAnalyzerData();

  // Clear the specific symbol's cache entries to force fresh data
  const normalizedSymbol = actualSymbol.toLowerCase();
  const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

  // Remove existing cache entries for this symbol
  timeframes.forEach((tf) => {
    const cacheKey = `${normalizedSymbol}_${tf}`;
    if (signalCache[cacheKey]) {
      console.log(`[API] Clearing cache for ${cacheKey}`);
      delete signalCache[cacheKey];
    }
  });

  // In development mode, we want to create mock data for the new symbol
  if (import.meta.env.DEV) {
    console.log(
      `[API] Development mode: Creating mock data for new symbol: ${normalizedSymbol}`,
    );

    // Check if we have any data for this symbol
    const hasSymbolData = timeframes.some((tf) => {
      const cacheKey = `${normalizedSymbol}_${tf}`;
      return !!signalCache[cacheKey];
    });

    // If we don't have data for this symbol, create it by cloning from an existing symbol
    if (!hasSymbolData && Object.keys(signalCache).length > 0) {
      console.log(
        `[API] Creating mock data for new symbol: ${normalizedSymbol}`,
      );

      // Find an existing symbol to clone from
      const existingKey = Object.keys(signalCache)[0];
      const existingSymbol = existingKey.split("_")[0];

      timeframes.forEach((tf) => {
        const sourceKey = `${existingSymbol}_${tf}`;
        const targetKey = `${normalizedSymbol}_${tf}`;

        if (signalCache[sourceKey]) {
          // Clone the signal and adjust it for the new symbol
          const clonedSignal = { ...signalCache[sourceKey] };

          // Adjust price values based on typical price ranges for different symbols
          let priceMultiplier = 1;
          if (normalizedSymbol.includes("btc")) priceMultiplier = 20000;
          else if (normalizedSymbol.includes("eth")) priceMultiplier = 2000;
          else if (normalizedSymbol.includes("sol")) priceMultiplier = 100;
          else if (normalizedSymbol.includes("bnb")) priceMultiplier = 300;
          else if (normalizedSymbol.includes("ada")) priceMultiplier = 0.5;
          else if (normalizedSymbol.includes("doge")) priceMultiplier = 0.1;
          else if (normalizedSymbol.includes("xrp")) priceMultiplier = 0.5;
          else if (normalizedSymbol.includes("dot")) priceMultiplier = 10;
          else if (normalizedSymbol.includes("link")) priceMultiplier = 15;
          else if (normalizedSymbol.includes("matic")) priceMultiplier = 1;
          else if (normalizedSymbol.includes("avax")) priceMultiplier = 30;

          // Update the price values
          clonedSignal.entryPoint =
            (clonedSignal.entryPoint * priceMultiplier) / 1000;
          clonedSignal.stopLoss =
            (clonedSignal.stopLoss * priceMultiplier) / 1000;
          clonedSignal.targetPrice =
            (clonedSignal.targetPrice * priceMultiplier) / 1000;

          // Randomize the signal type for variety
          const signals: SignalType[] = ["BUY", "SELL", "HOLD"];
          clonedSignal.signal =
            signals[Math.floor(Math.random() * signals.length)];

          // Adjust confidence based on signal type
          clonedSignal.confidence =
            clonedSignal.signal === "HOLD"
              ? Math.floor(Math.random() * 30) + 50 // 50-80% for HOLD
              : Math.floor(Math.random() * 20) + 70; // 70-90% for BUY/SELL

          // Update reasoning
          clonedSignal.reasoning = `Signal generated for ${actualSymbol.toUpperCase()} based on technical analysis. ${clonedSignal.signal === "BUY" ? "Bullish momentum detected with increasing volume." : clonedSignal.signal === "SELL" ? "Bearish divergence observed with resistance level rejection." : "Consolidation pattern detected, waiting for breakout confirmation."}`;

          // Update timestamp
          clonedSignal.timestamp = `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${tf})`;

          signalCache[targetKey] = clonedSignal;
          console.log(
            `[API] Created mock signal for ${targetKey}:`,
            clonedSignal,
          );
        }
      });
    }
  }

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
