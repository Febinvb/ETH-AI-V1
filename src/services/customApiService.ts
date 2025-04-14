import {
  BinanceTradeEvent,
  BinanceTickerData,
  BinanceKlineEvent,
} from "./binanceService";

// Custom event handler types
type EventHandler = (...args: any[]) => void;

// Browser-compatible event emitter implementation
class BrowserEventEmitter {
  private events: Record<string, EventHandler[]> = {};

  public on(event: string, handler: EventHandler): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  public off(event: string, handler: EventHandler): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((h) => h !== handler);
  }

  public emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach((handler) => handler(...args));
  }

  public removeAllListeners(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

// Custom API Service that mimics the BinanceService interface
export class CustomApiService extends BrowserEventEmitter {
  private apiBaseUrl: string = "https://your-api-endpoint.com/api"; // Replace with your API endpoint
  private apiKey: string = ""; // Your API key if needed
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private symbol: string;
  private interval: string;
  public isConnected = false;
  private reconnectTimer: number | null = null;
  private symbolDataMap: Map<
    string,
    {
      trades: BinanceTradeEvent[];
      lastSignal: any | null;
    }
  > = new Map();
  private dataPollingInterval: number | null = null;
  private tickerDataInterval: number | null = null;

  constructor(symbol = "ethusdt", interval = "15m") {
    super();
    this.symbol = symbol.toLowerCase();
    this.interval = interval;
    // Initialize data structure for the default symbol
    this.symbolDataMap.set(this.symbol, {
      trades: [],
      lastSignal: null,
    });
  }

  public connect(): void {
    if (this.isConnected) {
      this.disconnect();
    }

    try {
      console.log(
        `[CustomApiService] Starting API connection for ${this.symbol}`,
      );

      // Fetch initial data
      this.fetchTickerData(this.symbol);
      this.fetchRecentTrades(this.symbol);

      // Set connection status
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit("connected");

      // Start regular data polling
      this.startDataPolling();
      this.startTickerDataInterval();
    } catch (error) {
      this.emit(
        "error",
        error instanceof Error ? error : new Error(String(error)),
      );
      this.attemptReconnect();
    }
  }

  public disconnect(): void {
    if (this.dataPollingInterval !== null) {
      window.clearInterval(this.dataPollingInterval);
      this.dataPollingInterval = null;
    }

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.tickerDataInterval !== null) {
      window.clearInterval(this.tickerDataInterval);
      this.tickerDataInterval = null;
    }

    this.isConnected = false;
    this.emit("disconnected", "Manual disconnect");
  }

  public setSymbol(symbol: string): void {
    const newSymbol = symbol.toLowerCase();

    // If this is a new symbol we haven't seen before, initialize its data structure
    if (!this.symbolDataMap.has(newSymbol)) {
      this.symbolDataMap.set(newSymbol, {
        trades: [],
        lastSignal: null,
      });
    }

    // Only reconnect if the symbol has actually changed
    if (this.symbol !== newSymbol) {
      this.symbol = newSymbol;

      // Emit a symbol change event so listeners can update
      this.emit("symbolChange", this.symbol);

      if (this.isConnected) {
        this.reconnectAttempts = 0;
        this.disconnect();
        this.connect();
      }
    }
  }

  public setInterval(interval: string): void {
    this.interval = interval;
  }

  // Start polling for data at regular intervals
  private startDataPolling(): void {
    // Clear any existing interval
    if (this.dataPollingInterval !== null) {
      window.clearInterval(this.dataPollingInterval);
    }

    // Poll for recent trades every 2 seconds
    this.dataPollingInterval = window.setInterval(() => {
      this.fetchRecentTrades(this.symbol);
    }, 2000);
  }

  // Fetch recent trades from your custom API
  private async fetchRecentTrades(symbol: string): Promise<void> {
    try {
      // Add a timestamp parameter to prevent caching
      const timestamp = Date.now();
      const url = `${this.apiBaseUrl}/trades?symbol=${symbol.toUpperCase()}&limit=20&_=${timestamp}`;

      console.log(
        `[CustomApiService] Fetching recent trades for ${symbol} at ${new Date().toISOString()}`,
      );

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          // Add your API key if needed
          // "X-API-Key": this.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const trades = await response.json();

      // Process each trade and convert to BinanceTradeEvent format
      // Modify this to match your API's response format
      trades.forEach((trade: any) => {
        const tradeEvent: BinanceTradeEvent = {
          e: "trade",
          E: Date.now(),
          s: symbol.toUpperCase(),
          t: trade.id,
          p: trade.price,
          q: trade.quantity,
          b: trade.buyerOrderId || 0,
          a: trade.sellerOrderId || 0,
          T: trade.timestamp || Date.now(),
          m: trade.isBuyerMaker || false,
          M: false,
        };

        // Store the trade in the symbol-specific data structure
        const symbolData = this.symbolDataMap.get(symbol.toLowerCase());
        if (symbolData) {
          // Add the new trade to the beginning of the array
          symbolData.trades.unshift(tradeEvent);

          // Keep only the most recent 200 trades to avoid memory issues
          if (symbolData.trades.length > 200) {
            symbolData.trades.pop();
          }
        }

        // Emit the trade event with the symbol information
        this.emit("trade", tradeEvent, symbol.toLowerCase());
      });

      console.log(
        `[CustomApiService] Processed ${trades.length} trades for ${symbol}`,
      );
    } catch (error) {
      console.error(`Error fetching recent trades for ${symbol}:`, error);
      this.emit(
        "error",
        new Error(`Failed to fetch recent trades for ${symbol}`),
      );

      // Try to reconnect if we're having API issues
      if (this.isConnected) {
        console.log(
          `[CustomApiService] Attempting to reconnect due to API error`,
        );
        this.reconnectAttempts = 0;
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
      }
    }
  }

  // Fetch ticker data from your custom API
  private async fetchTickerData(symbol: string): Promise<void> {
    try {
      // Add a timestamp parameter to prevent caching
      const timestamp = Date.now();
      const url = `${this.apiBaseUrl}/ticker?symbol=${symbol.toUpperCase()}&_=${timestamp}`;

      console.log(
        `[CustomApiService] Fetching fresh ticker data for ${symbol} at ${new Date().toISOString()}`,
      );

      // Implement retry logic
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      let data;

      while (!success && retries < maxRetries) {
        try {
          const response = await fetch(url, {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
              // Add your API key if needed
              // "X-API-Key": this.apiKey,
            },
            // Add a timeout to prevent hanging requests
            signal: AbortSignal.timeout(5000),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Modify this to match your API's response format
          const rawData = await response.json();

          // Convert your API's response to match BinanceTickerData format
          data = {
            symbol: rawData.symbol || symbol.toUpperCase(),
            priceChange: rawData.priceChange || "0",
            priceChangePercent: rawData.priceChangePercent || "0",
            weightedAvgPrice: rawData.weightedAvgPrice || "0",
            prevClosePrice: rawData.prevClosePrice || "0",
            lastPrice: rawData.lastPrice || "0",
            lastQty: rawData.lastQty || "0",
            bidPrice: rawData.bidPrice || "0",
            bidQty: rawData.bidQty || "0",
            askPrice: rawData.askPrice || "0",
            askQty: rawData.askQty || "0",
            openPrice: rawData.openPrice || "0",
            highPrice: rawData.highPrice || "0",
            lowPrice: rawData.lowPrice || "0",
            volume: rawData.volume || "0",
            quoteVolume: rawData.quoteVolume || "0",
            openTime: rawData.openTime || Date.now() - 86400000,
            closeTime: rawData.closeTime || Date.now(),
            firstId: rawData.firstId || 0,
            lastId: rawData.lastId || 0,
            count: rawData.count || 0,
          };

          success = true;
        } catch (fetchError) {
          retries++;
          console.warn(
            `Retry ${retries}/${maxRetries} for ${symbol} ticker data:`,
            fetchError,
          );

          if (retries >= maxRetries) {
            throw fetchError;
          }

          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * Math.pow(2, retries)),
          );
        }
      }

      if (!data) {
        throw new Error(
          `Failed to fetch data for ${symbol} after ${maxRetries} attempts`,
        );
      }

      // Add a timestamp to the data
      (data as any).fetchTimestamp = new Date().toISOString();

      this.emit("tickerData", data, symbol.toLowerCase());
      console.log(
        `[CustomApiService] Received ticker data for ${symbol}:`,
        data,
      );
    } catch (error) {
      console.error(`Error fetching ticker data for ${symbol}:`, error);
      this.emit(
        "error",
        new Error(`Failed to fetch ticker data for ${symbol}`),
      );

      // Try to reconnect if we're having API issues
      if (this.isConnected) {
        console.log(
          `[CustomApiService] Attempting to reconnect due to API error`,
        );
        this.reconnectAttempts = 0;
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
      }
    }
  }

  // Start interval for regular ticker data updates
  private startTickerDataInterval(): void {
    // Clear any existing interval
    if (this.tickerDataInterval !== null) {
      window.clearInterval(this.tickerDataInterval);
    }

    // Set up new interval - fetch every 1 second to be more responsive to market changes
    this.tickerDataInterval = window.setInterval(() => {
      this.fetchTickerData(this.symbol);
    }, 1000);
  }

  // Fetch kline (candlestick) data
  public async fetchKlineData(
    symbol: string,
    interval: string = "15m",
    limit: number = 100,
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const url = `${this.apiBaseUrl}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}&_=${timestamp}`;

      console.log(
        `[CustomApiService] Fetching kline data for ${symbol} with interval ${interval}`,
      );

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          // Add your API key if needed
          // "X-API-Key": this.apiKey,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const klines = await response.json();

      // Process klines and emit events
      // Modify this to match your API's response format
      klines.forEach((kline: any) => {
        const klineEvent: BinanceKlineEvent = {
          e: "kline",
          E: Date.now(),
          s: symbol.toUpperCase(),
          k: {
            t: kline.openTime || kline[0], // Open time
            T: kline.closeTime || kline[6], // Close time
            s: symbol.toUpperCase(),
            i: interval,
            f: 0, // First trade ID
            L: 0, // Last trade ID
            o: kline.open || kline[1], // Open price
            c: kline.close || kline[4], // Close price
            h: kline.high || kline[2], // High price
            l: kline.low || kline[3], // Low price
            v: kline.volume || kline[5], // Base asset volume
            n: kline.trades || kline[8], // Number of trades
            x: true, // Is this kline closed?
            q: kline.quoteVolume || kline[7], // Quote asset volume
            V: "0", // Taker buy base asset volume
            Q: "0", // Taker buy quote asset volume
            B: "0", // Ignore
          },
        };

        this.emit("kline", klineEvent, symbol.toLowerCase());
      });

      console.log(
        `[CustomApiService] Processed ${klines.length} klines for ${symbol}`,
      );
    } catch (error) {
      console.error(`Error fetching kline data for ${symbol}:`, error);
      this.emit("error", new Error(`Failed to fetch kline data for ${symbol}`));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
      );

      this.reconnectTimer = window.setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error(
        `Failed to reconnect after ${this.maxReconnectAttempts} attempts`,
      );
    }
  }
}

