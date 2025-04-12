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
} from "lucide-react";
import { fetchRiskAnalysis } from "@/api/riskAnalysis";

interface RiskMetric {
  name: string;
  value: number;
  threshold: number;
  description: string;
  isHighRisk: boolean;
}

interface RiskAnalyzerProps {
  overallRisk?: number;
  metrics?: RiskMetric[];
}

const RiskAnalyzer = ({
  overallRisk: initialOverallRisk = 42,
  metrics: initialMetrics = [
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
}: RiskAnalyzerProps) => {
  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState({
    overallRisk: initialOverallRisk,
    metrics: initialMetrics || [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchRiskAnalysis();
        setRiskData(data);
        console.log("Live risk analysis data fetched:", data);
      } catch (error) {
        console.error("Error fetching risk analysis data:", error);
        // Keep using the initial data if there's an error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  const getRiskLabel = (score: number) => {
    if (score >= 75) return { label: "High Risk", variant: "destructive" };
    if (score >= 50) return { label: "Medium Risk", variant: "secondary" };
    return { label: "Low Risk", variant: "default" };
  };

  const overallRiskInfo = getRiskLabel(riskData.overallRisk);

  return (
    <Card className="bg-background">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Risk Analysis</CardTitle>
          {loading && (
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">
              Fetching live risk analysis data...
            </p>
          </div>
        ) : (
          <>
            {/* Overall Risk */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Overall Risk Level</h3>
                <Badge variant={overallRiskInfo.variant as any}>
                  {overallRiskInfo.label}
                </Badge>
              </div>
              <Progress value={riskData.overallRisk} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Risk Metrics</h3>
              <div className="space-y-3">
                {(riskData.metrics || []).map((metric, index) => {
                  const icon = metric.isHighRisk ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Info className="h-4 w-4 text-blue-500" />
                  );

                  return (
                    <div
                      key={index}
                      className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-background p-2 rounded-full mt-1">
                          {icon}
                        </div>
                        <div>
                          <p className="font-medium">{metric.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {metric.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{metric.value}%</p>
                        <div
                          className={`flex items-center ${metric.value > metric.threshold ? "text-red-500" : "text-green-500"}`}
                        >
                          {metric.value > metric.threshold ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          <span className="text-xs">
                            {Math.abs(metric.value - metric.threshold)}%{" "}
                            {metric.value > metric.threshold
                              ? "above"
                              : "below"}{" "}
                            threshold
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RiskAnalyzer;
