import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  Clock,
  Info,
  AlertTriangle,
} from "lucide-react";

interface FeatureImportance {
  feature: string;
  importance: number;
  category: "technical" | "fundamental" | "sentiment";
}

interface PredictionData {
  timestamp: string;
  actual: number;
  predicted: number;
}

interface MLInsight {
  id: string;
  type:
    | "PRICE_MOVEMENT"
    | "VOLATILITY"
    | "TREND_REVERSAL"
    | "SUPPORT_RESISTANCE";
  confidence: number;
  description: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  timeframe: string;
  generatedAt: string;
}

const MLInsights = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1d");
  const [mlEnabled, setMlEnabled] = useState(true);
  const [predictionHorizon, setPredictionHorizon] = useState("24h");

  // Mock data for feature importance
  const featureImportanceData: FeatureImportance[] = [
    { feature: "RSI", importance: 18.5, category: "technical" },
    { feature: "MACD", importance: 15.2, category: "technical" },
    { feature: "Volume", importance: 14.8, category: "technical" },
    { feature: "Bollinger Bands", importance: 12.3, category: "technical" },
    { feature: "Twitter Sentiment", importance: 10.5, category: "sentiment" },
    { feature: "Market Cap", importance: 8.7, category: "fundamental" },
    { feature: "News Sentiment", importance: 7.9, category: "sentiment" },
    { feature: "ETH Gas Price", importance: 6.4, category: "fundamental" },
    { feature: "BTC Correlation", importance: 5.7, category: "fundamental" },
  ];

  // Mock data for prediction accuracy
  const predictionData: PredictionData[] = [
    { timestamp: "2023-06-01", actual: 1850, predicted: 1830 },
    { timestamp: "2023-06-02", actual: 1820, predicted: 1840 },
    { timestamp: "2023-06-03", actual: 1860, predicted: 1870 },
    { timestamp: "2023-06-04", actual: 1890, predicted: 1880 },
    { timestamp: "2023-06-05", actual: 1910, predicted: 1900 },
    { timestamp: "2023-06-06", actual: 1880, predicted: 1890 },
    { timestamp: "2023-06-07", actual: 1920, predicted: 1910 },
    { timestamp: "2023-06-08", actual: 1950, predicted: 1930 },
    { timestamp: "2023-06-09", actual: 1970, predicted: 1960 },
    { timestamp: "2023-06-10", actual: 1990, predicted: 1980 },
  ];

  // Mock data for ML insights
  const mlInsights: MLInsight[] = [
    {
      id: "1",
      type: "PRICE_MOVEMENT",
      confidence: 78,
      description:
        "High probability of 5-8% upward price movement in the next 24 hours based on current market conditions and historical patterns.",
      impact: "HIGH",
      timeframe: "1d",
      generatedAt: "2023-06-15 09:30",
    },
    {
      id: "2",
      type: "SUPPORT_RESISTANCE",
      confidence: 85,
      description:
        "Strong support level detected at $1,820. Price is likely to bounce if it reaches this level.",
      impact: "MEDIUM",
      timeframe: "4h",
      generatedAt: "2023-06-15 10:15",
    },
    {
      id: "3",
      type: "VOLATILITY",
      confidence: 62,
      description:
        "Increased volatility expected in the next 12 hours due to upcoming economic announcements.",
      impact: "MEDIUM",
      timeframe: "1d",
      generatedAt: "2023-06-15 11:45",
    },
    {
      id: "4",
      type: "TREND_REVERSAL",
      confidence: 71,
      description:
        "Potential trend reversal from bearish to bullish detected based on multiple technical indicators and sentiment analysis.",
      impact: "HIGH",
      timeframe: "1d",
      generatedAt: "2023-06-15 14:20",
    },
  ];

  // Calculate prediction accuracy
  const calculateAccuracy = () => {
    let totalError = 0;
    predictionData.forEach((data) => {
      const error = Math.abs(data.actual - data.predicted) / data.actual;
      totalError += error;
    });
    const meanError = (totalError / predictionData.length) * 100;
    return (100 - meanError).toFixed(1);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "PRICE_MOVEMENT":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "VOLATILITY":
        return <BarChart3 className="h-5 w-5 text-yellow-500" />;
      case "TREND_REVERSAL":
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      case "SUPPORT_RESISTANCE":
        return <TrendingDown className="h-5 w-5 text-purple-500" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          ML Insights
        </CardTitle>
        <CardDescription>
          Machine learning-powered market analysis and predictions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="predictions">Price Predictions</TabsTrigger>
            <TabsTrigger value="features">Feature Importance</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select
                  value={selectedTimeframe}
                  onValueChange={setSelectedTimeframe}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">1 Day</SelectItem>
                    <SelectItem value="1w">1 Week</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="text-xs">
                  {mlInsights.length} insights
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="ml-enabled" className="text-sm">
                  ML Enabled
                </Label>
                <Switch
                  id="ml-enabled"
                  checked={mlEnabled}
                  onCheckedChange={setMlEnabled}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {mlInsights
                .filter(
                  (insight) =>
                    insight.timeframe === selectedTimeframe ||
                    selectedTimeframe === "all",
                )
                .map((insight) => (
                  <div
                    key={insight.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getInsightIcon(insight.type)}
                        <div>
                          <h3 className="font-medium">
                            {insight.type.replace("_", " ")}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{insight.generatedAt}</span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={
                          insight.impact === "HIGH"
                            ? "default"
                            : insight.impact === "MEDIUM"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {insight.impact} IMPACT
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>

                    <div className="pt-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Confidence</span>
                        <span className="font-medium">
                          {insight.confidence}%
                        </span>
                      </div>
                      <Progress value={insight.confidence} className="h-1.5" />
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select
                  value={predictionHorizon}
                  onValueChange={setPredictionHorizon}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Prediction Horizon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6h">Next 6 Hours</SelectItem>
                    <SelectItem value="24h">Next 24 Hours</SelectItem>
                    <SelectItem value="7d">Next 7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-xs">
                Accuracy: {calculateAccuracy()}%
              </Badge>
            </div>

            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictionData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Price"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted Price"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
              <AlertTriangle className="h-3 w-3" />
              <span>
                Predictions are based on historical data and may not accurately
                reflect future market movements.
              </span>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={featureImportanceData.sort(
                    (a, b) => b.importance - a.importance,
                  )}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.2}
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis type="number" domain={[0, "dataMax"]} />
                  <YAxis type="category" dataKey="feature" width={100} />
                  <Tooltip />
                  <Bar
                    dataKey="importance"
                    name="Importance (%)"
                    fill={(entry) => {
                      const data = entry as FeatureImportance;
                      return data.category === "technical"
                        ? "#8884d8"
                        : data.category === "sentiment"
                          ? "#82ca9d"
                          : "#ffc658";
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#8884d8]"></div>
                <span className="text-xs">Technical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#82ca9d]"></div>
                <span className="text-xs">Sentiment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ffc658]"></div>
                <span className="text-xs">Fundamental</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2">
              <p>
                Feature importance shows which factors have the most influence
                on the ML model's predictions. Higher percentages indicate
                stronger influence on price predictions.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MLInsights;
