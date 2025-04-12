// Define PerformanceData interface locally instead of importing from mockApi
export interface PerformanceData {
  winRate: number;
  totalTrades: number;
  avgPnl: number;
  monthlyPnl: number;
  pnlHistory: { date: string; value: number }[];
}

// Default performance data when live data is unavailable
const defaultPerformanceData: PerformanceData = {
  winRate: 68,
  totalTrades: 42,
  avgPnl: 2.7,
  monthlyPnl: 8.4,
  pnlHistory: [
    { date: "2023-06-01", value: 1.2 },
    { date: "2023-06-15", value: 3.5 },
    { date: "2023-07-01", value: 5.8 },
    { date: "2023-07-15", value: 8.4 },
  ],
};

// Fetch performance metrics
export async function getPerformance(): Promise<PerformanceData> {
  console.log("[API] Fetching performance data...");
  try {
    const response = await fetch("/api/performance");

    if (!response.ok) {
      console.log(
        `[API] Performance data fetch failed: ${response.status} ${response.statusText}`,
      );
      console.log("[API] Returning default performance data");
      return defaultPerformanceData;
    }

    const data = await response.json();
    console.log("[API] Performance data fetched successfully:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch performance data:", error);
    console.log("[API] Returning default performance data due to error");
    return defaultPerformanceData;
  }
}
