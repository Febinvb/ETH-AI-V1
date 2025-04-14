import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, CheckCircle, Info } from "lucide-react";
import { getSignal, refreshSignal, SignalData } from "@/api/signal";
import binanceService from "@/services/binanceService";

interface SignalDiagnosticsProps {
  symbol?: string;
  timeframe?: string;
}

const SignalDiagnostics = ({
  symbol = "ETHUSDT",
  timeframe = "15m",
}: SignalDiagnosticsProps) => {
  const [loading, setLoading] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<{
    isLiveData: boolean;
    connectionStatus: "connected" | "disconnected" | "connecting";
    signalSource: "live" | "cached" | "fallback" | "unknown";
    lastPrice: number | null;
    signalData: SignalData | null;
    refreshedSignalData: SignalData | null;
    message: string;
    timestamp: string;
    hasTradeData: boolean;
    cacheStatus: string;
  } | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      // Step 1: Check Binance connection status
      const isConnected = binanceService["isConnected"] || false;
      const connectionStatus = isConnected ? "connected" : "disconnected";

      // Step 2: Get current price from Binance service
      const lastPrice = binanceService.getCurrentPrice
        ? binanceService.getCurrentPrice(symbol.toLowerCase())
        : null;

      // Step 3: Check if we have trade data
      const trades = binanceService.getTradesForSymbol
        ? binanceService.getTradesForSymbol(symbol.toLowerCase())
        : [];
      const hasTradeData = trades && trades.length > 0;

      // Step 4: Get signal data
      console.log(
        `[Diagnostics] Fetching signal for ${symbol} on ${timeframe}`,
      );
      const signalData = await getSignal(timeframe, symbol);

      // Step 5: Get refreshed signal data to compare
      console.log(
        `[Diagnostics] Refreshing signal for ${symbol} on ${timeframe}`,
      );
      const refreshedSignalData = await refreshSignal(timeframe, symbol);

      // Step 6: Analyze signal source
      let signalSource = "unknown";
      let message = "";
      let cacheStatus = "";

      // Check if signal is from live data or fallback
      if (
        signalData.confidence === 0 &&
        signalData.reasoning.includes("Waiting for")
      ) {
        signalSource = "fallback";
        message =
          "Using fallback signal - waiting for sufficient real-time data";
      } else if (signalData.reasoning.includes("Unable to connect")) {
        signalSource = "fallback";
        message = "Using fallback signal - connection issue detected";
      } else if (
        lastPrice &&
        Math.abs(lastPrice - signalData.entryPoint) < 0.01 * lastPrice
      ) {
        signalSource = "live";
        message = "Signal appears to be based on current market data";
      } else if (
        signalData.timestamp.includes(new Date().toISOString().slice(0, 10))
      ) {
        signalSource = "cached";
        message = "Signal is from today but may be cached";
      } else {
        signalSource = "unknown";
        message = "Unable to determine signal source with confidence";
      }

      // Compare original and refreshed signals
      if (refreshedSignalData && signalData) {
        if (refreshedSignalData.entryPoint !== signalData.entryPoint) {
          cacheStatus =
            "Signals differ between calls - cache is being refreshed";
        } else {
          cacheStatus =
            "Signals identical between calls - may be using cached data";
        }
      }

      // Determine if we're getting live data
      const isLiveData = signalSource === "live" && hasTradeData && isConnected;

      setDiagnosticResults({
        isLiveData,
        connectionStatus: connectionStatus as any,
        signalSource: signalSource as any,
        lastPrice,
        signalData,
        refreshedSignalData,
        message,
        timestamp: new Date().toISOString(),
        hasTradeData,
        cacheStatus,
      });
    } catch (error) {
      console.error("Error running diagnostics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Run diagnostics on component mount
  useEffect(() => {
    runDiagnostics();
  }, [symbol, timeframe]);

  return (
    <Card className="w-full bg-card shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">
            Signal Diagnostics
          </CardTitle>
          <Badge
            variant={
              loading
                ? "outline"
                : diagnosticResults?.isLiveData
                  ? "default"
                  : "destructive"
            }
            className="text-xs"
          >
            {loading
              ? "Running..."
              : diagnosticResults?.isLiveData
                ? "Live Data"
                : "Not Live"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Running diagnostics...</span>
          </div>
        ) : diagnosticResults ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Connection:</span>
                <Badge
                  variant={
                    diagnosticResults.connectionStatus === "connected"
                      ? "default"
                      : "destructive"
                  }
                  className="text-xs"
                >
                  {diagnosticResults.connectionStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Trade Data:</span>
                <Badge
                  variant={
                    diagnosticResults.hasTradeData ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {diagnosticResults.hasTradeData ? "Available" : "Missing"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Signal Source:</span>
                <Badge
                  variant={
                    diagnosticResults.signalSource === "live"
                      ? "default"
                      : diagnosticResults.signalSource === "cached"
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-xs"
                >
                  {diagnosticResults.signalSource}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Current Price:</span>
                <span>
                  {diagnosticResults.lastPrice
                    ? `$${diagnosticResults.lastPrice.toFixed(4)}`
                    : "N/A"}
                </span>
              </div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Diagnostic Message:</div>
              <div className="text-muted-foreground">
                {diagnosticResults.message}
              </div>
            </div>

            <div className="text-sm">
              <div className="font-medium mb-1">Cache Status:</div>
              <div className="text-muted-foreground">
                {diagnosticResults.cacheStatus}
              </div>
            </div>

            {diagnosticResults.signalData && (
              <div className="text-sm">
                <div className="font-medium mb-1">Signal Details:</div>
                <div className="grid grid-cols-2 gap-2 bg-muted/30 p-2 rounded-md">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {diagnosticResults.signalData.signal}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>{" "}
                    {diagnosticResults.signalData.confidence}%
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entry:</span> $
                    {diagnosticResults.signalData.entryPoint.toFixed(4)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>{" "}
                    {diagnosticResults.signalData.timestamp}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                onClick={runDiagnostics}
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

export default SignalDiagnostics;
