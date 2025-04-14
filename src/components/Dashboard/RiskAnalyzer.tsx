import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
  Clock,
  Pause,
  Play,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchRiskAnalysis, RiskAnalysisData } from "@/api/riskAnalysis";

interface RiskAnalyzerProps {
  symbol?: string;
  refreshInterval?: number; // in milliseconds
  initialAutoRefresh?: boolean;
}

const RiskAnalyzer = ({
  symbol = "ETHUSDT",
  refreshInterval = 60000, // Default to 1 minute
  initialAutoRefresh = false,
}: RiskAnalyzerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskData, setRiskData] = useState<RiskAnalysisData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const [nextRefreshIn, setNextRefreshIn] = useState(refreshInterval / 1000);
  const refreshTimerRef = React.useRef<number | null>(null);
  const countdownTimerRef = React.useRef<number | null>(null);

  const fetchRiskData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[RiskAnalyzer] Fetching risk analysis data...");
      const data = await fetchRiskAnalysis();
      setRiskData(data);
      console.log("[RiskAnalyzer] Risk analysis data fetched:", data);
    } catch (error) {
      console.error("[RiskAnalyzer] Error fetching risk analysis data:", error);
      setError(
        `Failed to fetch risk analysis data. ${error instanceof Error ? error.message : "Please try again."}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch risk data on component mount and when symbol changes
  useEffect(() => {
    fetchRiskData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

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
      refreshTimerRef.current = window.setInterval(() => {
        fetchRiskData();
      }, refreshInterval);

      // Set up the countdown timer
      countdownTimerRef.current = window.setInterval(() => {
        setNextRefreshIn((prev) => {
          if (prev <= 1) {
            return refreshInterval / 1000;
          }
          return prev - 1;
        });
      }, 1000);

      // Initialize countdown
      setNextRefreshIn(refreshInterval / 1000);
    } else if (!autoRefresh) {
      // Reset countdown when auto-refresh is disabled
      setNextRefreshIn(refreshInterval / 1000);
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
  }, [autoRefresh, refreshInterval, loading]);

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchRiskData();
    if (autoRefresh) {
      setNextRefreshIn(refreshInterval / 1000);
    }
  };

  const getRiskLevelColor = (level: "LOW" | "MEDIUM" | "HIGH") => {
    switch (level) {
      case "LOW":
        return "text-green-500";
      case "MEDIUM":
        return "text-amber-500";
      case "HIGH":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskLevelBadge = (level: "LOW" | "MEDIUM" | "HIGH") => {
    switch (level) {
      case "LOW":
        return { label: "Low Risk", variant: "default" };
      case "MEDIUM":
        return { label: "Medium Risk", variant: "secondary" };
      case "HIGH":
        return { label: "High Risk", variant: "destructive" };
      default:
        return { label: "Unknown", variant: "outline" };
    }
  };

  return (
    <Card className="w-full trading-card-gradient" gradient glowing>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Risk Analysis</CardTitle>
          <div className="flex items-center gap-2">
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
                    type="button"
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
              type="button"
              className="p-1 rounded-full hover:bg-muted transition-colors"
              title="Refresh risk data"
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
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2 animate-pulse-glow" />
            <p className="text-sm text-muted-foreground">
              Analyzing market risks...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button
              onClick={handleRefresh}
              type="button"
              className="px-4 py-2 bg-gradient-primary text-primary-foreground rounded-md text-sm hover:shadow-md transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        ) : riskData ? (
          <>
            {/* Overall Risk Level */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Overall Risk Level</h3>
                <Badge
                  variant={getRiskLevelBadge(riskData.riskLevel).variant as any}
                >
                  {getRiskLevelBadge(riskData.riskLevel).label}
                </Badge>
              </div>
              <Progress
                value={
                  riskData.riskLevel === "LOW"
                    ? 25
                    : riskData.riskLevel === "MEDIUM"
                      ? 50
                      : 85
                }
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Max Drawdown</span>
                  <span className="text-sm font-bold text-red-500">
                    {riskData.maxDrawdown.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(100, riskData.maxDrawdown * 2)}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sharpe Ratio</span>
                  <span
                    className={`text-sm font-bold ${riskData.sharpeRatio > 1 ? "text-green-500" : "text-amber-500"}`}
                  >
                    {riskData.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, riskData.sharpeRatio * 33)}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Volatility</span>
                  <span className="text-sm font-bold text-amber-500">
                    {riskData.volatility.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(100, riskData.volatility * 3)}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk/Reward Ratio</span>
                  <span
                    className={`text-sm font-bold ${riskData.riskRewardRatio > 2 ? "text-green-500" : "text-amber-500"}`}
                  >
                    {riskData.riskRewardRatio.toFixed(1)}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, riskData.riskRewardRatio * 20)}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Win/Loss Ratio</span>
                  <span
                    className={`text-sm font-bold ${riskData.winLossRatio > 1.5 ? "text-green-500" : "text-amber-500"}`}
                  >
                    {riskData.winLossRatio.toFixed(1)}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, riskData.winLossRatio * 33)}
                  className="h-2"
                />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Recommendations */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                Risk Management Recommendations
              </h3>
              <div className="space-y-3">
                {riskData.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-gradient-secondary transition-all duration-300"
                  >
                    <div className="bg-gradient-primary p-2 rounded-full mt-1 shadow-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Clock className="h-8 w-8 text-yellow-500 mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              No risk data available. Please try refreshing.
            </p>
            <button
              onClick={handleRefresh}
              type="button"
              className="px-4 py-2 bg-gradient-primary text-primary-foreground rounded-md text-sm hover:shadow-md transition-all duration-300"
            >
              Refresh
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskAnalyzer;
