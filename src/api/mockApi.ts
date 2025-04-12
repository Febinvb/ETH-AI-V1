// Mock API endpoints for the XRP AI Trading Agent dashboard

// Types
export interface SignalData {
  signal: "BUY" | "SELL" | "HOLD";
  entryPoint: number;
  stopLoss: number;
  targetPrice: number;
  confidence: number;
  reasoning: string;
  timestamp: string;
}

export interface PerformanceData {
  winRate: number;
  avgPnl: number;
  totalTrades: number;
  monthlyPnl: number;
  pnlHistory: { date: string; pnl: number }[];
}

export interface TradeData {
  id: string;
  date: string;
  direction: "BUY" | "SELL";
  entry: number;
  exit: number;
  pnl: number;
  status: "COMPLETED" | "OPEN" | "CANCELLED";
}

export interface SettingsData {
  autoTrading: boolean;
  stopLoss?: number;
  stopLossPercentage?: number;
  takeProfit?: number;
  takeProfitPercentage?: number;
  telegramAlerts: boolean;
  accountType?: "futures" | "spot";
  riskLevel?: string;
  tradingPair?: string;
  apiKeyConfigured?: boolean;
  lastUpdated?: string;
}

export interface SentimentData {
  overallSentiment?: number;
  marketSentiment?: string;
  sentimentScore?: number;
  bullishFactors?: string[];
  bearishFactors?: string[];
  sources?: {
    name: string;
    score: number;
    change: number;
  }[];
  lastUpdated: string;
}

export interface RiskAnalysisData {
  overallRisk: number;
  metrics: {
    name: string;
    value: number;
    threshold: number;
    description: string;
    isHighRisk: boolean;
  }[];
  recommendations: string[];
}

// Mock data
const mockSignalData: Record<string, SignalData> = {
  default: {
    signal: "SELL",
    entryPoint: 1589.9,
    stopLoss: 1610.5,
    targetPrice: 1550.0,
    confidence: 81,
    reasoning:
      "Hourly chart showing bearish divergence on RSI. Price rejected at key resistance level with increasing sell volume.",
    timestamp: "2023-07-21 14:00:00 (1h)",
  },
  "1m": {
    signal: "SELL",
    entryPoint: 1589.9,
    stopLoss: 1595.0,
    targetPrice: 1580.0,
    confidence: 65,
    reasoning:
      "Short-term momentum showing downward pressure with increasing sell volume.",
    timestamp: "2023-07-21 14:45:12 (1m)",
  },
  "5m": {
    signal: "SELL",
    entryPoint: 1589.9,
    stopLoss: 1600.0,
    targetPrice: 1570.0,
    confidence: 72,
    reasoning:
      "Price breaking below 5-minute support with strong volume confirmation. MACD showing bearish crossover.",
    timestamp: "2023-07-21 14:40:05 (5m)",
  },
  "15m": {
    signal: "SELL",
    entryPoint: 1589.9,
    stopLoss: 1605.0,
    targetPrice: 1560.0,
    confidence: 78,
    reasoning:
      "15-minute chart showing clear downtrend with lower highs. RSI indicating bearish momentum.",
    timestamp: "2023-07-21 14:32:05 (15m)",
  },
  "1h": {
    signal: "SELL",
    entryPoint: 1589.9,
    stopLoss: 1610.5,
    targetPrice: 1550.0,
    confidence: 81,
    reasoning:
      "Hourly chart showing bearish divergence on RSI. Price rejected at key resistance level with increasing sell volume.",
    timestamp: "2023-07-21 14:00:00 (1h)",
  },
  "4h": {
    signal: "SELL",
    entryPoint: 1589.9,
    stopLoss: 1620.0,
    targetPrice: 1540.0,
    confidence: 85,
    reasoning:
      "4-hour chart showing clear bearish pattern with decreasing buy volume. Multiple resistance rejections.",
    timestamp: "2023-07-21 12:00:00 (4h)",
  },
  "1d": {
    signal: "HOLD",
    entryPoint: 1589.9,
    stopLoss: 1550.0,
    targetPrice: 1650.0,
    confidence: 60,
    reasoning:
      "Daily chart showing consolidation pattern. Waiting for clear breakout direction.",
    timestamp: "2023-07-21 00:00:00 (1d)",
  },
};

