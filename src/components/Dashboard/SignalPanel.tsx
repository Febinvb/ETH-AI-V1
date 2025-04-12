import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  Percent,
  Target,
  ArrowDown,
  ArrowUp,
  Clock,
  RefreshCw,
  Pause,
  Play,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSignal, SignalData, refreshSignal } from "@/api/signal";

interface SignalPanelProps {
  signal?: "BUY" | "SELL" | "HOLD";
  entryPoint?: number;
  stopLoss?: number;
  targetPrice?: number;
  confidence?: number;
  reasoning?: string;
  timestamp?: string;
  timeframe?: string;
  symbol?: string; // Added symbol prop
  signalData?: SignalData;
  autoRefreshInterval?: number; // Time in milliseconds between auto-refreshes
  initialAutoRefresh?: boolean; // Whether auto-refresh is initially enabled
  onSymbolChange?: (symbol: string) => void; // Callback when symbol changes
}

const SignalPanel = ({
  signal: initialSignal = "HOLD",
  entryPoint: initialEntryPoint = 0.5123,
  stopLoss: initialStopLoss = 0.4987,
  targetPrice: initialTargetPrice = 0.5432,
  confidence: initialConfidence = 78,
  reasoning:
    initialReasoning = "Bullish divergence on RSI with increasing volume and MACD crossover. Support level at $0.50 holding strong.",
  timestamp: initialTimestamp = "2023-07-21 14:32:05",
  timeframe = "15m",
  symbol = "ETHUSDT", // Default symbol
  signalData,
  autoRefreshInterval = 60000, // Default to 1 minute refresh interval
  initialAutoRefresh = false, // Default to auto-refresh disabled
  onSymbolChange,
}: SignalPanelProps) => {
  const [loading, setLoading] = useState(!signalData);
  const [data, setData] = useState<SignalData>({
    signal: initialSignal,
    entryPoint: initialEntryPoint,
    stopLoss: initialStopLoss,
    targetPrice: initialTargetPrice,
    confidence: initialConfidence,
    reasoning: initialReasoning,
    timestamp: initialTimestamp,
  });
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const [nextRefreshIn, setNextRefreshIn] = useState(
    autoRefreshInterval / 1000,
  );
  const refreshTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  // Fetch signal data on component mount only
  useEffect(() => {
    if (!signalData) {
      const fetchData = async () => {
        setLoading(true);
        try {
          // Pass both timeframe and symbol to getSignal
          console.log(
            `Fetching signal data for ${symbol} with timeframe ${timeframe}`,
          );
          const result = await getSignal(timeframe, symbol);
          setData(result);
          console.log(`Live signal data fetched for ${symbol}:`, result);

          // If we got a "waiting" message, try to refresh once after a short delay
          if (
            result.reasoning.includes("Waiting for live data") ||
            result.confidence === 0
          ) {
            setTimeout(async () => {
              try {
                console.log(
                  `Attempting to refresh signal data after initial "waiting" state`,
                );
                const refreshedResult = await refreshSignal(timeframe, symbol);
                setData(refreshedResult);
                console.log(
                  `Refreshed signal data for ${symbol}:`,
                  refreshedResult,
                );
              } catch (refreshError) {
                console.error(`Error refreshing signal data:`, refreshError);
              }
            }, 1500);
          }
        } catch (error) {
          console.error(`Error fetching signal data for ${symbol}:`, error);
          setError(
            `Failed to fetch signal data for ${symbol}. Please try again.`,
          );
          // Keep previous data if available, otherwise show error in UI
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
    // Only run this effect once on mount and when signalData prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalData]);

  // Update data when signalData prop changes
  useEffect(() => {
    if (signalData) {
      setData(signalData);
    }
  }, [signalData]);

  const getSignalColor = () => {
    switch (data.signal) {
      case "BUY":
        return "bg-green-500";
      case "SELL":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getSignalIcon = () => {
    switch (data.signal) {
      case "BUY":
        return <ArrowUpCircle className="h-6 w-6 text-green-500" />;
      case "SELL":
        return <ArrowDownCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-yellow-500" />;
    }
  };

  const calculatePotentialProfit = () => {
    if (data.signal === "BUY") {
      return (
        ((data.targetPrice - data.entryPoint) / data.entryPoint) *
        100
      ).toFixed(2);
    } else if (data.signal === "SELL") {
      return (
        ((data.entryPoint - data.targetPrice) / data.entryPoint) *
        100
      ).toFixed(2);
    }
    return "0.00";
  };

  const calculateRiskReward = () => {
    if (data.signal === "BUY") {
      const reward = data.targetPrice - data.entryPoint;
      const risk = data.entryPoint - data.stopLoss;
      return (reward / risk).toFixed(2);
    } else if (data.signal === "SELL") {
      const reward = data.entryPoint - data.targetPrice;
      const risk = data.stopLoss - data.entryPoint;
      return (reward / risk).toFixed(2);
    }
    return "0.00";
  };

  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      // Always use refreshSignal to ensure we get fresh data
      const result = await refreshSignal(timeframe, symbol);
      setData(result);
      console.log(`Live signal data refreshed for ${symbol}:`, result);
      // Reset countdown timer if auto-refresh is enabled
      if (autoRefresh) {
        setNextRefreshIn(autoRefreshInterval / 1000);
      }
    } catch (error) {
      console.error(`Error refreshing signal data for ${symbol}:`, error);
      setError(
        `Failed to refresh signal data for ${symbol}. Please try again.`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh timer
  useEffect(() => {
    // Clear any existing timers
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // If auto-refresh is enabled, set up the timers
    if (autoRefresh && !loading) {
      // Set up the refresh timer
      refreshTimerRef.current = window.setInterval(() => {
        handleRefresh();
      }, autoRefreshInterval);

      // Set up the countdown timer
      countdownTimerRef.current = window.setInterval(() => {
        setNextRefreshIn((prev) => {
          if (prev <= 1) {
            return autoRefreshInterval / 1000;
          }
          return prev - 1;
        });
      }, 1000);

      // Initialize countdown
      setNextRefreshIn(autoRefreshInterval / 1000);
    }

    // Cleanup function
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [autoRefresh, autoRefreshInterval, loading]);

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
  };

  // Handle symbol change
  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSymbol = e.target.value;
    if (onSymbolChange) {
      onSymbolChange(newSymbol);
    } else {
      // If no callback is provided, handle the symbol change internally
      setLoading(true);
      setError(null);
      // Always use refreshSignal to get a completely fresh signal for the new symbol
      refreshSignal(timeframe, newSymbol)
        .then((result) => {
          setData(result);
          console.log(`Live signal data refreshed for ${newSymbol}:`, result);
          setLoading(false);
        })
        .catch((error) => {
          console.error(
            `Error refreshing signal data for ${newSymbol}:`,
            error,
          );
          setError(
            `Failed to refresh signal data for ${newSymbol}. Please try again.`,
          );
          setLoading(false);
        });
    }
  };

  return (
    <Card className="w-full bg-card shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold">Current Signal</CardTitle>
            <select
              className="bg-background text-foreground text-sm rounded-md border border-input px-2 py-1"
              value={symbol}
              onChange={handleSymbolChange}
              disabled={loading}
            >
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
              <option value="ADAUSDT">ADA/USDT</option>
              <option value="DOGEUSDT">DOGE/USDT</option>
              <option value="XRPUSDT">XRP/USDT</option>
              <option value="DOTUSDT">DOT/USDT</option>
              <option value="LINKUSDT">LINK/USDT</option>
              <option value="MATICUSDT">MATIC/USDT</option>
              <option value="AVAXUSDT">AVAX/USDT</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {data.timestamp}
            </Badge>

            {autoRefresh && (
              <Badge variant="outline" className="text-xs bg-primary/10">
                Next refresh: {nextRefreshIn}s
              </Badge>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleAutoRefresh}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    {autoRefresh ? (
                      <Pause className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Play className="h-4 w-4 text-green-500" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              title="Refresh signal data"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">
              Fetching live signal data...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {getSignalIcon()}
                <div
                  className={`text-2xl font-bold ${data.signal === "BUY" ? "text-green-500" : data.signal === "SELL" ? "text-red-500" : "text-yellow-500"}`}
                >
                  {data.signal}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Confidence:</span>
                <div className="w-32">
                  <Progress value={data.confidence} className="h-2" />
                </div>
                <span className="text-sm font-semibold">
                  {data.confidence}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground">Entry Point</div>
                <div className="text-lg font-semibold">
                  ${data.entryPoint.toFixed(4)}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground">Stop Loss</div>
                <div className="flex items-center gap-1">
                  <ArrowDown className="h-4 w-4 text-red-500" />
                  <span className="text-lg font-semibold">
                    ${data.stopLoss.toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground">
                  Target Price
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUp className="h-4 w-4 text-green-500" />
                  <span className="text-lg font-semibold">
                    ${data.targetPrice.toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-muted-foreground">
                  Potential Profit
                </div>
                <div className="text-lg font-semibold text-green-500">
                  +{calculatePotentialProfit()}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Risk/Reward Ratio:</span>
              </div>
              <span className="font-semibold">1:{calculateRiskReward()}</span>
            </div>

            <Separator className="my-3" />

            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Signal Reasoning:</span>
              </div>
              <p className="text-sm text-muted-foreground">{data.reasoning}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalPanel;
