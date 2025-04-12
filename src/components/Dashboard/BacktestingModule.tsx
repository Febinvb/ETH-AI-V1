import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  Play,
  RotateCcw,
  Calendar,
  ArrowRight,
  Download,
  Settings,
  TrendingUp,
} from "lucide-react";

interface BacktestResult {
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  netProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: {
    date: string;
    type: "BUY" | "SELL";
    entry: number;
    exit: number;
    pnl: number;
  }[];
  equityCurve: { date: string; equity: number }[];
}

const BacktestingModule = () => {
  const [timeframe, setTimeframe] = useState("1h");
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-06-30");
  const [initialCapital, setInitialCapital] = useState(10000);
  const [positionSize, setPositionSize] = useState(10);
  const [stopLoss, setStopLoss] = useState(2.5);
  const [takeProfit, setTakeProfit] = useState(5.0);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useML, setUseML] = useState(true);

  // Mock backtest results
  const [results, setResults] = useState<BacktestResult | null>(null);

  const mockResults: BacktestResult = {
    winRate: 62.5,
    totalTrades: 48,
    profitFactor: 1.85,
    netProfit: 2840,
    maxDrawdown: 12.3,
    sharpeRatio: 1.42,
    trades: [
      {
        date: "2023-01-15",
        type: "BUY",
        entry: 1250.45,
        exit: 1320.78,
        pnl: 5.62,
      },
      {
        date: "2023-01-28",
        type: "SELL",
        entry: 1340.12,
        exit: 1290.34,
        pnl: 3.71,
      },
      {
        date: "2023-02-10",
        type: "BUY",
        entry: 1275.89,
        exit: 1310.45,
        pnl: 2.71,
      },
      {
        date: "2023-02-22",
        type: "SELL",
        entry: 1330.56,
        exit: 1280.23,
        pnl: 3.78,
      },
      {
        date: "2023-03-05",
        type: "BUY",
        entry: 1260.34,
        exit: 1245.67,
        pnl: -1.16,
      },
    ],
    equityCurve: [
      { date: "2023-01-01", equity: 10000 },
      { date: "2023-01-15", equity: 10562 },
      { date: "2023-01-28", equity: 10954 },
      { date: "2023-02-10", equity: 11251 },
      { date: "2023-02-22", equity: 11676 },
      { date: "2023-03-05", equity: 11540 },
      { date: "2023-03-20", equity: 11890 },
      { date: "2023-04-05", equity: 12340 },
      { date: "2023-04-22", equity: 12100 },
      { date: "2023-05-10", equity: 12450 },
      { date: "2023-05-28", equity: 12840 },
    ],
  };

  const runBacktest = () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);

    // Simulate progress updates
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          setResults(mockResults);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const resetBacktest = () => {
    setResults(null);
    setProgress(0);
  };

  return (
    <Card className="w-full bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Strategy Backtesting
        </CardTitle>
        <CardDescription>
          Test your trading strategy against historical data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="results" disabled={!results}>
              Results
            </TabsTrigger>
            <TabsTrigger value="trades" disabled={!results}>
              Trades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger id="timeframe">
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 minute</SelectItem>
                      <SelectItem value="5m">5 minutes</SelectItem>
                      <SelectItem value="15m">15 minutes</SelectItem>
                      <SelectItem value="1h">1 hour</SelectItem>
                      <SelectItem value="4h">4 hours</SelectItem>
                      <SelectItem value="1d">1 day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <div className="flex items-center">
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                      <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <div className="flex items-center">
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                      <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="initialCapital">Initial Capital (USDT)</Label>
                  <Input
                    id="initialCapital"
                    type="number"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="positionSize">Position Size (%)</Label>
                    <span className="text-sm">{positionSize}%</span>
                  </div>
                  <Slider
                    id="positionSize"
                    min={1}
                    max={100}
                    step={1}
                    value={[positionSize]}
                    onValueChange={(value) => setPositionSize(value[0])}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                    <span className="text-sm">{stopLoss}%</span>
                  </div>
                  <Slider
                    id="stopLoss"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={[stopLoss]}
                    onValueChange={(value) => setStopLoss(value[0])}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="takeProfit">Take Profit (%)</Label>
                    <span className="text-sm">{takeProfit}%</span>
                  </div>
                  <Slider
                    id="takeProfit"
                    min={1}
                    max={20}
                    step={0.5}
                    value={[takeProfit]}
                    onValueChange={(value) => setTakeProfit(value[0])}
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label htmlFor="use-ml" className="text-base">
                      Use ML Model
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enhance signals with machine learning
                    </p>
                  </div>
                  <Switch
                    id="use-ml"
                    checked={useML}
                    onCheckedChange={setUseML}
                  />
                </div>
              </div>
            </div>

            {isRunning ? (
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Running backtest...</span>
                  <span className="text-sm">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            ) : (
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={resetBacktest}
                  disabled={!results}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={runBacktest}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            {results && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Win Rate
                    </div>
                    <div className="text-2xl font-bold">{results.winRate}%</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Total Trades
                    </div>
                    <div className="text-2xl font-bold">
                      {results.totalTrades}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Profit Factor
                    </div>
                    <div className="text-2xl font-bold">
                      {results.profitFactor}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Net Profit
                    </div>
                    <div className="text-2xl font-bold text-green-500">
                      +${results.netProfit}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Max Drawdown
                    </div>
                    <div className="text-2xl font-bold text-red-500">
                      {results.maxDrawdown}%
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Sharpe Ratio
                    </div>
                    <div className="text-2xl font-bold">
                      {results.sharpeRatio}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-sm font-medium mb-2">Equity Curve</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results.equityCurve}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="equity"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Optimize Parameters
                  </Button>
                  <Button variant="secondary">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trades">
            {results && (
              <div className="space-y-4">
                <div className="border rounded-md">
                  <div className="grid grid-cols-5 font-medium text-sm p-2 border-b bg-muted/50">
                    <div>Date</div>
                    <div>Type</div>
                    <div>Entry</div>
                    <div>Exit</div>
                    <div>PnL (%)</div>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {results.trades.map((trade, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-5 text-sm p-2 border-b last:border-0"
                      >
                        <div>{trade.date}</div>
                        <div>
                          <Badge
                            variant={
                              trade.type === "BUY" ? "default" : "destructive"
                            }
                          >
                            {trade.type}
                          </Badge>
                        </div>
                        <div>${trade.entry.toFixed(2)}</div>
                        <div>${trade.exit.toFixed(2)}</div>
                        <div
                          className={
                            trade.pnl > 0 ? "text-green-500" : "text-red-500"
                          }
                        >
                          {trade.pnl > 0 ? "+" : ""}
                          {trade.pnl.toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Trade List
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BacktestingModule;
