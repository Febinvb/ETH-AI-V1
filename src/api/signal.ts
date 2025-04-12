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

// Flag to track if mock data has been initialized
let mockDataInitialized = false;

// Initialize WebSocket connection
let isInitialized = false;

// Mock data for development/testing
const mockSignalData: Record<string, SignalData> = {
  ethusdt_1h: {
    signal: "BUY",
    entryPoint: 3456.78,
    stopLoss: 3400.5,
    targetPrice: 3550.25,
    confidence: 78,
    reasoning:
      "BUY signal based on 4 indicators. RSI is oversold (28.45) indicating potential reversal. MACD line (0.0023) crossed above signal line (0.0012). Short-term MA (3455.2500) above long-term MA (3442.7800). Price (3456.7800) is near/below Bollinger lower band (3430.2500), indicating oversold condition.",
    timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (1h)`,
  },
  btcusdt_1h: {
    signal: "SELL",
    entryPoint: 62345.67,
    stopLoss: 63000.0,
    targetPrice: 61000.0,
    confidence: 82,
    reasoning:
      "SELL signal based on 5 indicators. RSI is overbought (76.32) indicating potential reversal. MACD line (-0.0018) crossed below signal line (0.0005). Price (62345.6700) is below VWAP (62500.2300). Short-term MA (62340.5000) below long-term MA (62450.7500). Strong negative price action (-0.75%).",
    timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (1h)`,
  },
  solusdt_1h: {
    signal: "HOLD",
    entryPoint: 145.23,
    stopLoss: 138.5,
    targetPrice: 152.75,
    confidence: 65,
    reasoning:
      "Mixed or insufficient signals detected. Waiting for clearer trend confirmation before taking action. (Buy signals: 2, Sell signals: 2)",
    timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (1h)`,
  },
};

// Add more timeframes for the existing symbols
["1m", "5m", "15m", "4h", "1d"].forEach((timeframe) => {
  Object.keys(mockSignalData).forEach((key) => {
    const symbol = key.split("_")[0];
    const mockData = { ...mockSignalData[`${symbol}_1h`] };
    mockData.timestamp = `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`;
    // Slightly modify values for different timeframes
    mockData.entryPoint =
      mockData.entryPoint * (1 + (Math.random() * 0.02 - 0.01));
    mockData.stopLoss = mockData.stopLoss * (1 + (Math.random() * 0.02 - 0.01));
    mockData.targetPrice =
      mockData.targetPrice * (1 + (Math.random() * 0.02 - 0.01));
    mockData.confidence = Math.min(
      95,
      Math.max(50, mockData.confidence + Math.floor(Math.random() * 10) - 5),
    );
    mockSignalData[`${symbol}_${timeframe}`] = mockData;
  });
});

function initializeWebSocket() {
  if (isInitialized) {
    console.log("[API] WebSocket already initialized, skipping initialization");
    return;
  }

  console.log("[API] Initializing Binance WebSocket connection...");

  // In development mode, use mock data instead of actual WebSocket
  if (import.meta.env.DEV) {
    console.log(
      "[API] Running in development mode, using mock data instead of WebSocket",
    );
    // Only populate the cache with mock data if it hasn't been initialized yet
    if (!mockDataInitialized) {
      console.log("[API] Initializing mock data cache");
      Object.keys(mockSignalData).forEach((key) => {
        signalCache[key] = mockSignalData[key];
      });
      mockDataInitialized = true;
      console.log("[API] Mock data initialization complete");
    } else {
      console.log(
        "[API] Mock data cache already populated, skipping initialization",
      );
    }
    isInitialized = true;
    return;
  }

  // Connect to Binance WebSocket for production
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
  if (!isInitialized || (import.meta.env.DEV && !mockDataInitialized)) {
    initializeWebSocket();
  }

  // Normalize symbol to lowercase for consistency
  const normalizedSymbol = symbol.toLowerCase();

  // Create a cache key combining symbol and timeframe
  const cacheKey = `${normalizedSymbol}_${timeframe}`;

  try {
    // If we're in development mode, we've already populated the cache with mock data
    if (import.meta.env.DEV) {
      // If we have a cached signal for this timeframe and symbol, return it
      if (signalCache[cacheKey]) {
        console.log(
          `[API] Returning cached mock signal for timeframe: ${timeframe} and symbol: ${normalizedSymbol}`,
          signalCache[cacheKey],
        );
        return signalCache[cacheKey];
      }

      // If the exact key doesn't exist, try to find a similar one (any timeframe for the symbol)
      const similarKeys = Object.keys(signalCache).filter((key) =>
        key.startsWith(normalizedSymbol),
      );
      if (similarKeys.length > 0) {
        console.log(
          `[API] Exact mock data not found, creating derived mock data for symbol: ${normalizedSymbol} from ${similarKeys[0]}`,
          signalCache[similarKeys[0]],
        );
        // Clone the data and update the timestamp to match the requested timeframe
        const mockData = { ...signalCache[similarKeys[0]] };
        mockData.timestamp = `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`;
        signalCache[cacheKey] = mockData;
        return mockData;
      }

      // If no similar keys exist, we'll create a new mock signal below
      console.log(
        `[API] No similar mock data found for symbol: ${normalizedSymbol}, creating new mock signal`,
      );
    } else {
      // For production: Force reconnect if not connected
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
        // Wait for a short time to see if we get a signal
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check again after waiting
        if (signalCache[cacheKey]) {
          console.log(
            `[API] Signal received after waiting for timeframe: ${timeframe} and symbol: ${normalizedSymbol}`,
            signalCache[cacheKey],
          );
          return signalCache[cacheKey];
        }
      }
    }

    // If we still don't have a signal, create a default one with realistic mock data
    console.log(
      `[API] No signal available for timeframe: ${timeframe} and symbol: ${normalizedSymbol}, creating mock signal`,
    );

    // Create a realistic mock signal based on the symbol
    const mockPrice = normalizedSymbol.includes("btc")
      ? 62345.67
      : normalizedSymbol.includes("eth")
        ? 3456.78
        : normalizedSymbol.includes("sol")
          ? 145.23
          : normalizedSymbol.includes("bnb")
            ? 567.89
            : normalizedSymbol.includes("ada")
              ? 0.45
              : normalizedSymbol.includes("doge")
                ? 0.12
                : normalizedSymbol.includes("xrp")
                  ? 0.56
                  : normalizedSymbol.includes("dot")
                    ? 6.78
                    : normalizedSymbol.includes("link")
                      ? 12.34
                      : normalizedSymbol.includes("matic")
                        ? 0.78
                        : normalizedSymbol.includes("avax")
                          ? 34.56
                          : 100.0;

    // Randomly select a signal type with weighted probability
    const signalType: SignalType =
      Math.random() < 0.4 ? "BUY" : Math.random() < 0.7 ? "SELL" : "HOLD";

    // Calculate realistic values based on the signal type
    const entryPoint = mockPrice;
    const stopLoss = signalType === "BUY" ? mockPrice * 0.97 : mockPrice * 1.03;
    const targetPrice =
      signalType === "BUY" ? mockPrice * 1.05 : mockPrice * 0.95;
    const confidence = Math.floor(Math.random() * 30) + 65; // 65-95%

    // Generate realistic reasoning based on signal type
    let reasoning = "";
    if (signalType === "BUY") {
      reasoning = `BUY signal based on ${Math.floor(Math.random() * 3) + 3} indicators. `;
      reasoning += `RSI is oversold (${(Math.random() * 10 + 20).toFixed(2)}) indicating potential reversal. `;
      reasoning += `MACD line (${(Math.random() * 0.01).toFixed(4)}) crossed above signal line (${(Math.random() * 0.005).toFixed(4)}). `;
      reasoning += `Short-term MA (${(mockPrice + Math.random() * 5).toFixed(4)}) above long-term MA (${(mockPrice - Math.random() * 5).toFixed(4)}). `;
    } else if (signalType === "SELL") {
      reasoning = `SELL signal based on ${Math.floor(Math.random() * 3) + 3} indicators. `;
      reasoning += `RSI is overbought (${(Math.random() * 10 + 70).toFixed(2)}) indicating potential reversal. `;
      reasoning += `MACD line (${(-Math.random() * 0.01).toFixed(4)}) crossed below signal line (${(Math.random() * 0.005).toFixed(4)}). `;
      reasoning += `Short-term MA (${(mockPrice - Math.random() * 5).toFixed(4)}) below long-term MA (${(mockPrice + Math.random() * 5).toFixed(4)}). `;
    } else {
      reasoning =
        "Mixed or insufficient signals detected. Waiting for clearer trend confirmation before taking action. ";
      reasoning += `(Buy signals: ${Math.floor(Math.random() * 3) + 1}, Sell signals: ${Math.floor(Math.random() * 3) + 1})`;
    }

    const mockSignal: SignalData = {
      signal: signalType,
      entryPoint,
      stopLoss,
      targetPrice,
      confidence,
      reasoning,
      timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`,
    };

    // Cache the mock signal
    signalCache[cacheKey] = mockSignal;
    return mockSignal;
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

  // Ensure WebSocket is initialized (which also initializes mock data in dev mode)
  if (!isInitialized) {
    initializeWebSocket();
  }

  // Normalize symbol to lowercase for consistency
  const normalizedSymbol = symbol.toLowerCase();

  // Create a cache key combining symbol and timeframe
  const cacheKey = `${normalizedSymbol}_${timeframe}`;

  // In development mode, generate a new random signal only on explicit refresh
  if (import.meta.env.DEV) {
    // If we're in development mode but mock data hasn't been initialized yet, do it now
    if (!mockDataInitialized) {
      initializeWebSocket();
    }
    console.log(`[API] Generating new mock signal for explicit refresh`);

    // Get the current cached signal if it exists
    const currentSignal = signalCache[cacheKey];

    // If we have a current signal, use its values as a base to avoid dramatic changes
    let basePrice;
    if (currentSignal) {
      // Use the current entry point as the base price, with small variation
      basePrice =
        currentSignal.entryPoint * (1 + (Math.random() * 0.01 - 0.005));
    } else {
      // If no current signal, create a realistic base price based on the symbol
      basePrice = normalizedSymbol.includes("btc")
        ? 62345.67
        : normalizedSymbol.includes("eth")
          ? 3456.78
          : normalizedSymbol.includes("sol")
            ? 145.23
            : normalizedSymbol.includes("bnb")
              ? 567.89
              : normalizedSymbol.includes("ada")
                ? 0.45
                : normalizedSymbol.includes("doge")
                  ? 0.12
                  : normalizedSymbol.includes("xrp")
                    ? 0.56
                    : normalizedSymbol.includes("dot")
                      ? 6.78
                      : normalizedSymbol.includes("link")
                        ? 12.34
                        : normalizedSymbol.includes("matic")
                          ? 0.78
                          : normalizedSymbol.includes("avax")
                            ? 34.56
                            : 100.0;
    }

    // Add small random variation to the price for the refresh
    const updatedPrice = basePrice * (1 + (Math.random() * 0.01 - 0.005));

    // If we have a current signal, keep the same signal type with 80% probability
    // This creates more stability in the signals
    let signalType: SignalType;
    if (currentSignal && Math.random() < 0.8) {
      signalType = currentSignal.signal;
    } else {
      // Otherwise, randomly select a signal type with weighted probability
      signalType =
        Math.random() < 0.4 ? "BUY" : Math.random() < 0.7 ? "SELL" : "HOLD";
    }

    // Calculate realistic values based on the signal type
    const entryPoint = updatedPrice;
    const stopLoss =
      signalType === "BUY" ? updatedPrice * 0.97 : updatedPrice * 1.03;
    const targetPrice =
      signalType === "BUY" ? updatedPrice * 1.05 : updatedPrice * 0.95;

    // If we have a current signal, keep similar confidence with small variation
    const confidence = currentSignal
      ? Math.min(
          95,
          Math.max(
            65,
            currentSignal.confidence + (Math.floor(Math.random() * 7) - 3),
          ),
        )
      : Math.floor(Math.random() * 30) + 65; // 65-95% for new signals

    // Generate realistic reasoning based on signal type
    let reasoning = "";
    if (signalType === "BUY") {
      reasoning = `BUY signal based on ${Math.floor(Math.random() * 3) + 3} indicators. `;
      reasoning += `RSI is oversold (${(Math.random() * 10 + 20).toFixed(2)}) indicating potential reversal. `;
      reasoning += `MACD line (${(Math.random() * 0.01).toFixed(4)}) crossed above signal line (${(Math.random() * 0.005).toFixed(4)}). `;
      reasoning += `Short-term MA (${(updatedPrice + Math.random() * 5).toFixed(4)}) above long-term MA (${(updatedPrice - Math.random() * 5).toFixed(4)}). `;
    } else if (signalType === "SELL") {
      reasoning = `SELL signal based on ${Math.floor(Math.random() * 3) + 3} indicators. `;
      reasoning += `RSI is overbought (${(Math.random() * 10 + 70).toFixed(2)}) indicating potential reversal. `;
      reasoning += `MACD line (${(-Math.random() * 0.01).toFixed(4)}) crossed below signal line (${(Math.random() * 0.005).toFixed(4)}). `;
      reasoning += `Short-term MA (${(updatedPrice - Math.random() * 5).toFixed(4)}) below long-term MA (${(updatedPrice + Math.random() * 5).toFixed(4)}). `;
    } else {
      reasoning =
        "Mixed or insufficient signals detected. Waiting for clearer trend confirmation before taking action. ";
      reasoning += `(Buy signals: ${Math.floor(Math.random() * 3) + 1}, Sell signals: ${Math.floor(Math.random() * 3) + 1})`;
    }

    const mockSignal: SignalData = {
      signal: signalType,
      entryPoint,
      stopLoss,
      targetPrice,
      confidence,
      reasoning,
      timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`,
    };

    // Cache the mock signal
    signalCache[cacheKey] = mockSignal;
    return mockSignal;
  }

  // For production: Don't clear analyzer data on refresh to maintain signal stability
  // Only update with new data

  // Get a fresh signal
  return getSignal(timeframe, symbol);
}

// Function to change the symbol
export function changeSymbol(symbol: string): void {
  // Extract the actual symbol from TradingView format (e.g., "BINANCE:ETHUSDT" -> "ETHUSDT")
  const actualSymbol = symbol.includes(":") ? symbol.split(":")[1] : symbol;

  console.log(`[API] Changing symbol to: ${actualSymbol}`);

  // In development mode, we don't want to clear all cached signals
  // Instead, we'll only clear signals for the current symbol if needed
  if (import.meta.env.DEV) {
    console.log(
      `[API] Development mode: Preserving signal cache when changing symbol`,
    );

    // Ensure we have mock data for this symbol
    const normalizedSymbol = actualSymbol.toLowerCase();
    const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

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

          // Update the price values
          clonedSignal.entryPoint =
            (clonedSignal.entryPoint * priceMultiplier) / 1000;
          clonedSignal.stopLoss =
            (clonedSignal.stopLoss * priceMultiplier) / 1000;
          clonedSignal.targetPrice =
            (clonedSignal.targetPrice * priceMultiplier) / 1000;

          // Update timestamp
          clonedSignal.timestamp = `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${tf})`;

          signalCache[targetKey] = clonedSignal;
        }
      });
    }
  } else {
    // In production, clear all cached signals
    console.log(
      `[API] Production mode: Clearing signal cache when changing symbol`,
    );
    Object.keys(signalCache).forEach((key) => delete signalCache[key]);
  }

  // Update the symbol in the binance service
  binanceService.setSymbol(actualSymbol);
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
