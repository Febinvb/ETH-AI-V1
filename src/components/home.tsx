import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Settings,
  ChevronDown,
  BarChart2,
  List,
  LineChart,
} from "lucide-react";
import SynchronizedTradingDashboard from "./Dashboard/SynchronizedTradingDashboard";
import MarketSentiment from "./Dashboard/MarketSentiment";
import { getPerformance, PerformanceData } from "@/api/performance";

const Home = () => {
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch performance data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load performance data from real API
        const perfData = await getPerformance();
        setPerformanceData(perfData);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setError("Failed to load initial data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-dashboard flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-primary rounded-full w-10 h-10 flex items-center justify-center shadow-md">
              <LineChart className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              ETH AI Trading Agent
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex shadow-sm hover:shadow transition-all"
            >
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex shadow-sm hover:shadow transition-all"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="trading"
              size="sm"
              className="shadow-md hover:shadow-lg transition-all"
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trading Dashboard */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-none shadow-lg">
              <CardContent className="p-0">
                <SynchronizedTradingDashboard
                  initialSymbol="ETHUSDT"
                  initialTimeframe="15m"
                />
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-3 lg:col-start-1">
            <Card gradient glowing className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-card/50 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-border/30 transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Win Rate
                    </p>
                    <p className="text-3xl font-bold">
                      {loading
                        ? "Loading..."
                        : performanceData
                          ? `${performanceData.winRate}%`
                          : "--"}
                    </p>
                  </div>
                  <div className="bg-card/50 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-border/30 transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Total Trades
                    </p>
                    <p className="text-3xl font-bold">
                      {loading
                        ? "Loading..."
                        : performanceData
                          ? performanceData.totalTrades
                          : "--"}
                    </p>
                  </div>
                  <div className="bg-card/50 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-border/30 transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Avg. PnL
                    </p>
                    <p className="text-3xl font-bold text-trading-profit">
                      {loading
                        ? "Loading..."
                        : performanceData
                          ? `+${performanceData.avgPnl}%`
                          : "--"}
                    </p>
                  </div>
                  <div className="bg-card/50 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-border/30 transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Monthly PnL
                    </p>
                    <p className="text-3xl font-bold text-trading-profit">
                      {loading
                        ? "Loading..."
                        : performanceData
                          ? `+${performanceData.monthlyPnl}%`
                          : "--"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market Sentiment Analysis */}
          <div className="lg:col-span-2">
            <Card gradient glowing className="h-full border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">
                  Market Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MarketSentiment />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card gradient glowing className="h-full border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 backdrop-blur-sm border border-border/30 shadow-sm">
                    <span className="text-sm font-medium">Auto Trading</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shadow-sm hover:shadow transition-all"
                    >
                      Disabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 backdrop-blur-sm border border-border/30 shadow-sm">
                    <span className="text-sm font-medium">Telegram Alerts</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shadow-sm hover:shadow transition-all"
                    >
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 backdrop-blur-sm border border-border/30 shadow-sm">
                    <span className="text-sm font-medium">Risk Level</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shadow-sm hover:shadow transition-all"
                    >
                      Medium <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="trading"
                    className="w-full mt-6 shadow-md hover:shadow-lg transition-all"
                  >
                    <BarChart2 className="mr-2 h-4 w-4" />
                    View Detailed Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="max-w-2xl mx-auto">
            ETH AI Trading Agent © 2023 | Disclaimer: Trading involves risk.
            Past performance is not indicative of future results.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
