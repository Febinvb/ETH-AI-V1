import React, { useState, useEffect } from "react";
import TradingView from "./TradingView";
import SignalPanel from "./SignalPanel";
import SyncController from "./SyncController";
import { SignalData, getSignal, refreshSignal } from "@/api/signal";

interface SynchronizedTradingDashboardProps {
  initialSymbol?: string;
  initialTimeframe?: string;
}

const SynchronizedTradingDashboard: React.FC<
  SynchronizedTradingDashboardProps
> = ({ initialSymbol = "ETHUSDT", initialTimeframe = "15m" }) => {
  const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
  const [chartTimeframe, setChartTimeframe] = useState(initialTimeframe);
  const [signalTimeframe, setSignalTimeframe] = useState(initialTimeframe);
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Handle symbol change from chart
  const handleSymbolChange = (symbol: string) => {
    console.log(`[SynchronizedDashboard] Symbol changed to: ${symbol}`);
    setCurrentSymbol(symbol);
  };

  // Handle timeframe change from chart
  const handleTimeframeChange = (timeframe: string) => {
    console.log(
      `[SynchronizedDashboard] Chart timeframe changed to: ${timeframe}`,
    );
    setChartTimeframe(timeframe);
  };

  // Sync timeframes between chart and signal
  const handleSyncTimeframes = (timeframe: string) => {
    console.log(`[SynchronizedDashboard] Syncing timeframes to: ${timeframe}`);
    setSignalTimeframe(timeframe);
  };

  // Handle signal update
  const handleSignalUpdate = (signal: SignalData) => {
    // Always update if we don't have a current signal
    if (!currentSignal) {
      console.log(
        `[SynchronizedDashboard] Initial signal received for ${currentSymbol}:`,
        signal.signal,
      );
      setCurrentSignal(signal);
      return;
    }

    // Check if this is a meaningful update
    const isSignalChanged = signal.signal !== currentSignal.signal;
    const isPriceChanged =
      Math.abs(signal.entryPoint - currentSignal.entryPoint) > 0.0001;
    const isTimestampChanged = signal.timestamp !== currentSignal.timestamp;
    const isConfidenceChanged = signal.confidence !== currentSignal.confidence;

    if (
      isSignalChanged ||
      isPriceChanged ||
      isTimestampChanged ||
      isConfidenceChanged
    ) {
      console.log(
        `[SynchronizedDashboard] Signal updated for ${currentSymbol}:`,
        signal.signal,
        `(changes: signal=${isSignalChanged}, price=${isPriceChanged}, timestamp=${isTimestampChanged}, confidence=${isConfidenceChanged})`,
      );
      setCurrentSignal(signal);
    } else {
      console.log(`[SynchronizedDashboard] Ignoring duplicate signal update`);
    }
  };

  // Centralized refresh function for both TradingView and SignalPanel
  const handleRefreshData = async () => {
    if (refreshing) {
      console.log(
        `[SynchronizedDashboard] Refresh already in progress, skipping`,
      );
      return;
    }

    setLoading(true);
    setRefreshing(true);
    try {
      console.log(
        `[SynchronizedDashboard] Refreshing data for ${currentSymbol} on ${signalTimeframe}`,
      );
      // Use refreshSignal instead of getSignal to ensure fresh data
      const data = await refreshSignal(signalTimeframe, currentSymbol);
      setCurrentSignal(data);
      console.log(`[SynchronizedDashboard] Refresh completed successfully`);
    } catch (error) {
      console.error("[SynchronizedDashboard] Error refreshing data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 dashboard-gradient p-4 rounded-lg">
      <div className="lg:col-span-2 space-y-4">
        <SyncController
          chartTimeframe={chartTimeframe}
          signalTimeframe={signalTimeframe}
          onSyncTimeframes={handleSyncTimeframes}
          currentSignal={currentSignal}
          onRefreshData={handleRefreshData}
          isRefreshing={refreshing}
        />
        <TradingView
          symbol={`BINANCE:${currentSymbol}`}
          timeframe={chartTimeframe}
          onSymbolChange={handleSymbolChange}
          onSignalUpdate={handleSignalUpdate}
          onRefreshData={handleRefreshData}
          disableRefreshButton={true}
          isRefreshing={refreshing}
        />
      </div>
      <div>
        <SignalPanel
          symbol={currentSymbol}
          timeframe={signalTimeframe}
          signalData={currentSignal}
          onSymbolChange={handleSymbolChange}
          initialAutoRefresh={false}
          onRefreshData={handleRefreshData}
          disableRefreshButton={true}
          isRefreshing={refreshing}
        />
      </div>
    </div>
  );
};

export default SynchronizedTradingDashboard;
