import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { getSignal, refreshSignal, getAvailableSymbols } from "@/api/signal";
import binanceService from "@/services/binanceService";

interface DiagnosticResult {
  symbol: string;
  timeframe: string;
  isLiveData: boolean;
  signalSource: "live" | "cached" | "fallback" | "unknown";
  lastPrice: number | null;
  entryPoint: number;
  signal: string;
  confidence: number;
  timestamp: string;
  message: string;
}

const MultiSymbolDiagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [overallStatus, setOverallStatus] = useState<{
    liveDataCount: number;
    totalTests: number;
    isConnected: boolean;
    message: string;
  }>({ liveDataCount: 0, totalTests: 0, isConnected: false, message: "" });

  const runAllDiagnostics = async () => {
    setLoading(true);
    setResults([]);

    const symbols = getAvailableSymbols();
    const timeframes = ["15m", "1h", "4h"]; // Test a subset of timeframes

    const totalTests = symbols.length * timeframes.length;
    setProgress({ current: 0, total: totalTests });

    const allResults: DiagnosticResult[] = [];
    let liveDataCount = 0;

    // Check connection status first
    const isConnected = binanceService["isConnected"] || false;

    // If not connected, try to connect
    if (!isConnected) {
      console.log(
        "[MultiDiagnostics] WebSocket not connected, attempting to connect...",
      );
      binanceService.connect();
      // Give it a moment to connect
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Run diagnostics for each symbol and timeframe
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        try {
          // Get current price
          const lastPrice = binanceService.getCurrentPrice
            ? binanceService.getCurrentPrice(symbol.toLowerCase())
            : null;

          // Get signal data
          const signalData = await getSignal(timeframe, symbol);

          // Determine signal source
          let signalSource = "unknown";
          let message = "";

          if (
            signalData.confidence === 0 &&
            signalData.reasoning.includes("Waiting for")
          ) {
            signalSource = "fallback";
            message = "Using fallback signal";
          } else if (signalData.reasoning.includes("Unable to connect")) {
            signalSource = "fallback";
            message = "Connection issue";
          } else if (
            lastPrice &&
            Math.abs(lastPrice - signalData.entryPoint) < 0.01 * lastPrice
          ) {
            signalSource = "live";
            message = "Using live data";
            liveDataCount++;
          } else if (
            signalData.timestamp.includes(new Date().toISOString().slice(0, 10))
          ) {
            signalSource = "cached";
            message = "Using cached data";
          }

          // Add to results
          allResults.push({
            symbol,
            timeframe,
            isLiveData: signalSource === "live",
            signalSource: signalSource as any,
            lastPrice,
            entryPoint: signalData.entryPoint,
            signal: signalData.signal,
            confidence: signalData.confidence,
            timestamp: signalData.timestamp,
            message,
          });

          // Update progress
          setProgress((prev) => ({ ...prev, current: prev.current + 1 }));

          // Update results periodically
          if (allResults.length % 3 === 0) {
            setResults([...allResults]);
          }
        } catch (error) {
          console.error(`Error testing ${symbol} on ${timeframe}:`, error);
          allResults.push({
            symbol,
            timeframe,
            isLiveData: false,
            signalSource: "unknown",
            lastPrice: null,
            entryPoint: 0,
            signal: "ERROR",
            confidence: 0,
            timestamp: new Date().toISOString(),
            message: `Error: ${error instanceof Error ? error.message : String(error)}`,
          });

          // Update progress
          setProgress((prev) => ({ ...prev, current: prev.current + 1 }));
        }
      }
    }

    // Final update of results
    setResults(allResults);

    // Set overall status
    const liveDataPercentage = (liveDataCount / totalTests) * 100;
    let statusMessage = "";

    if (liveDataPercentage >= 90) {
      statusMessage = "Excellent: Most symbols are using live data";
    } else if (liveDataPercentage >= 70) {
      statusMessage = "Good: Majority of symbols are using live data";
    } else if (liveDataPercentage >= 50) {
      statusMessage = "Fair: About half of symbols are using live data";
    } else if (liveDataPercentage >= 30) {
      statusMessage = "Poor: Less than half of symbols are using live data";
    } else {
      statusMessage = "Critical: Few or no symbols are using live data";
    }

    setOverallStatus({
      liveDataCount,
      totalTests,
      isConnected: binanceService["isConnected"] || false,
      message: statusMessage,
    });

    setLoading(false);
  };

  // Run diagnostics on component mount
  useEffect(() => {
    runAllDiagnostics();
  }, []);

  return (
    <Card className="w-full bg-card shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">
            Multi-Symbol Diagnostics
          </CardTitle>
          {!loading && overallStatus.totalTests > 0 && (
            <Badge
              variant={
                overallStatus.liveDataCount / overallStatus.totalTests > 0.7
                  ? "default"
                  : "destructive"
              }
              className="text-xs"
            >
              {Math.round(
                (overallStatus.liveDataCount / overallStatus.totalTests) * 100,
              )}
              % Live Data
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">
                Testing all symbols and timeframes...
              </span>
            </div>
            <div className="text-sm text-center">
              Progress: {progress.current} / {progress.total} tests completed
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              ></div>
            </div>
            {results.length > 0 && (
              <div className="text-sm">
                <div className="font-medium mb-2">Preliminary Results:</div>
                <div className="max-h-40 overflow-y-auto">
                  {results.slice(-5).map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-xs py-1"
                    >
                      <Badge
                        variant={result.isLiveData ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {result.isLiveData ? "LIVE" : "NOT LIVE"}
                      </Badge>
                      <span>
                        {result.symbol} ({result.timeframe})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
              <div
                className={
                  overallStatus.isConnected ? "text-green-500" : "text-red-500"
                }
              >
                {overallStatus.isConnected ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="font-medium">
                  {overallStatus.isConnected
                    ? "Connected to Binance"
                    : "Not connected to Binance"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {overallStatus.message}
                </div>
              </div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-2">Summary:</div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>Total Tests: {overallStatus.totalTests}</div>
                <div>
                  Live Data: {overallStatus.liveDataCount} (
                  {Math.round(
                    (overallStatus.liveDataCount / overallStatus.totalTests) *
                      100,
                  )}
                  %)
                </div>
              </div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-2">Results by Symbol:</div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Symbol</th>
                      <th className="text-left p-2">Timeframe</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Signal</th>
                      <th className="text-left p-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="p-2">{result.symbol}</td>
                        <td className="p-2">{result.timeframe}</td>
                        <td className="p-2">
                          <Badge
                            variant={
                              result.signalSource === "live"
                                ? "default"
                                : result.signalSource === "cached"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {result.signalSource}
                          </Badge>
                        </td>
                        <td className="p-2">{result.signal}</td>
                        <td className="p-2">{result.confidence}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <button
                onClick={runAllDiagnostics}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <RefreshCw className="h-3 w-3" />
                Run Again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <span className="ml-2">Failed to run diagnostics</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiSymbolDiagnostics;
