import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowUp,
  ArrowDown,
  Twitter,
  Globe,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import { fetchSentiment } from "@/api/sentiment";

interface SentimentSource {
  name: string;
  score: number;
  change: number;
  icon: React.ReactNode;
}

interface MarketSentimentProps {
  overallSentiment?: number;
  sources?: SentimentSource[];
}

const MarketSentiment = ({
  overallSentiment: initialOverallSentiment = 65,
  sources: initialSources = [
    {
      name: "Social Media",
      score: 72,
      change: 5.3,
      icon: <Twitter className="h-4 w-4" />,
    },
    {
      name: "News Articles",
      score: 58,
      change: -2.1,
      icon: <Globe className="h-4 w-4" />,
    },
    {
      name: "Trading Volume",
      score: 81,
      change: 12.7,
      icon: <BarChart2 className="h-4 w-4" />,
    },
  ],
}: MarketSentimentProps) => {
  const [loading, setLoading] = useState(false);
  const [sentimentData, setSentimentData] = useState({
    overallSentiment: initialOverallSentiment,
    sources: initialSources || [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchSentiment();
        setSentimentData(data);
        console.log("Live sentiment data fetched:", data);
      } catch (error) {
        console.error("Error fetching sentiment data:", error);
        // Keep using the initial data if there's an error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  const getSentimentLabel = (score: number) => {
    if (score >= 75) return { label: "Bullish", variant: "default" };
    if (score >= 60) return { label: "Slightly Bullish", variant: "default" };
    if (score >= 40) return { label: "Neutral", variant: "secondary" };
    if (score >= 25)
      return { label: "Slightly Bearish", variant: "destructive" };
    return { label: "Bearish", variant: "destructive" };
  };

  const overallSentimentInfo = getSentimentLabel(
    sentimentData.overallSentiment,
  );

  return (
    <Card className="bg-background">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Market Sentiment Analysis</CardTitle>
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
              Fetching live sentiment data...
            </p>
          </div>
        ) : (
          <>
            {/* Overall Sentiment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Overall ETH Sentiment</h3>
                <Badge variant={overallSentimentInfo.variant as any}>
                  {overallSentimentInfo.label}
                </Badge>
              </div>
              <Progress
                value={sentimentData.overallSentiment}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Bearish</span>
                <span>Neutral</span>
                <span>Bullish</span>
              </div>
            </div>

            {/* Sentiment Sources */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Sentiment Sources</h3>
              <div className="space-y-3">
                {(sentimentData.sources || []).map((source, index) => {
                  const sentimentInfo = getSentimentLabel(source.score);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-background p-2 rounded-full">
                          {source.icon}
                        </div>
                        <div>
                          <p className="font-medium">{source.name}</p>
                          <Badge
                            variant={sentimentInfo.variant as any}
                            className="mt-1"
                          >
                            {sentimentInfo.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{source.score}%</p>
                        <div
                          className={`flex items-center ${source.change > 0 ? "text-green-500" : "text-red-500"}`}
                        >
                          {source.change > 0 ? (
                            <ArrowUp className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 mr-1" />
                          )}
                          <span className="text-xs">
                            {Math.abs(source.change).toFixed(1)}%
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

export default MarketSentiment;
