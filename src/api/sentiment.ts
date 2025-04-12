import { SentimentData } from "./mockApi";

// Default sentiment data to use when live data is unavailable
const defaultSentimentData: SentimentData = {
  marketSentiment: "neutral",
  sentimentScore: 50,
  bullishFactors: ["XRP community support", "Potential regulatory clarity"],
  bearishFactors: ["Market volatility", "Regulatory uncertainty"],
  lastUpdated: new Date().toISOString(),
};

// Fetch market sentiment data
export async function fetchSentiment(): Promise<SentimentData> {
  console.log("[API] Fetching sentiment data...");
  try {
    const response = await fetch("/api/sentiment");

    if (!response.ok) {
      console.log(
        `[API] Sentiment data fetch failed: ${response.status} ${response.statusText}`,
      );
      console.log("[API] Returning default sentiment data");
      return defaultSentimentData;
    }

    const data = await response.json();
    console.log("[API] Sentiment data fetched successfully:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch sentiment data:", error);
    console.log("[API] Returning default sentiment data due to error");
    return defaultSentimentData;
  }
}
