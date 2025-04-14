// Define types for Binance WebSocket responses
export interface BinanceTradeEvent {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  t: number; // Trade ID
  p: string; // Price
  q: string; // Quantity
  b: number; // Buyer order ID
  a: number; // Seller order ID
  T: number; // Trade time
  m: boolean; // Is the buyer the market maker?
  M: boolean; // Ignore
}

// Define types for Binance REST API responses
export interface BinanceTickerData {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface BinanceKlineEvent {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: number; // First trade ID
    L: number; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
}

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

// Extend the BrowserEventEmitter with our custom events
export class BinanceService extends BrowserEventEmitter {
  private apiKey: string = ""; // Your API key if needed
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5 to 10 for better resilience
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
  private webSocket: WebSocket | null = null;
  private isFutures: boolean = true; // Default to futures

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
        `[BinanceService] Starting WebSocket connection for ${this.symbol} in ${this.isFutures ? "Futures" : "Spot"} mode`,
      );

      // Create WebSocket connection to Binance Futures
      this.connectWebSocket();

      // Fetch initial data to populate while waiting for WebSocket
      this.fetchTickerData(this.symbol);

      // Also fetch kline data immediately to ensure we have data for signal generation
      this.fetchKlineData(this.symbol, this.interval, 100);

      // Set connection status
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit("connected");