const mockPerformanceData: PerformanceData = {
  winRate: 68.5,
  avgPnl: 2.4,
  totalTrades: 124,
  monthlyPnl: 18.7,
  pnlHistory: [
    { date: "2023-06-01", pnl: 4.33 },
    { date: "2023-06-02", pnl: 8.2 },
    { date: "2023-06-03", pnl: 6.85 },
    { date: "2023-06-04", pnl: 6.85 },
    { date: "2023-06-05", pnl: 4.97 },
    { date: "2023-06-06", pnl: 7.25 },
    { date: "2023-06-07", pnl: 10.5 },
    { date: "2023-06-08", pnl: 12.8 },
    { date: "2023-06-09", pnl: 11.2 },
    { date: "2023-06-10", pnl: 14.5 },
    { date: "2023-06-11", pnl: 13.8 },
    { date: "2023-06-12", pnl: 16.2 },
    { date: "2023-06-13", pnl: 15.4 },
    { date: "2023-06-14", pnl: 18.7 },
  ],
};

const mockTradeLogData: TradeData[] = [
  {
    id: "1",
    date: "2023-06-01 14:30",
    direction: "BUY",
    entry: 0.5123,
    exit: 0.5345,
    pnl: 4.33,
    status: "COMPLETED",
  },
  {
    id: "2",
    date: "2023-06-02 09:15",
    direction: "SELL",
    entry: 0.542,
    exit: 0.521,
    pnl: 3.87,
    status: "COMPLETED",
  },
  {
    id: "3",
    date: "2023-06-03 11:45",
    direction: "BUY",
    entry: 0.518,
    exit: 0.511,
    pnl: -1.35,
    status: "COMPLETED",
  },
  {
    id: "4",
    date: "2023-06-04 16:20",
    direction: "BUY",
    entry: 0.523,
    exit: 0,
    pnl: 0,
    status: "OPEN",
  },
  {
    id: "5",
    date: "2023-06-05 10:05",
    direction: "SELL",
    entry: 0.531,
    exit: 0.541,
    pnl: -1.88,
    status: "COMPLETED",
  },
  {
    id: "6",
    date: "2023-06-06 13:45",
    direction: "BUY",
    entry: 0.525,
    exit: 0.538,
    pnl: 2.48,
    status: "COMPLETED",
  },
  {
    id: "7",
    date: "2023-06-07 15:30",
    direction: "BUY",
    entry: 0.54,
    exit: 0.552,
    pnl: 2.22,
    status: "COMPLETED",
  },
  {
    id: "8",
    date: "2023-06-08 09:20",
    direction: "SELL",
    entry: 0.549,
    exit: 0,
    pnl: 0,
    status: "OPEN",
  },
];

const mockSettingsData: SettingsData = {
  autoTrading: false,
  stopLoss: 2.5,
  takeProfit: 5.0,
  telegramAlerts: true,
  accountType: "futures",
};

const mockSentimentData: SentimentData = {
  overallSentiment: 65,
  sources: [
    { name: "Social Media", score: 72, change: 5.3 },
    { name: "News Articles", score: 58, change: -2.1 },
    { name: "Trading Volume", score: 81, change: 12.7 },
  ],
  lastUpdated: "2023-07-21 15:30:00",
};

const mockRiskAnalysisData: RiskAnalysisData = {
  overallRisk: 42,
  metrics: [
    {
      name: "Volatility",
      value: 68,
      threshold: 60,
      description: "30-day price volatility is above average",
      isHighRisk: true,
    },
    {
      name: "Liquidity",
      value: 75,
      threshold: 40,
      description: "Market liquidity is healthy",
      isHighRisk: false,
    },
    {
      name: "Market Correlation",
      value: 82,
      threshold: 70,
      description: "High correlation with BTC movements",
      isHighRisk: true,
    },
    {
      name: "Support Strength",
      value: 65,
      threshold: 50,
      description: "Multiple support levels identified",
      isHighRisk: false,
    },
  ],
  recommendations: [
    "Reduce position size by 25%",
    "Tighten stop loss to 2%",
    "Consider diversifying into other trading pairs",
  ],
};

// API functions
export const fetchSignal = async (
  timeframe: string = "15m",
): Promise<SignalData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return signal data based on timeframe
  return mockSignalData[timeframe] || mockSignalData.default;
};

export const fetchPerformance = async (): Promise<PerformanceData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 700));

  return mockPerformanceData;
};

export const fetchTradeLog = async (): Promise<TradeData[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  return mockTradeLogData;
};

export const fetchSettings = async (): Promise<SettingsData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  return mockSettingsData;
};

export const updateSettings = async (
  settings: Partial<SettingsData>,
): Promise<SettingsData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Update mock settings
  Object.assign(mockSettingsData, settings);

  return mockSettingsData;
};

export const fetchSentiment = async (): Promise<SentimentData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  return mockSentimentData;
};

export const fetchRiskAnalysis = async (): Promise<RiskAnalysisData> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 550));

  return mockRiskAnalysisData;
};
