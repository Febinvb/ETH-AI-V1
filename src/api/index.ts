// Export all API functions from a single file for easier imports
export * from "./signal";
export * from "./performance";
export * from "./tradeLog";
export * from "./settings";
export * from "./sentiment";
export * from "./riskAnalysis";

// Re-export types from mockApi for convenience
export type {
  SignalData,
  PerformanceData,
  TradeData,
  SettingsData,
  SentimentData,
  RiskAnalysisData,
} from "./mockApi";
