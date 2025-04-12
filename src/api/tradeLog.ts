// Define TradeData interface locally instead of importing from mockApi
export interface TradeData {
  id: string;
  date: string;
  pair: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

// Default trade log data when live data is unavailable
const defaultTradeLogData: TradeData[] = [
  {
    id: "T1001",
    date: "2023-07-20 09:45:22",
    pair: "ETH/USDT",
    direction: "BUY",
    entryPrice: 0.5123,
    exitPrice: 0.5432,
    quantity: 100,
    pnl: 30.9,
    pnlPercent: 6.03,
    status: "CLOSED",
  },
  {
    id: "T1002",
    date: "2023-07-19 14:22:05",
    pair: "ETH/USDT",
    direction: "SELL",
    entryPrice: 0.5432,
    exitPrice: 0.5123,
    quantity: 150,
    pnl: 46.35,
    pnlPercent: 5.69,
    status: "CLOSED",
  },
  {
    id: "T1003",
    date: "2023-07-21 11:05:33",
    pair: "ETH/USDT",
    direction: "BUY",
    entryPrice: 0.5123,
    exitPrice: 0,
    quantity: 200,
    pnl: 0,
    pnlPercent: 0,
    status: "OPEN",
  },
];

// Fetch trade log data
export async function getTradeLog(): Promise<TradeData[]> {
  console.log("[API] Fetching trade log data...");
  try {
    const response = await fetch("/api/tradeLog");

    if (!response.ok) {
      console.log(
        `[API] Trade log data fetch failed: ${response.status} ${response.statusText}`,
      );
      console.log("[API] Returning default trade log data");
      return defaultTradeLogData;
    }

    const data = await response.json();
    console.log("[API] Trade log data fetched successfully:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch trade log data:", error);
    console.log("[API] Returning default trade log data due to error");
    return defaultTradeLogData;
  }
}
