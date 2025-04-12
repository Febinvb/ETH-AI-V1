import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, Info } from "lucide-react";

interface SignalExplainerProps {
  signalType: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasons: string[];
  indicators: {
    name: string;
    value: number;
    contribution: "positive" | "negative" | "neutral";
  }[];
  timeframe?: string;
}

const SignalExplainer = ({
  signalType = "HOLD",
  confidence = 65,
  reasons = [
    "RSI indicates oversold conditions",
    "Price is testing support level",
    "MACD showing bullish crossover",
  ],
  indicators = [
    { name: "RSI", value: 28, contribution: "positive" },
    { name: "MACD", value: 0.0012, contribution: "positive" },
    { name: "VWAP", value: 0.524, contribution: "neutral" },
    { name: "Bollinger", value: -0.85, contribution: "negative" },
  ],
  timeframe = "1h",
}: SignalExplainerProps) => {
  return (
    <Card className="w-full bg-background">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Signal Explanation
          </CardTitle>
          <Badge
            variant={
              signalType === "BUY"
                ? "default"
                : signalType === "SELL"
                  ? "destructive"
                  : "secondary"
            }
            className="text-xs px-2 py-0.5"
          >
            {timeframe}
          </Badge>
        </div>
        <CardDescription>Why the AI recommends this action</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {signalType === "BUY" ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : signalType === "SELL" ? (
              <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
            ) : (
              <Info className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-medium">
              {signalType === "BUY"
                ? "Buy Signal"
                : signalType === "SELL"
                  ? "Sell Signal"
                  : "Hold Position"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Confidence:</span>
            <Badge
              variant={
                confidence > 75
                  ? "default"
                  : confidence > 50
                    ? "secondary"
                    : "outline"
              }
              className="text-xs"
            >
              {confidence}%
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Key Reasons:</h3>
          <div className="space-y-1">
            {reasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="min-w-4 pt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1"></div>
                </div>
                <p className="text-muted-foreground">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Indicator Contributions:</h3>
          <div className="grid grid-cols-2 gap-2">
            {indicators.map((indicator, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
              >
                <span className="text-sm">{indicator.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{indicator.value}</span>
                  <div
                    className={`h-2 w-2 rounded-full ${indicator.contribution === "positive" ? "bg-green-500" : indicator.contribution === "negative" ? "bg-red-500" : "bg-yellow-500"}`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>
            AI predictions are not financial advice. Trade at your own risk.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignalExplainer;