// Add methods to get trades for a specific symbol
export class CustomApiServiceWithData extends CustomApiService {
  private symbolDataMap: Map<
    string,
    {
      trades: BinanceTradeEvent[];
      lastSignal: any | null;
    }
  > = new Map();

  constructor(symbol = "ethusdt", interval = "15m") {
    super(symbol, interval);
    // Initialize data structure for the default symbol
    this.symbolDataMap.set(symbol.toLowerCase(), {
      trades: [],
      lastSignal: null,
    });

    // Listen to our own trade events to store them by symbol
    this.on("trade", (trade: BinanceTradeEvent, symbol: string) => {
      const symbolToUse = symbol || this.getCurrentSymbol();

      // Ensure we have a data structure for this symbol
      if (!this.symbolDataMap.has(symbolToUse)) {
        this.symbolDataMap.set(symbolToUse, {
          trades: [],
          lastSignal: null,
        });
      }

      const symbolData = this.symbolDataMap.get(symbolToUse);
      if (symbolData) {
        // Add the new trade to the beginning of the array
        symbolData.trades.unshift(trade);

        // Keep only the most recent 200 trades to avoid memory issues
        if (symbolData.trades.length > 200) {
          symbolData.trades.pop();
        }
      }
    });
  }

  // Get the current symbol
  public getCurrentSymbol(): string {
    return super["symbol"];
  }

