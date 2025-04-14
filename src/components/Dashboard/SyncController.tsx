import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { SignalData } from "@/api/signal";
import { changeSymbol } from "@/api/signal";

interface SyncControllerProps {
  chartTimeframe: string;
  signalTimeframe: string;
  onSyncTimeframes: (timeframe: string) => void;
  currentSignal: SignalData | null;
  onRefreshData: () => void;
}

const SyncController = ({
  chartTimeframe,
  signalTimeframe,
  onSyncTimeframes,
  currentSignal,
  onRefreshData,
}: SyncControllerProps) => {
  const [synced, setSynced] = useState(chartTimeframe === signalTimeframe);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setSynced(chartTimeframe === signalTimeframe);
  }, [chartTimeframe, signalTimeframe]);

  const handleSync = (e: React.MouseEvent) => {
    // Prevent default browser behavior that might cause page reload
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    // Sync the timeframes by using the chart's timeframe
    onSyncTimeframes(chartTimeframe);
    console.log(`[SyncController] Syncing timeframes to: ${chartTimeframe}`);

    // No need to simulate a delay since we're actually fetching data
    // The parent component will handle the actual data fetching
    setLastUpdated(new Date());

    // Set loading to false after a short delay if not already done by parent
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    // Prevent default browser behavior that might cause page reload
    e.preventDefault();
    e.stopPropagation();

    setLoading(true);
    console.log(`[SyncController] Refreshing data`);
    onRefreshData();
    setLastUpdated(new Date());

    // Set loading to false after a short delay if not already done by parent
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Chart & Signal Sync</h3>
          <p className="text-sm text-muted-foreground">
            {synced
              ? "Chart and signal timeframes are synchronized"
              : "Chart and signal timeframes are out of sync"}
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!synced ? (
            <div className="flex items-center gap-2">
              <AlertCircle className="text-amber-500 h-5 w-5" />
              <span className="text-sm font-medium text-amber-500">
                Chart: {chartTimeframe} | Signal: {signalTimeframe}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-500 h-5 w-5" />
              <span className="text-sm font-medium text-green-500">
                Synchronized on {chartTimeframe}
              </span>
            </div>
          )}
          {!synced && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Now"
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SyncController;
