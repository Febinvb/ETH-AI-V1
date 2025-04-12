from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

# Models that match the TypeScript interfaces in mockApi.ts

class SignalData(BaseModel):
    signal: Literal["BUY", "SELL", "HOLD"]
    entryPoint: float
    stopLoss: float
    targetPrice: float
    confidence: int
    reasoning: str
    timestamp: str

class PnlHistoryItem(BaseModel):
    date: str
    pnl: float

class PerformanceData(BaseModel):
    winRate: float
    avgPnl: float
    totalTrades: int
    monthlyPnl: float
    pnlHistory: List[PnlHistoryItem]

class TradeData(BaseModel):
    id: str
    date: str
    direction: Literal["BUY", "SELL"]
    entry: float
    exit: float
    pnl: float
    status: Literal["COMPLETED", "OPEN", "CANCELLED"]

class SettingsData(BaseModel):
    autoTrading: bool
    stopLoss: float
    takeProfit: float
    telegramAlerts: bool
    accountType: Literal["futures", "spot"]

class SentimentSource(BaseModel):
    name: str
    score: int
    change: float

class SentimentData(BaseModel):
    overallSentiment: int
    sources: List[SentimentSource]
    lastUpdated: str

class RiskMetric(BaseModel):
    name: str
    value: int
    threshold: int
    description: str
    isHighRisk: bool

class RiskAnalysisData(BaseModel):
    overallRisk: int
    metrics: List[RiskMetric]
    recommendations: List[str]

# Request models for updates
class SettingsUpdate(BaseModel):
    autoTrading: Optional[bool] = None
    stopLoss: Optional[float] = None
    takeProfit: Optional[float] = None
    telegramAlerts: Optional[bool] = None
    accountType: Optional[Literal["futures", "spot"]] = None