  // Get trades for a specific symbol
  public getTradesForSymbol(symbol?: string): BinanceTradeEvent[] {
    const symbolToUse = symbol ? symbol.toLowerCase() : this.getCurrentSymbol();
    const symbolData = this.symbolDataMap.get(symbolToUse);
    return symbolData ? [...symbolData.trades] : [];
  }

  // Store the last signal for a symbol
  public setLastSignalForSymbol(signal: any, symbol?: string): void {
    const symbolToUse = symbol ? symbol.toLowerCase() : this.getCurrentSymbol();

    // Ensure we have a data structure for this symbol
    if (!this.symbolDataMap.has(symbolToUse)) {
      this.symbolDataMap.set(symbolToUse, {
        trades: [],
        lastSignal: null,
      });
    }

    const symbolData = this.symbolDataMap.get(symbolToUse);
    if (symbolData) {
      symbolData.lastSignal = signal;
    }
  }

  // Get the last signal for a symbol
  public getLastSignalForSymbol(symbol?: string): any | null {
    const symbolToUse = symbol ? symbol.toLowerCase() : this.getCurrentSymbol();
    const symbolData = this.symbolDataMap.get(symbolToUse);
    return symbolData ? symbolData.lastSignal : null;
  }

  // Clear data for a specific symbol
  public clearDataForSymbol(symbol?: string): void {
    const symbolToUse = symbol ? symbol.toLowerCase() : this.getCurrentSymbol();
    if (this.symbolDataMap.has(symbolToUse)) {
      this.symbolDataMap.set(symbolToUse, {
        trades: [],
        lastSignal: null,
      });
    }
  }
}

// Create a singleton instance
const customApiService = new CustomApiServiceWithData();
export default customApiService;
