// Define RiskAnalysisData interface locally instead of importing from mockApi
export interface RiskAnalysisData {
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  riskRewardRatio: number;
  winLossRatio: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  recommendations: string[];
}

// Default risk analysis data when live data is unavailable
const defaultRiskAnalysisData: RiskAnalysisData = {
  maxDrawdown: 12.5,
  sharpeRatio: 1.8,
  volatility: 15.2,
  riskRewardRatio: 2.3,
  winLossRatio: 2.1,
  riskLevel: "MEDIUM",
  recommendations: [
    "Consider reducing position size during high volatility periods",
    "Maintain stop loss at 2% of account balance",
    "Diversify trading pairs to reduce overall risk",
  ],
};

// Fetch risk analysis data
export async function fetchRiskAnalysis(): Promise<RiskAnalysisData> {
  console.log("[API] Fetching risk analysis data...");
  try {
    const response = await fetch("/api/riskAnalysis");

    if (!response.ok) {
      console.log(
        `[API] Risk analysis data fetch failed: ${response.status} ${response.statusText}`,
      );
      console.log("[API] Returning default risk analysis data");
      return defaultRiskAnalysisData;
    }

    const data = await response.json();
    console.log("[API] Risk analysis data fetched successfully:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch risk analysis data:", error);
    console.log("[API] Returning default risk analysis data due to error");
    return defaultRiskAnalysisData;
  }
}
