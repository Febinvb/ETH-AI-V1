import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  Percent,
  Target,
  ArrowDown,
  ArrowUp,
  Clock,
  RefreshCw,
  Pause,
  Play,
  Info,
  Zap,
  BarChart2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getSignal,
  SignalData,
  refreshSignal,
  changeSymbol,
} from "@/api/signal";
import SignalVerifier from "./SignalVerifierImproved";
import binanceService from "@/services/binanceService";

interface SignalPanelProps {
  signal?: "BUY" | "SELL" | "HOLD";
  entryPoint?: number;
  stopLoss?: number;
  targetPrice?: number;
  confidence?: number;
  reasoning?: string;
  timestamp?: string;
  timeframe?: string;
  symbol?: string; // Added symbol prop
  signalData?: SignalData;
  autoRefreshInterval?: number; // Time in milliseconds between auto-refreshes
  initialAutoRefresh?: boolean; // Whether auto-refresh is initially enabled
  onSymbolChange?: (symbol: string) => void; // Callback when symbol changes
  onSignalUpdate?: (signal: SignalData) => void; // Callback for signal updates (for monitoring)
  onRefreshData?: () => Promise<void>; // Centralized refresh function from parent
  disableRefreshButton?: boolean; // Whether to disable the refresh button
  isRefreshing?: boolean; // Whether a refresh is in progress
}