      // Start ticker data interval as backup
      this.startTickerDataInterval();
    } catch (error) {
      this.emit(
        "error",
        error instanceof Error ? error : new Error(String(error)),
      );
      this.attemptReconnect();
    }
  }

  private connectWebSocket(): void {
    // Close existing WebSocket if any
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }

    // Format symbol for WebSocket (lowercase and remove USDT suffix for stream name)
    const formattedSymbol = this.symbol.toLowerCase();

    // Determine the WebSocket URL based on whether we're using futures or spot
    const wsBaseUrl = this.isFutures
      ? "wss://fstream.binance.com/ws"
      : "wss://stream.binance.com/ws";

    // Create streams for kline, ticker, and trade data
    const streams = [
      `${formattedSymbol}@kline_${this.getIntervalForStream(this.interval)}`,
      `${formattedSymbol}@ticker`,
      `${formattedSymbol}@trade`,
    ];

    const wsUrl = `${wsBaseUrl}/${streams.join("/")}`;
    console.log(
      `[BinanceService] Connecting to WebSocket: ${wsUrl} (${this.isFutures ? "Futures" : "Spot"} mode)`,
    );

    this.webSocket = new WebSocket(wsUrl);

    this.webSocket.onopen = () => {
      console.log(
        `[BinanceService] WebSocket connection opened for ${this.symbol} in ${this.isFutures ? "Futures" : "Spot"} mode`,
      );
      this.isConnected = true;
      this.emit("connected");
    };

    this.webSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.processWebSocketMessage(data);
      } catch (error) {
        console.error(
          "[BinanceService] Error processing WebSocket message:",
          error,
        );
      }
    };

    this.webSocket.onerror = (error) => {
      console.error("[BinanceService] WebSocket error:", error);
      this.emit("error", new Error("WebSocket error"));
    };

    this.webSocket.onclose = (event) => {
      console.log(
        `[BinanceService] WebSocket closed: ${event.code} ${event.reason}`,
      );
      this.isConnected = false;
      this.emit("disconnected", event.reason || "WebSocket closed");
      this.attemptReconnect();
    };
  }

  private processWebSocketMessage(data: any): void {
    // Handle different types of messages
    if (data.e === "kline") {
      this.processKlineEvent(data);
    } else if (data.e === "24hrTicker") {
      this.processTickerEvent(data);
    } else if (data.e === "trade") {
      this.processTradeEvent(data);
    } else {
      console.log(
        `[BinanceService] Received unknown event type: ${data.e}`,
        data,
      );
    }
  }

  private processKlineEvent(data: BinanceKlineEvent): void {
    console.log(`[BinanceService] Received kline event for ${data.s}:`, data.k);

    // Process the kline data to generate a trade event
    const tradeFromKline = {
      e: "trade",
      E: Date.now(),
      s: data.s,
      t: data.k.t,
      p: data.k.c, // Use close price
      q: data.k.v, // Use volume
      b: 0,
      a: 0,
      T: data.k.T,
      m: false,
      M: false,
    } as BinanceTradeEvent;

    // Store the trade derived from kline
    const symbolData = this.symbolDataMap.get(data.s.toLowerCase());
    if (symbolData) {
      // Add the new trade to the beginning of the array
      symbolData.trades.unshift(tradeFromKline);

      // Keep only the most recent 200 trades
      if (symbolData.trades.length > 200) {
        symbolData.trades.pop();
      }

      // Also emit a trade event so signal generation can happen
      this.emit("trade", tradeFromKline, data.s.toLowerCase());

      // Also emit a ticker data event to ensure we have price data
      const tickerData: BinanceTickerData = {
        symbol: data.s,
        priceChange: "0",
        priceChangePercent: "0",
        weightedAvgPrice: data.k.c,
        prevClosePrice: data.k.o,
        lastPrice: data.k.c,
        lastQty: data.k.v,
        bidPrice: "0",
        bidQty: "0",
        askPrice: "0",
        askQty: "0",
        openPrice: data.k.o,
        highPrice: data.k.h,
        lowPrice: data.k.l,
        volume: data.k.v,
        quoteVolume: data.k.q,
        openTime: data.k.t,
        closeTime: data.k.T,
        firstId: 0,
        lastId: 0,
        count: data.k.n,
      };

      this.emit("tickerData", tickerData, data.s.toLowerCase());
    }

    // Emit the original kline event
    this.emit("kline", data, data.s.toLowerCase());
  }

  private processTickerEvent(data: any): void {
    console.log(`[BinanceService] Received ticker event for ${data.s}:`, data);

    // Convert to the format expected by the existing code
    const tickerData: BinanceTickerData = {
      symbol: data.s,
      priceChange: data.p,
      priceChangePercent: data.P,
      weightedAvgPrice: data.w,
      prevClosePrice: data.x,
      lastPrice: data.c,
      lastQty: data.Q,
      bidPrice: data.b,
      bidQty: data.B,
      askPrice: data.a,
      askQty: data.A,
      openPrice: data.o,
      highPrice: data.h,
      lowPrice: data.l,
      volume: data.v,
      quoteVolume: data.q,
      openTime: data.O,
      closeTime: data.C,
      firstId: data.F,
      lastId: data.L,
      count: data.n,
    };

    this.emit("tickerData", tickerData, data.s.toLowerCase());
  }

  private processTradeEvent(data: BinanceTradeEvent): void {
    console.log(`[BinanceService] Received trade event for ${data.s}:`, data);

    // Store the trade in the symbol-specific data structure
    const symbolData = this.symbolDataMap.get(data.s.toLowerCase());
    if (symbolData) {
      // Add the new trade to the beginning of the array
      symbolData.trades.unshift(data);

      // Keep only the most recent 200 trades to avoid memory issues
      if (symbolData.trades.length > 200) {
        symbolData.trades.pop();
      }
    }

    // Emit the trade event with the symbol information
    this.emit("trade", data, data.s.toLowerCase());
  }

  private getIntervalForStream(interval: string): string {
    // Convert interval format if needed (e.g., "1h" to "1h")
    // For Binance WebSocket, intervals are like: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
    return interval.toLowerCase();
  }

  public disconnect(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }

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
    if (this.interval !== interval) {
      this.interval = interval;

      // Reconnect to update the kline stream with the new interval
      if (this.isConnected && this.webSocket) {
        this.reconnectAttempts = 0;
        this.disconnect();
        this.connect();
      }
    }
  }

  // Toggle between futures and spot markets
  public setFuturesMode(isFutures: boolean): void {
    if (this.isFutures !== isFutures) {
      this.isFutures = isFutures;
      console.log(
        `[BinanceService] Switching to ${isFutures ? "Futures" : "Spot"} mode`,
      );

      // Reconnect if already connected to update the WebSocket URL
      if (this.isConnected) {
        this.reconnectAttempts = 0;
        this.disconnect();
        this.connect();
      }
    }
  }

  // Start interval for regular ticker data updates (as backup)
  private startTickerDataInterval(): void {
    // Clear any existing interval
    if (this.tickerDataInterval !== null) {
      window.clearInterval(this.tickerDataInterval);
    }

    // Set up new interval - fetch every 5 seconds as a backup
    this.tickerDataInterval = window.setInterval(() => {
      // Always fetch ticker data periodically to ensure fresh data
      // even if WebSocket is connected but not sending data
      this.fetchTickerData(this.symbol);
    }, 5000);
  }

  // Fetch ticker data from Binance REST API
  public async fetchTickerData(symbol: string): Promise<void> {
    try {
      // Add a timestamp parameter to prevent caching
      const timestamp = Date.now();
      const baseUrl = this.isFutures
        ? "https://fapi.binance.com/fapi/v1/ticker/24hr"
        : "https://api.binance.com/api/v3/ticker/24hr";

      const url = `${baseUrl}?symbol=${symbol.toUpperCase()}&_=${timestamp}`;

      console.log(
        `[BinanceService] Fetching backup ticker data for ${symbol} at ${new Date().toISOString()}`,
      );

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add a timestamp to the data
      (data as any).fetchTimestamp = new Date().toISOString();

      this.emit("tickerData", data, symbol.toLowerCase());
      console.log(
        `[BinanceService] Received backup ticker data for ${symbol}:`,
        data,
      );
    } catch (error) {
      console.error(`Error fetching ticker data for ${symbol}:`, error);
      this.emit(
        "error",
        new Error(`Failed to fetch ticker data for ${symbol}`),
      );
    }
  }

  // Fetch kline (candlestick) data
  public async fetchKlineData(
    symbol: string,
    interval: string = "15m",
    limit: number = 100,
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const baseUrl = this.isFutures
        ? "https://fapi.binance.com/fapi/v1/klines"
        : "https://api.binance.com/api/v3/klines";

      const url = `${baseUrl}?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}&_=${timestamp}`;

      console.log(
        `[BinanceService] Fetching kline data for ${symbol} with interval ${interval}`,
      );

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const klines = await response.json();

      // Process klines and emit events
      klines.forEach((kline: any) => {
        const klineEvent: BinanceKlineEvent = {
          e: "kline",
          E: Date.now(),
          s: symbol.toUpperCase(),
          k: {
            t: kline[0], // Open time
            T: kline[6], // Close time
            s: symbol.toUpperCase(),
            i: interval,
            f: 0, // First trade ID
            L: 0, // Last trade ID
            o: kline[1], // Open price
            c: kline[4], // Close price
            h: kline[2], // High price
            l: kline[3], // Low price
            v: kline[5], // Base asset volume
            n: kline[8], // Number of trades
            x: true, // Is this kline closed?
            q: kline[7], // Quote asset volume
            V: "0", // Taker buy base asset volume
            Q: "0", // Taker buy quote asset volume
            B: "0", // Ignore
          },
        };

        this.emit("kline", klineEvent, symbol.toLowerCase());
      });

      console.log(
        `[BinanceService] Processed ${klines.length} klines for ${symbol}`,
      );
    } catch (error) {
      console.error(`Error fetching kline data for ${symbol}:`, error);
      this.emit("error", new Error(`Failed to fetch kline data for ${symbol}`));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Use exponential backoff but cap at 30 seconds to prevent extremely long delays
      const delay = Math.min(
        30000, // 30 second maximum
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      );
      console.log(
        `[BinanceService] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );

      this.reconnectTimer = window.setTimeout(() => {
        console.log(
          `[BinanceService] Executing reconnection attempt ${this.reconnectAttempts}`,
        );
        this.connect();
      }, delay);
    } else {
      console.error(
        `[BinanceService] Failed to reconnect after ${this.maxReconnectAttempts} attempts. Will not retry automatically.`,
      );
      // Emit an error event so the UI can notify the user
      this.emit(
        "error",
        new Error(
          `Failed to reconnect after ${this.maxReconnectAttempts} attempts`,
        ),
      );
    }
  }
}

// Add methods to get trades for a specific symbol
export class BinanceServiceWithData extends BinanceService {
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

  // Get the current price for a symbol
  public getCurrentPrice(symbol?: string): number {
    const symbolToUse = symbol ? symbol.toLowerCase() : this.getCurrentSymbol();
    const trades = this.getTradesForSymbol(symbolToUse);

    if (trades && trades.length > 0) {
      // Return the most recent trade price
      return parseFloat(trades[0].p);
    }

    return 0; // Return 0 if no price is available
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
const binanceService = new BinanceServiceWithData();
export default binanceService;
