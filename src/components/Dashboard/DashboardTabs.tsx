import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  BarChart3,
  Settings,
  List,
  Loader2,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { fetchTradeLog, TradeData } from "@/api/mockApi";

// Using TradeData interface from mockApi.ts

interface PerformanceData {
  winRate: number;
  avgPnl: number;
  totalTrades: number;
  pnlHistory: { date: string; pnl: number }[];
}

interface ScannerData {
  rsi: number;
  vwap: { above: boolean; value: number };
  macd: {
    signal: "BULLISH" | "BEARISH" | "NEUTRAL";
    value: number;
    histogram: number;
  };
  volume: { current: number; average: number; increasing: boolean };
  patterns: string[];
}

const DashboardTabs = () => {
  // State for trade log data
  const [tradeLog, setTradeLog] = useState<TradeData[]>([]);
  const [tradeLogLoading, setTradeLogLoading] = useState<boolean>(true);
  const [tradeLogError, setTradeLogError] = useState<string | null>(null);

  // Fetch trade log data on component mount
  useEffect(() => {
    const loadTradeLogData = async () => {
      setTradeLogLoading(true);
      setTradeLogError(null);
      try {
        const data = await fetchTradeLog();
        setTradeLog(data);
      } catch (error) {
        console.error("Error fetching trade log data:", error);
        setTradeLogError("Failed to load trade data. Please try again later.");
      } finally {
        setTradeLogLoading(false);
      }
    };

    loadTradeLogData();
  }, []);

  const [performance, setPerformance] = useState<PerformanceData>({
    winRate: 60,
    avgPnl: 1.24,
    totalTrades: 5,
    pnlHistory: [
      { date: "2023-06-01", pnl: 4.33 },
      { date: "2023-06-02", pnl: 8.2 },
      { date: "2023-06-03", pnl: 6.85 },
      { date: "2023-06-04", pnl: 6.85 },
      { date: "2023-06-05", pnl: 4.97 },
    ],
  });

  const [scanner, setScanner] = useState<ScannerData>({
    rsi: 58.4,
    vwap: { above: true, value: 0.524 },
    macd: { signal: "BULLISH", value: 0.0012, histogram: 0.0005 },
    volume: { current: 1250000, average: 980000, increasing: true },
    patterns: ["Bullish Engulfing", "Support Test"],
  });

  const [settings, setSettings] = useState({
    autoTrading: false,
    stopLoss: 2.5,
    takeProfit: 5.0,
    telegramAlerts: true,
    accountType: "futures",
  });

  // Handler for settings changes
  const handleSettingChange = (setting: keyof typeof settings, value: any) => {
    setSettings((prev) => ({ ...prev, [setting]: value }));
  };

  return (
    <div className="w-full bg-background">
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="tradelog" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Trade Log
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Scanner
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Win Rate</CardTitle>
                <CardDescription>Overall success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{performance.winRate}%</div>
                <Progress value={performance.winRate} className="mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Average PnL</CardTitle>
                <CardDescription>Per trade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {performance.avgPnl > 0 ? "+" : ""}
                  {performance.avgPnl}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Trades</CardTitle>
                <CardDescription>Completed trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {performance.totalTrades}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>PnL History</CardTitle>
              <CardDescription>Cumulative performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance.pnlHistory}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="pnl"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trade Log Tab */}
        <TabsContent value="tradelog">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>Recent trading activity</CardDescription>
            </CardHeader>
            <CardContent>
              {tradeLogLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading trade data...</span>
                </div>
              ) : tradeLogError ? (
                <div className="text-center py-8 text-red-500">
                  <p>{tradeLogError}</p>
                  <button
                    onClick={() => {
                      setTradeLogLoading(true);
                      fetchTradeLog()
                        .then((data) => {
                          setTradeLog(data);
                          setTradeLogError(null);
                        })
                        .catch((err) => {
                          console.error("Error retrying fetch:", err);
                          setTradeLogError(
                            "Failed to load trade data. Please try again later.",
                          );
                        })
                        .finally(() => setTradeLogLoading(false));
                    }}
                    className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Exit</TableHead>
                      <TableHead>PnL (%)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradeLog.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-4 text-muted-foreground"
                        >
                          No trade data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      tradeLog.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell>{trade.date}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {trade.direction === "BUY" ? (
                                <>
                                  <ArrowUpCircle className="h-4 w-4 text-green-500" />
                                  <span>BUY</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownCircle className="h-4 w-4 text-red-500" />
                                  <span>SELL</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>${trade.entry.toFixed(4)}</TableCell>
                          <TableCell>
                            {trade.status === "OPEN"
                              ? "-"
                              : `${trade.exit.toFixed(4)}`}
                          </TableCell>
                          <TableCell
                            className={
                              trade.pnl > 0
                                ? "text-green-500"
                                : trade.pnl < 0
                                  ? "text-red-500"
                                  : ""
                            }
                          >
                            {trade.status === "OPEN"
                              ? "-"
                              : `${trade.pnl > 0 ? "+" : ""}${trade.pnl.toFixed(2)}%`}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                trade.status === "COMPLETED"
                                  ? "default"
                                  : trade.status === "OPEN"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {trade.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scanner Tab */}
        <TabsContent value="scanner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical Indicators</CardTitle>
                <CardDescription>Current market conditions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">RSI (14)</h3>
                    <div className="flex items-center mt-1">
                      <div className="text-xl font-semibold">
                        {scanner.rsi.toFixed(1)}
                      </div>
                      <Badge
                        className="ml-2"
                        variant={
                          scanner.rsi > 70
                            ? "destructive"
                            : scanner.rsi < 30
                              ? "default"
                              : "secondary"
                        }
                      >
                        {scanner.rsi > 70
                          ? "Overbought"
                          : scanner.rsi < 30
                            ? "Oversold"
                            : "Neutral"}
                      </Badge>
                    </div>
                    <Progress value={scanner.rsi} max={100} className="mt-2" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">VWAP</h3>
                    <div className="flex items-center mt-1">
                      <div className="text-xl font-semibold">
                        ${scanner.vwap.value.toFixed(4)}
                      </div>
                      <Badge
                        className="ml-2"
                        variant={scanner.vwap.above ? "default" : "destructive"}
                      >
                        {scanner.vwap.above ? "Above" : "Below"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">MACD</h3>
                    <div className="flex items-center mt-1">
                      <div className="text-xl font-semibold">
                        {scanner.macd.value.toFixed(4)}
                      </div>
                      <Badge
                        className="ml-2"
                        variant={
                          scanner.macd.signal === "BULLISH"
                            ? "default"
                            : scanner.macd.signal === "BEARISH"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {scanner.macd.signal}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Volume</h3>
                    <div className="flex items-center mt-1">
                      <div className="text-xl font-semibold">
                        {(scanner.volume.current / 1000000).toFixed(1)}M
                      </div>
                      <Badge
                        className="ml-2"
                        variant={
                          scanner.volume.increasing ? "default" : "secondary"
                        }
                      >
                        {scanner.volume.increasing
                          ? "Increasing"
                          : "Decreasing"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pattern Recognition</CardTitle>
                <CardDescription>Detected chart patterns</CardDescription>
              </CardHeader>
              <CardContent>
                {scanner.patterns.length > 0 ? (
                  <div className="space-y-2">
                    {scanner.patterns.map((pattern, index) => (
                      <div
                        key={index}
                        className="flex items-center p-2 border rounded-md"
                      >
                        <Badge className="mr-2">{index + 1}</Badge>
                        <span>{pattern}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No patterns detected
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
                <CardDescription>
                  Current trading risk assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">Volatility</h3>
                      <Badge variant="destructive">High</Badge>
                    </div>
                    <Progress value={78} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      30-day price volatility is above average
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">Liquidity</h3>
                      <Badge variant="default">Good</Badge>
                    </div>
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Market liquidity is healthy
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium">
                        Market Correlation
                      </h3>
                      <Badge variant="destructive">High</Badge>
                    </div>
                    <Progress value={82} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      High correlation with BTC movements
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>Recommended risk mitigation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="bg-red-100 p-2 rounded-full">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">Reduce Position Size</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current volatility suggests reducing position size by
                        25%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="bg-amber-100 p-2 rounded-full">
                      <Shield className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium">Tighten Stop Loss</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Set stop loss at 2% instead of current 2.5%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Shield className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Diversify Trading Pairs</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Consider adding ETH or BNB to reduce correlation risk
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Trading Settings</CardTitle>
              <CardDescription>
                Configure your trading parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-trading" className="text-base">
                    Auto Trading
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically execute trades based on signals
                  </p>
                </div>
                <Switch
                  id="auto-trading"
                  checked={settings.autoTrading}
                  onCheckedChange={(checked) =>
                    handleSettingChange("autoTrading", checked)
                  }
                />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="stop-loss" className="text-base">
                      Stop Loss (%)
                    </Label>
                    <span className="text-sm font-medium">
                      {settings.stopLoss}%
                    </span>
                  </div>
                  <Slider
                    id="stop-loss"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={[settings.stopLoss]}
                    onValueChange={(value) =>
                      handleSettingChange("stopLoss", value[0])
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="take-profit" className="text-base">
                      Take Profit (%)
                    </Label>
                    <span className="text-sm font-medium">
                      {settings.takeProfit}%
                    </span>
                  </div>
                  <Slider
                    id="take-profit"
                    min={1}
                    max={20}
                    step={0.5}
                    value={[settings.takeProfit]}
                    onValueChange={(value) =>
                      handleSettingChange("takeProfit", value[0])
                    }
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label htmlFor="telegram-alerts" className="text-base">
                    Telegram Alerts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via Telegram
                  </p>
                </div>
                <Switch
                  id="telegram-alerts"
                  checked={settings.telegramAlerts}
                  onCheckedChange={(checked) =>
                    handleSettingChange("telegramAlerts", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label htmlFor="account-type" className="text-base">
                    Futures Trading
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use Binance Futures account for trading
                  </p>
                </div>
                <Switch
                  id="account-type"
                  checked={settings.accountType === "futures"}
                  onCheckedChange={(checked) =>
                    handleSettingChange(
                      "accountType",
                      checked ? "futures" : "spot",
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardTabs;
