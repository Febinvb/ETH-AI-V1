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
  private ws: WebSocket | null = null;
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
    if (this.ws) {
      this.disconnect();
    }

    try {
      // Connect to Binance WebSocket for trades
      const tradeWsUrl = `wss://stream.binance.com:9443/ws/${this.symbol}@trade`;
      this.ws = new WebSocket(tradeWsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

      // Fetch initial ticker data when connecting
      this.fetchTickerData(this.symbol);
    } catch (error) {
      this.emit(
        "error",
        error instanceof Error ? error : new Error(String(error)),
      );
      this.attemptReconnect();
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
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
    // No need to reconnect as interval is only used for klines
  }

  private handleOpen(): void {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.emit("connected");
    console.log(`Connected to Binance WebSocket for ${this.symbol}`);

    // Set up a regular ticker data fetch
    this.startTickerDataInterval();
  }

  // Fetch ticker data from Binance REST API
  private async fetchTickerData(symbol: string): Promise<void> {
    try {
      // Add a timestamp parameter to prevent caching
      const timestamp = Date.now();
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}&_=${timestamp}`;

      console.log(
        `[BinanceService] Fetching fresh ticker data for ${symbol} at ${new Date().toISOString()}`,
      );

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as BinanceTickerData;

      // Add a timestamp to the data
      (data as any).fetchTimestamp = new Date().toISOString();

      this.emit("tickerData", data, symbol.toLowerCase());
      console.log(`[BinanceService] Received ticker data for ${symbol}:`, data);
    } catch (error) {
      console.error(`Error fetching ticker data for ${symbol}:`, error);
      this.emit(
        "error",
        new Error(`Failed to fetch ticker data for ${symbol}`),
      );
    }
  }

  // Start interval for regular ticker data updates
  private tickerDataInterval: number | null = null;

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

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      // Handle trade events
      if (data.e === "trade") {
        const tradeEvent = data as BinanceTradeEvent;

        // Store the trade in the symbol-specific data structure
        const symbolData = this.symbolDataMap.get(this.symbol);
        if (symbolData) {
          // Add the new trade to the beginning of the array
          symbolData.trades.unshift(tradeEvent);

          // Keep only the most recent 200 trades to avoid memory issues
          if (symbolData.trades.length > 200) {
            symbolData.trades.pop();
          }
        }

        // Emit the trade event with the symbol information
        this.emit("trade", tradeEvent, this.symbol);
      }
      // Handle kline events
      else if (data.e === "kline") {
        this.emit("kline", data as BinanceKlineEvent, this.symbol);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  private handleError(error: Event): void {
    console.error("WebSocket error:", error);
    this.emit("error", new Error("WebSocket connection error"));
  }

  private handleClose(event: CloseEvent): void {
    this.isConnected = false;
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.emit("disconnected", event.reason);
    this.attemptReconnect();
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
