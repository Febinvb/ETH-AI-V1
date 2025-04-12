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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Briefcase,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  PieChart as PieChartIcon,
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  ticker: string;
  allocation: number;
  risk: number;
  expectedReturn: number;
  color: string;
}

const PortfolioOptimizer = () => {
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: "1",
      name: "Ethereum",
      ticker: "ETH",
      allocation: 40,
      risk: 65,
      expectedReturn: 12.5,
      color: "#8884d8",
    },
    {
      id: "2",
      name: "Bitcoin",
      ticker: "BTC",
      allocation: 30,
      risk: 55,
      expectedReturn: 10.2,
      color: "#F7931A",
    },
    {
      id: "3",
      name: "Solana",
      ticker: "SOL",
      allocation: 15,
      risk: 75,
      expectedReturn: 18.7,
      color: "#00FFA3",
    },
    {
      id: "4",
      name: "USDT",
      ticker: "USDT",
      allocation: 15,
      risk: 5,
      expectedReturn: 3.5,
      color: "#26A17B",
    },
  ]);

  const [newAsset, setNewAsset] = useState({
    name: "",
    ticker: "",
    allocation: 10,
  });

  const [riskTolerance, setRiskTolerance] = useState(50);
  const [optimized, setOptimized] = useState(false);

  const totalAllocation = assets.reduce(
    (sum, asset) => sum + asset.allocation,
    0,
  );
  const isValidAllocation = totalAllocation === 100;

  const portfolioRisk = assets.reduce(
    (sum, asset) => sum + (asset.risk * asset.allocation) / 100,
    0,
  );

  const portfolioReturn = assets.reduce(
    (sum, asset) => sum + (asset.expectedReturn * asset.allocation) / 100,
    0,
  );

  const handleAddAsset = () => {
    if (newAsset.name && newAsset.ticker) {
      // Generate a random color
      const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

      const newAssetWithDetails: Asset = {
        id: Date.now().toString(),
        name: newAsset.name,
        ticker: newAsset.ticker.toUpperCase(),
        allocation: newAsset.allocation,
        risk: Math.floor(Math.random() * 70) + 10, // Random risk between 10-80
        expectedReturn: Math.floor(Math.random() * 15) + 5, // Random return between 5-20
        color: randomColor,
      };

      setAssets([...assets, newAssetWithDetails]);
      setNewAsset({ name: "", ticker: "", allocation: 10 });
    }
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter((asset) => asset.id !== id));
  };

  const handleAllocationChange = (id: string, value: number) => {
    setAssets(
      assets.map((asset) =>
        asset.id === id ? { ...asset, allocation: value } : asset,
      ),
    );
  };

  const optimizePortfolio = () => {
    // In a real implementation, this would use an algorithm like Modern Portfolio Theory
    // For this demo, we'll just simulate an optimization

    // Higher risk tolerance = more allocation to higher return assets
    const optimizedAssets = [...assets].map((asset) => {
      let newAllocation;

      if (riskTolerance > 70) {
        // High risk tolerance - allocate more to high-return assets
        newAllocation = Math.round((asset.expectedReturn / 10) * 20);
      } else if (riskTolerance > 40) {
        // Medium risk tolerance - balanced allocation
        newAllocation = Math.round((asset.expectedReturn / asset.risk) * 50);
      } else {
        // Low risk tolerance - allocate more to low-risk assets
        newAllocation = Math.round((1 / asset.risk) * 200);
      }

      return { ...asset, allocation: newAllocation };
    });

    // Normalize allocations to sum to 100%
    const totalNewAllocation = optimizedAssets.reduce(
      (sum, asset) => sum + asset.allocation,
      0,
    );

    const normalizedAssets = optimizedAssets.map((asset) => ({
      ...asset,
      allocation: Math.round((asset.allocation / totalNewAllocation) * 100),
    }));

    // Adjust to ensure total is exactly 100%
    let adjustedAssets = [...normalizedAssets];
    const adjustedTotal = adjustedAssets.reduce(
      (sum, asset) => sum + asset.allocation,
      0,
    );

    if (adjustedTotal !== 100) {
      const diff = 100 - adjustedTotal;
      // Add the difference to the largest allocation
      const largestAllocationIndex = adjustedAssets.reduce(
        (maxIndex, asset, index, array) =>
          asset.allocation > array[maxIndex].allocation ? index : maxIndex,
        0,
      );

      adjustedAssets[largestAllocationIndex].allocation += diff;
    }

    setAssets(adjustedAssets);
    setOptimized(true);
  };

  return (
    <Card className="w-full bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Portfolio Optimizer
        </CardTitle>
        <CardDescription>
          Optimize your crypto portfolio allocation based on risk tolerance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Current Allocation</h3>
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: asset.color }}
                        ></div>
                        <span className="text-sm font-medium">
                          {asset.name} ({asset.ticker})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{asset.allocation}%</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveAsset(asset.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[asset.allocation]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(value) =>
                        handleAllocationChange(asset.id, value[0])
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Risk: {asset.risk}%</span>
                      <span>Expected Return: {asset.expectedReturn}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Badge
                  variant={isValidAllocation ? "default" : "destructive"}
                  className="text-xs"
                >
                  Total: {totalAllocation}%
                </Badge>
                {!isValidAllocation && (
                  <span className="text-xs text-destructive">
                    Allocation must equal 100%
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-medium mb-2">Add New Asset</h3>
              <div className="flex items-end gap-2">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="asset-name" className="text-xs">
                    Asset Name
                  </Label>
                  <Input
                    id="asset-name"
                    value={newAsset.name}
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, name: e.target.value })
                    }
                    placeholder="Ethereum"
                  />
                </div>
                <div className="space-y-1 w-24">
                  <Label htmlFor="asset-ticker" className="text-xs">
                    Ticker
                  </Label>
                  <Input
                    id="asset-ticker"
                    value={newAsset.ticker}
                    onChange={(e) =>
                      setNewAsset({ ...newAsset, ticker: e.target.value })
                    }
                    placeholder="ETH"
                  />
                </div>
                <Button
                  onClick={handleAddAsset}
                  disabled={!newAsset.name || !newAsset.ticker}
                  size="icon"
                  className="mb-0.5"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Portfolio Overview</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assets}
                      dataKey="allocation"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, ticker, allocation }) =>
                        `${name} (${allocation}%)`
                      }
                    >
                      {assets.map((asset) => (
                        <Cell key={asset.id} fill={asset.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        `${value}%`,
                        props.payload.name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Risk Tolerance</h3>
                <Badge variant="outline" className="text-xs">
                  {riskTolerance < 30
                    ? "Conservative"
                    : riskTolerance < 70
                      ? "Moderate"
                      : "Aggressive"}
                </Badge>
              </div>
              <Slider
                value={[riskTolerance]}
                min={0}
                max={100}
                step={1}
                onValueChange={(value) => setRiskTolerance(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Risk</span>
                <span>High Risk</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Portfolio Risk
                </div>
                <div className="text-2xl font-bold">
                  {portfolioRisk.toFixed(1)}%
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Expected Return
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {portfolioReturn.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setOptimized(false)}
                disabled={!optimized}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={optimizePortfolio} disabled={!isValidAllocation}>
                <PieChartIcon className="h-4 w-4 mr-2" />
                Optimize Portfolio
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioOptimizer;
