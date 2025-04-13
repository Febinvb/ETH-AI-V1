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
import TradingView from "./Dashboard/TradingView";
import SignalPanel from "./Dashboard/SignalPanel";
import DashboardTabs from "./Dashboard/DashboardTabs";
import MarketSentiment from "./Dashboard/MarketSentiment";
import SyncController from "./Dashboard/SyncController";
import { fetchPerformance, PerformanceData } from "@/api/mockApi";
import { getSignal, SignalData } from "@/api/signal";
const Home = () => {
  const [timeframe, setTimeframe] = useState("1h");
  const [symbol, setSymbol] = useState("BINANCE:ETHUSDT");
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch performance data and initial signal on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load performance data
        const perfData = await fetchPerformance();
        setPerformanceData(perfData);

        // Load initial signal data for ETHUSDT (default)
        const signalData = await getSignal(timeframe, "ETHUSDT");
        setCurrentSignal(signalData);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setError("Failed to load initial data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Handle signal updates from TradingView component
  const handleSignalUpdate = (signal: SignalData) => {
    setCurrentSignal(signal);
  };

  // Handle symbol changes from SignalPanel component
  const handleSymbolChange = (newSymbol: string) => {
    console.log(`Symbol changed to: ${newSymbol}`);
    // Update the symbol in the TradingView component
    const formattedSymbol = `BINANCE:${newSymbol}`;
    setSymbol(formattedSymbol);

    // Extract plain symbol without BINANCE: prefix if present
    const plainSymbol = newSymbol.includes(":")
      ? newSymbol.split(":")[1]
      : newSymbol;

    console.log(`Fetching signal for plain symbol: ${plainSymbol}`);

    // Update the symbol in the binance service to ensure we get data for the new symbol
    import("@/api/signal").then(({ changeSymbol }) => {
      changeSymbol(plainSymbol);
      console.log(`Changed symbol in binance service to: ${plainSymbol}`);
    });

    // Refresh the signal with the new symbol
    setLoading(true);
    setError(null);
    getSignal(timeframe, plainSymbol)
      .then((signal) => {
        console.log(`Signal fetched for ${plainSymbol}:`, signal);
        setCurrentSignal(signal);
        setLoading(false);
      })
      .catch((error) => {
        console.error(`Error fetching signal for ${plainSymbol}:`, error);
        setError(
          `Failed to fetch signal for ${plainSymbol}. Please try again.`,
        );
        setLoading(false);
      });
  };

  // Handle syncing timeframes between chart and signal
  const handleSyncTimeframes = (tf: string) => {
    setTimeframe(tf);
    setLoading(true);
    setError(null);

    // Extract plain symbol without BINANCE: prefix
    const plainSymbol = symbol.includes(":") ? symbol.split(":")[1] : symbol;

    getSignal(tf, plainSymbol)
      .then((signal) => {
        setCurrentSignal(signal);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error syncing timeframes:", error);
        setError(`Failed to sync ${tf} timeframe. Please try again.`);
        setLoading(false);
      });
  };

  // Handle refreshing data
  const handleRefreshData = () => {
    setLoading(true);
    setError(null);

    // Extract plain symbol without BINANCE: prefix
    const plainSymbol = symbol.includes(":") ? symbol.split(":")[1] : symbol;

    getSignal(timeframe, plainSymbol)
      .then((signal) => {
        setCurrentSignal(signal);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error refreshing data:", error);
        setError("Failed to refresh signal data. Please try again.");
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 z-10 bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center">
              <LineChart className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">ETH AI Trading Agent</h1>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="hidden md:flex">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="default" size="sm">
              Connect Wallet
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading View and Controls */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>ETH/USDT Chart</CardTitle>
                  <div className="flex space-x-2">
                    {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
                      <Button
                        key={tf}
                        variant={timeframe === tf ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeframe(tf)}
                      >
                        {tf}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
                    <p className="text-red-800 text-sm">{error}</p>
                    <button
                      onClick={handleRefreshData}
                      className="mt-2 px-3 py-1 bg-red-800 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
                <SyncController
                  chartTimeframe={timeframe}
                  signalTimeframe={
                    currentSignal?.timestamp?.includes(timeframe)
                      ? timeframe
                      : currentSignal
                        ? "unknown"
                        : timeframe
                  }
                  onSyncTimeframes={handleSyncTimeframes}
                  currentSignal={currentSignal}
                  onRefreshData={handleRefreshData}
                />
                <TradingView
                  symbol={symbol}
                  timeframe={timeframe}
                  onSignalUpdate={handleSignalUpdate}
                  onSymbolChange={handleSymbolChange}
                />
              </CardContent>
            </Card>

            {/* Dashboard Tabs */}
            <Card>
              <CardContent className="p-0">
                <DashboardTabs />
              </CardContent>
            </Card>
          </div>

          {/* Signal Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Signal</CardTitle>
              </CardHeader>
              <CardContent>
                <SignalPanel
                  signalData={currentSignal}
                  timeframe={timeframe}
                  onSymbolChange={handleSymbolChange}
                />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">
                      {loading
                        ? "Loading..."
                        : performanceData
                          ? `${performanceData.winRate}%`
                          : "--"}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      Total Trades
                    </p>
                    <p className="text-2xl font-bold">
                      {loading
                        ? "Loading..."
                        : performanceData
                          ? performanceData.totalTrades
                          : "--"}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Avg. PnL</p>
                    <p className="text-2xl font-bold text-green-500">
                      {loading
                        ? "Loading..."
                        : performanceData
                          ? `+${performanceData.avgPnl}%`
                          : "--"}
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Monthly PnL</p>
                    <p className="text-2xl font-bold text-green-500">
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

            {/* Market Sentiment Analysis */}
            <MarketSentiment />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Auto Trading</span>
                    <Button variant="outline" size="sm">
                      Disabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Telegram Alerts</span>
                    <Button variant="outline" size="sm">
                      Enabled
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Risk Level</span>
                    <Button variant="outline" size="sm">
                      Medium <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <Button className="w-full mt-4">
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
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            ETH AI Trading Agent © 2023 | Disclaimer: Trading involves risk.
            Past performance is not indicative of future results.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