const SignalPanel = ({
  signal: initialSignal = "HOLD",
  entryPoint: initialEntryPoint = 0.5123,
  stopLoss: initialStopLoss = 0.4987,
  targetPrice: initialTargetPrice = 0.5432,
  confidence: initialConfidence = 78,
  reasoning:
    initialReasoning = "Bullish divergence on RSI with increasing volume and MACD crossover. Support level at $0.50 holding strong.",
  timestamp: initialTimestamp = "2023-07-21 14:32:05",
  timeframe = "15m",
  symbol: initialSymbol = "ETHUSDT", // Default symbol
  signalData,
  autoRefreshInterval = 60000, // Default to 1 minute refresh interval
  initialAutoRefresh = false, // Default to auto-refresh disabled
  onSymbolChange,
  onSignalUpdate,
  onRefreshData,
  disableRefreshButton = false,
  isRefreshing = false,
}: SignalPanelProps) => {
  const [loading, setLoading] = useState(!signalData);
  const [data, setData] = useState<SignalData>({
    signal: initialSignal,
    entryPoint: initialEntryPoint,
    stopLoss: initialStopLoss,
    targetPrice: initialTargetPrice,
    confidence: initialConfidence,
    reasoning: initialReasoning,
    timestamp:
      initialTimestamp ||
      new Date().toISOString().replace("T", " ").slice(0, 19),
  });
  // Add local symbol state to ensure UI always reflects the current symbol
  const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const [nextRefreshIn, setNextRefreshIn] = useState(
    autoRefreshInterval / 1000,
  );
  const refreshTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track if a refresh is in progress to prevent overlapping requests
  const refreshInProgressRef = useRef(false);
  // Track the last refresh timestamp to implement debounce
  const lastRefreshTimeRef = useRef(0);
  // Minimum time between manual refreshes (1 second)
  const MIN_REFRESH_INTERVAL = 1000;

  // Fetch signal data on component mount and when symbol or timeframe changes
  useEffect(() => {
    if (!signalData) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          // Ensure the symbol is normalized (no exchange prefix)
          const normalizedSymbol = currentSymbol.includes(":")
            ? currentSymbol.split(":")[1]
            : currentSymbol;

          console.log(
            `[SignalPanel] Fetching signal data for ${normalizedSymbol} with timeframe ${timeframe}`,
          );

          // First ensure the symbol is properly set in the binance service
          changeSymbol(normalizedSymbol);
          console.log(
            `[SignalPanel] Set symbol in binance service to: ${normalizedSymbol}`,
          );

          // Get current market price from TradingView if possible
          // This is a temporary fix to ensure prices are in the correct range
          // A more robust solution would involve fixing the backend signal generation
          let result = await getSignal(timeframe, normalizedSymbol);

          // Get current price from Binance service to validate signal price
          const currentMarketPrice =
            binanceService.getCurrentPrice(normalizedSymbol);
          console.log(
            `[SignalPanel] Current market price for ${normalizedSymbol}: ${currentMarketPrice}`,
          );
          console.log(
            `[SignalPanel] Signal entry point for ${normalizedSymbol}: ${result.entryPoint}`,
          );

          // Check if the price seems outdated (more than 5% difference from current market price)
          const isPriceOutdated =
            currentMarketPrice > 0 &&
            Math.abs(result.entryPoint - currentMarketPrice) /
              currentMarketPrice >
              0.05;

          if (isPriceOutdated) {
            console.warn(
              `[SignalPanel] Price discrepancy detected: Signal price ${result.entryPoint} vs Market price ${currentMarketPrice}`,
            );
          }

          if (isPriceOutdated && currentMarketPrice > 0) {
            console.warn(
              `[SignalPanel] Detected outdated price for ${normalizedSymbol}: ${result.entryPoint} vs market price ${currentMarketPrice}. Correcting prices.`,
            );

            // Calculate appropriate stop loss and target based on signal type and current market price
            const priceVolatility =
              {
                BTCUSDT: 0.02, // 2% for BTC
                ETHUSDT: 0.03, // 3% for ETH
                SOLUSDT: 0.05, // 5% for SOL
                BNBUSDT: 0.04, // 4% for BNB
                DOGEUSDT: 0.06, // 6% for DOGE
                ADAUSDT: 0.05, // 5% for ADA
                XRPUSDT: 0.05, // 5% for XRP
                DOTUSDT: 0.05, // 5% for DOT
                LINKUSDT: 0.05, // 5% for LINK
                MATICUSDT: 0.06, // 6% for MATIC
                AVAXUSDT: 0.05, // 5% for AVAX
              }[normalizedSymbol] || 0.04; // Default 4% for other coins

            // Use the signal's original risk/reward ratio if available, otherwise use default
            const targetMultiplier = result.signal === "BUY" ? 2 : 2; // Risk:Reward ratio
            const stopLossPercent = priceVolatility;
            const targetPercent = priceVolatility * targetMultiplier;

            // Update the prices based on current market price
            result.entryPoint = currentMarketPrice;

            if (result.signal === "BUY") {
              result.stopLoss = currentMarketPrice * (1 - stopLossPercent);
              result.targetPrice = currentMarketPrice * (1 + targetPercent);
            } else if (result.signal === "SELL") {
              result.stopLoss = currentMarketPrice * (1 + stopLossPercent);
              result.targetPrice = currentMarketPrice * (1 - targetPercent);
            }

            // Round to appropriate decimal places based on price magnitude
            if (currentMarketPrice > 10000) {
              // BTC
              result.entryPoint = Math.round(result.entryPoint);
              result.stopLoss = Math.round(result.stopLoss);
              result.targetPrice = Math.round(result.targetPrice);
            } else if (currentMarketPrice > 1000) {
              // ETH
              result.entryPoint = Math.round(result.entryPoint * 10) / 10;
              result.stopLoss = Math.round(result.stopLoss * 10) / 10;
              result.targetPrice = Math.round(result.targetPrice * 10) / 10;
            } else if (currentMarketPrice > 100) {
              // BNB, SOL
              result.entryPoint = Math.round(result.entryPoint * 100) / 100;
              result.stopLoss = Math.round(result.stopLoss * 100) / 100;
              result.targetPrice = Math.round(result.targetPrice * 100) / 100;
            } else {
              // Other coins
              result.entryPoint = Math.round(result.entryPoint * 10000) / 10000;
              result.stopLoss = Math.round(result.stopLoss * 10000) / 10000;
              result.targetPrice =
                Math.round(result.targetPrice * 10000) / 10000;
            }

            result.reasoning = `${result.reasoning} (Price updated to match current market price of $${currentMarketPrice.toFixed(4)})`;

            console.log(
              `[SignalPanel] Applied price correction for ${normalizedSymbol}:`,
              result,
            );
          }

          setData(result);
          console.log(
            `[SignalPanel] Live signal data fetched for ${normalizedSymbol}:`,
            result,
          );

          // Notify parent component of signal update if callback provided
          if (onSignalUpdate) {
            onSignalUpdate(result);
          }

          // If we got a "waiting" message, try to refresh once after a short delay
          if (
            result.reasoning.includes("Waiting for live data") ||
            result.confidence === 0
          ) {
            setTimeout(async () => {
              try {
                console.log(
                  `[SignalPanel] Attempting to refresh signal data after initial "waiting" state`,
                );
                const refreshedResult = await refreshSignal(
                  timeframe,
                  normalizedSymbol,
                );
                setData(refreshedResult);
                console.log(
                  `[SignalPanel] Refreshed signal data for ${normalizedSymbol}:`,
                  refreshedResult,
                );

                // Notify parent component of signal update if callback provided
                if (onSignalUpdate) {
                  onSignalUpdate(refreshedResult);
                }
              } catch (refreshError) {
                console.error(
                  `[SignalPanel] Error refreshing signal data:`,
                  refreshError,
                );
              }
            }, 1500);
          }
        } catch (error) {
          console.error(
            `[SignalPanel] Error fetching signal data for ${currentSymbol}:`,
            error,
          );
          setError(
            `Failed to fetch signal data for ${currentSymbol}. Please try again.`,
          );
          // Keep previous data if available, otherwise show error in UI
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
    // Run this effect when symbol or timeframe changes as well
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalData, currentSymbol, timeframe]);

  // Update data when signalData prop changes
  useEffect(() => {
    if (signalData) {
      setData(signalData);
      // Notify parent component of signal update if callback provided
      if (onSignalUpdate) {
        onSignalUpdate(signalData);
      }
    }
  }, [signalData, onSignalUpdate]);

  const getSignalColor = () => {
    switch (data.signal) {
      case "BUY":
        return "bg-green-500";
      case "SELL":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getSignalIcon = () => {
    switch (data.signal) {
      case "BUY":
        return <ArrowUpCircle className="h-6 w-6 text-green-500" />;
      case "SELL":
        return <ArrowDownCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-yellow-500" />;
    }
  };

  const calculatePotentialProfit = () => {
    if (!data.entryPoint || !data.targetPrice) {
      return "0.00";
    }

    if (data.signal === "BUY") {
      return (
        ((data.targetPrice - data.entryPoint) / data.entryPoint) *
        100
      ).toFixed(2);
    } else if (data.signal === "SELL") {
      return (
        ((data.entryPoint - data.targetPrice) / data.entryPoint) *
        100
      ).toFixed(2);
    }
    return "0.00";
  };

  const calculateRiskReward = () => {
    if (!data.entryPoint || !data.targetPrice || !data.stopLoss) {
      return "0.00";
    }

    if (data.signal === "BUY") {
      const reward = data.targetPrice - data.entryPoint;
      const risk = data.entryPoint - data.stopLoss;
      return risk !== 0 ? (reward / risk).toFixed(2) : "0.00";
    } else if (data.signal === "SELL") {
      const reward = data.entryPoint - data.targetPrice;
      const risk = data.stopLoss - data.entryPoint;
      return risk !== 0 ? (reward / risk).toFixed(2) : "0.00";
    }
    return "0.00";
  };

  // Handle refresh with debounce logic
  const handleRefresh = async (e?: React.MouseEvent): Promise<void> => {
    // Prevent default browser behavior that might cause page reload
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // If centralized refresh function is provided and button is disabled, use that
    if (disableRefreshButton && onRefreshData) {
      console.log(`[SignalPanel] Using centralized refresh function`);
      onRefreshData();
      return;
    }

    // Check if a refresh is already in progress
    if (refreshInProgressRef.current || isRefreshing) {
      console.log(
        `[SignalPanel] Refresh already in progress, skipping request`,
      );
      return;
    }

    // Implement debounce - check if we've refreshed recently
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < MIN_REFRESH_INTERVAL) {
      console.log(`[SignalPanel] Refresh requested too soon, debouncing`);
      return;
    }

    // Update refs to indicate refresh is starting
    refreshInProgressRef.current = true;
    lastRefreshTimeRef.current = now;

    setLoading(true);
    setError(null);
    try {
      // Ensure the symbol is normalized (no exchange prefix)
      const normalizedSymbol = currentSymbol.includes(":")
        ? currentSymbol.split(":")[1]
        : currentSymbol;

      console.log(
        `[SignalPanel] Refreshing signal data for ${normalizedSymbol} on ${timeframe}`,
      );

      // First ensure the symbol is properly set in the binance service
      changeSymbol(normalizedSymbol);

      // Always use refreshSignal to ensure we get fresh data
      // This will completely clear the cache for this symbol/timeframe
      let result = await refreshSignal(timeframe, normalizedSymbol);

      // Get current price from Binance service to validate signal price
      const currentMarketPrice =
        binanceService.getCurrentPrice(normalizedSymbol);
      console.log(
        `[SignalPanel] Current market price for ${normalizedSymbol}: ${currentMarketPrice}`,
      );
      console.log(
        `[SignalPanel] Signal entry point for ${normalizedSymbol}: ${result.entryPoint}`,
      );

      // Check if the price seems outdated (more than 5% difference from current market price)
      const isPriceOutdated =
        currentMarketPrice > 0 &&
        Math.abs(result.entryPoint - currentMarketPrice) / currentMarketPrice >
          0.05;

      if (isPriceOutdated) {
        console.warn(
          `[SignalPanel] Price discrepancy detected: Signal price ${result.entryPoint} vs Market price ${currentMarketPrice}`,
        );
      }

      if (isPriceOutdated && currentMarketPrice > 0) {
        console.warn(
          `[SignalPanel] Detected outdated price for ${normalizedSymbol}: ${result.entryPoint} vs market price ${currentMarketPrice}. Correcting prices.`,
        );

        // Calculate appropriate stop loss and target based on signal type and current market price
        const priceVolatility =
          {
            BTCUSDT: 0.02, // 2% for BTC
            ETHUSDT: 0.03, // 3% for ETH
            SOLUSDT: 0.05, // 5% for SOL
            BNBUSDT: 0.04, // 4% for BNB
            DOGEUSDT: 0.06, // 6% for DOGE
            ADAUSDT: 0.05, // 5% for ADA
            XRPUSDT: 0.05, // 5% for XRP
            DOTUSDT: 0.05, // 5% for DOT
            LINKUSDT: 0.05, // 5% for LINK
            MATICUSDT: 0.06, // 6% for MATIC
            AVAXUSDT: 0.05, // 5% for AVAX
          }[normalizedSymbol] || 0.04; // Default 4% for other coins

        // Use the signal's original risk/reward ratio if available, otherwise use default
        const targetMultiplier = result.signal === "BUY" ? 2 : 2; // Risk:Reward ratio
        const stopLossPercent = priceVolatility;
        const targetPercent = priceVolatility * targetMultiplier;

        // Update the prices based on current market price
        result.entryPoint = currentMarketPrice;

        if (result.signal === "BUY") {
          result.stopLoss = currentMarketPrice * (1 - stopLossPercent);
          result.targetPrice = currentMarketPrice * (1 + targetPercent);
        } else if (result.signal === "SELL") {
          result.stopLoss = currentMarketPrice * (1 + stopLossPercent);
          result.targetPrice = currentMarketPrice * (1 - targetPercent);
        }

        // Round to appropriate decimal places based on price magnitude
        if (currentMarketPrice > 10000) {
          // BTC
          result.entryPoint = Math.round(result.entryPoint);
          result.stopLoss = Math.round(result.stopLoss);
          result.targetPrice = Math.round(result.targetPrice);
        } else if (currentMarketPrice > 1000) {
          // ETH
          result.entryPoint = Math.round(result.entryPoint * 10) / 10;
          result.stopLoss = Math.round(result.stopLoss * 10) / 10;
          result.targetPrice = Math.round(result.targetPrice * 10) / 10;
        } else if (currentMarketPrice > 100) {
          // BNB, SOL
          result.entryPoint = Math.round(result.entryPoint * 100) / 100;
          result.stopLoss = Math.round(result.stopLoss * 100) / 100;
          result.targetPrice = Math.round(result.targetPrice * 100) / 100;
        } else {
          // Other coins
          result.entryPoint = Math.round(result.entryPoint * 10000) / 10000;
          result.stopLoss = Math.round(result.stopLoss * 10000) / 10000;
          result.targetPrice = Math.round(result.targetPrice * 10000) / 10000;
        }

        result.reasoning = `${result.reasoning} (Price updated to match current market price of ${currentMarketPrice.toFixed(4)})`;

        console.log(
          `[SignalPanel] Applied price correction for ${normalizedSymbol}:`,
          result,
        );
      }

      // Check if the component is still mounted and the symbol/timeframe hasn't changed
      // This prevents stale data from overriding newer data
      if (
        normalizedSymbol ===
        (currentSymbol.includes(":")
          ? currentSymbol.split(":")[1]
          : currentSymbol)
      ) {
        setData(result);
        console.log(
          `Live signal data refreshed for ${normalizedSymbol}:`,
          result,
        );
        // Reset countdown timer if auto-refresh is enabled
        if (autoRefresh) {
          setNextRefreshIn(autoRefreshInterval / 1000);
        }

        // Notify parent component of signal update if callback provided
        if (onSignalUpdate) {
          onSignalUpdate(result);
        }
      } else {
        console.log(
          `[SignalPanel] Symbol changed during refresh, discarding result`,
        );
      }
    } catch (error) {
      console.error(
        `Error refreshing signal data for ${currentSymbol}:`,
        error,
      );
      setError(
        `Failed to refresh signal data for ${currentSymbol}. Please try again.`,
      );
      // Keep previous data if available
      if (!data || data.confidence === 0) {
        // If we don't have valid data, create a basic error state
        setData({
          signal: "HOLD",
          entryPoint: 0,
          stopLoss: 0,
          targetPrice: 0,
          confidence: 0,
          reasoning: `Error fetching data for ${currentSymbol}. Please try again.`,
          timestamp: `${new Date().toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`,
        });
      }
    } finally {
      setLoading(false);
      // Reset the refresh in progress flag
      refreshInProgressRef.current = false;
    }
  };

  // Schedule the next refresh using setTimeout instead of setInterval to prevent overlapping refreshes
  const scheduleNextRefresh = () => {
    // Don't schedule if auto-refresh is disabled, component is loading, or a refresh is already in progress
    if (
      !autoRefresh ||
      loading ||
      isRefreshing ||
      refreshInProgressRef.current
    ) {
      return;
    }

    const refreshInterval = Math.min(autoRefreshInterval, 30000); // Max 30 seconds
    console.log(
      `[SignalPanel] Scheduling next refresh in ${refreshInterval / 1000} seconds`,
    );

    // Clear any existing timer before setting a new one
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    refreshTimerRef.current = window.setTimeout(() => {
      console.log(`[SignalPanel] Auto-refresh timer triggered`);
      // Double-check auto-refresh is still enabled and no refresh is in progress
      if (autoRefresh && !refreshInProgressRef.current && !isRefreshing) {
        // If centralized refresh is available and button is disabled, use that
        if (disableRefreshButton && onRefreshData) {
          onRefreshData()
            .catch((error) => {
              console.error(
                `[SignalPanel] Error during centralized auto-refresh:`,
                error,
              );
            })
            .finally(() => {
              // Only schedule the next refresh if auto-refresh is still enabled
              if (autoRefresh) {
                // Use a small delay to prevent immediate rescheduling
                setTimeout(scheduleNextRefresh, 100);
              }
            });
        } else {
          // Use internal refresh mechanism
          handleRefresh()
            .catch((error) => {
              console.error(`[SignalPanel] Error during auto-refresh:`, error);
            })
            .finally(() => {
              // Only schedule the next refresh if auto-refresh is still enabled
              if (autoRefresh) {
                // Use a small delay to prevent immediate rescheduling
                setTimeout(scheduleNextRefresh, 100);
              }
            });
        }
      }
    }, refreshInterval);
  };

  // Setup auto-refresh timer
  useEffect(() => {
    // Clear any existing timers
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    // If auto-refresh is enabled, set up the timers
    if (autoRefresh && !loading && !isRefreshing) {
      // Schedule the first refresh
      scheduleNextRefresh();

      // Set up the countdown timer
      countdownTimerRef.current = window.setInterval(() => {
        setNextRefreshIn((prev) => {
          if (prev <= 1) {
            return autoRefreshInterval / 1000;
          }
          return prev - 1;
        });
      }, 1000);

      // Initialize countdown
      setNextRefreshIn(autoRefreshInterval / 1000);
    } else if (!autoRefresh) {
      // Reset countdown when auto-refresh is disabled
      setNextRefreshIn(autoRefreshInterval / 1000);
    }

    // Cleanup function
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [autoRefresh, autoRefreshInterval, isRefreshing]); // Added isRefreshing dependency

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
  };

  // Update local symbol state when prop changes
  useEffect(() => {
    if (initialSymbol !== currentSymbol) {
      console.log(
        `[SignalPanel] Symbol prop changed from ${currentSymbol} to ${initialSymbol}`,
      );
      setCurrentSymbol(initialSymbol);
    }
  }, [initialSymbol, currentSymbol]);

  // Track the last symbol change timestamp to prevent rapid changes
  const lastSymbolChangeTimeRef = useRef(0);
  // Minimum time between symbol changes (500ms)
  const MIN_SYMBOL_CHANGE_INTERVAL = 500;

  // Handle symbol change with debounce logic
  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSymbol = e.target.value;

    // Implement debounce for symbol changes
    const now = Date.now();
    if (now - lastSymbolChangeTimeRef.current < MIN_SYMBOL_CHANGE_INTERVAL) {
      console.log(`[SignalPanel] Symbol change requested too soon, debouncing`);
      return;
    }
    lastSymbolChangeTimeRef.current = now;

    console.log(`[SignalPanel] Symbol change requested to: ${newSymbol}`);

    // Check if it's actually a change
    if (newSymbol === currentSymbol) {
      console.log(`[SignalPanel] Symbol unchanged, skipping update`);
      return;
    }

    // Update local symbol state immediately to ensure UI reflects the change
    setCurrentSymbol(newSymbol);

    // This ensures the component's UI updates even before the parent component processes the change
    if (onSymbolChange) {
      console.log(
        `[SignalPanel] Using parent component's onSymbolChange callback for ${newSymbol}`,
      );
      onSymbolChange(newSymbol);
    } else {
      // If no callback is provided, handle the symbol change internally
      console.log(
        `[SignalPanel] Handling symbol change internally for ${newSymbol}`,
      );

      // If centralized refresh is available and button is disabled, use that
      if (disableRefreshButton && onRefreshData) {
        // Use centralized refresh
        onRefreshData();
      } else {
        // Otherwise use internal refresh
        handleRefresh();
      }
    }
  };

  return (
    <Card className="w-full bg-background">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Signal Analysis</CardTitle>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleAutoRefresh}
                    className="p-1 rounded-md hover:bg-muted"
                    disabled={loading || isRefreshing}
                  >
                    {autoRefresh ? (
                      <Pause className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Play className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {autoRefresh
                    ? `Auto-refresh enabled (${nextRefreshIn}s)`
                    : "Enable auto-refresh"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleRefresh}
                    className="p-1 rounded-md hover:bg-muted"
                    disabled={loading || isRefreshing || disableRefreshButton}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading || isRefreshing ? "animate-spin" : ""} ${disableRefreshButton ? "text-muted" : "text-muted-foreground"}`}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {loading || isRefreshing
                    ? "Refreshing..."
                    : disableRefreshButton
                      ? "Refresh controlled by parent"
                      : "Refresh signal"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-4 text-red-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
              disabled={loading || isRefreshing}
            >
              {loading || isRefreshing ? "Refreshing..." : "Retry"}
            </button>
          </div>
        ) : loading || isRefreshing ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {isRefreshing
                ? "Refreshing signal data..."
                : "Loading signal data..."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getSignalIcon()}
                <span className="text-2xl font-bold">{data.signal}</span>
                <Badge
                  variant={data.confidence > 70 ? "default" : "secondary"}
                  className="ml-2"
                >
                  {data.confidence}% Confidence
                </Badge>
              </div>
              <SignalVerifier
                timestamp={data.timestamp}
                timeframe={timeframe}
                onRefresh={handleRefresh}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Target className="h-4 w-4 mr-1" />
                  <span>Entry</span>
                </div>
                <div className="text-lg font-semibold">
                  ${data.entryPoint?.toFixed(4)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <ArrowDown className="h-4 w-4 mr-1 text-red-500" />
                  <span>Stop Loss</span>
                </div>
                <div className="text-lg font-semibold">
                  ${data.stopLoss?.toFixed(4)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <ArrowUp className="h-4 w-4 mr-1 text-green-500" />
                  <span>Target</span>
                </div>
                <div className="text-lg font-semibold">
                  ${data.targetPrice?.toFixed(4)}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Percent className="h-4 w-4 mr-1" />
                  <span>Potential Profit</span>
                </div>
                <div className="text-lg font-semibold">
                  {calculatePotentialProfit()}%
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-muted-foreground">
                  <BarChart2 className="h-4 w-4 mr-1" />
                  <span>Risk/Reward</span>
                </div>
                <div className="text-lg font-semibold">
                  {calculateRiskReward()}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Zap className="h-4 w-4 mr-1" />
                <span>Signal Reasoning</span>
              </div>
              <div className="text-sm p-3 bg-muted/50 rounded-md">
                {data.reasoning}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalPanel;
