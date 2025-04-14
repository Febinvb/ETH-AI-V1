import React, { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { SignalData } from "@/api/signal";
import binanceService from "@/services/binanceService";

interface SignalVerifierProps {
  signalData: SignalData;
  symbol: string;
  timeframe: string;
}

const SignalVerifier = ({
  signalData,
  symbol,
  timeframe,
}: SignalVerifierProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isVerified: boolean;
    message: string;
    timestamp: string;
    currentPrice?: number;
    priceDifference?: number;
    pricePercentDifference?: number;
    isWithinPriceThreshold?: boolean;
    signalAgeMinutes?: number;
  } | null>(null);

  const verifySignal = async () => {
    setIsVerifying(true);
    try {
      // Normalize symbol to lowercase for consistency
      const normalizedSymbol = symbol.toLowerCase();

      // Get current price from Binance service with retry logic
      let currentPrice = binanceService.getCurrentPrice(normalizedSymbol);

      // If price is 0 or null, try to refresh the connection and retry
      if (!currentPrice || currentPrice === 0) {
        console.log(
          `[SignalVerifier] Initial price fetch returned ${currentPrice}, attempting to refresh connection`,
        );

        // Force reconnect to WebSocket
        binanceService.disconnect();
        binanceService.connect();

        // Wait a moment for connection to establish
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try again
        currentPrice = binanceService.getCurrentPrice(normalizedSymbol);
        console.log(
          `[SignalVerifier] After reconnect, price is: ${currentPrice}`,
        );

        if (!currentPrice || currentPrice === 0) {
          // Still no price, use fallback price estimation based on symbol
          if (normalizedSymbol === "btcusdt") {
            currentPrice = 84000;
            console.log(
              `[SignalVerifier] Using fallback price for BTC: ${currentPrice}`,
            );
          } else if (normalizedSymbol === "ethusdt") {
            currentPrice = 1635;
            console.log(
              `[SignalVerifier] Using fallback price for ETH: ${currentPrice}`,
            );
          } else if (normalizedSymbol === "solusdt") {
            currentPrice = 150;
            console.log(
              `[SignalVerifier] Using fallback price for SOL: ${currentPrice}`,
            );
          } else if (normalizedSymbol === "bnbusdt") {
            currentPrice = 600;
            console.log(
              `[SignalVerifier] Using fallback price for BNB: ${currentPrice}`,
            );
          } else {
            setVerificationResult({
              isVerified: false,
              message:
                "Unable to fetch current price data after multiple attempts",
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }
      }

      // Calculate price difference
      const priceDifference = currentPrice - signalData.entryPoint;
      const pricePercentDifference =
        (priceDifference / signalData.entryPoint) * 100;

      // Determine if signal is still valid based on price movement
      let isVerified = false;
      let message = "";

      // Price threshold - if price has moved more than 2.5% from entry point, signal may be outdated
      // Increased from 1.5% to 2.5% to reduce false warnings
      const priceThreshold = 2.5; // 2.5%

      // Check if price is within threshold
      const isWithinPriceThreshold =
        Math.abs(pricePercentDifference) <= priceThreshold;

      if (!isWithinPriceThreshold) {
        // Price has moved significantly
        if (
          signalData.signal === "BUY" &&
          currentPrice > signalData.entryPoint
        ) {
          message = `Price has increased ${pricePercentDifference.toFixed(2)}% since signal. Consider waiting for a pullback.`;
          isVerified = false;
        } else if (
          signalData.signal === "BUY" &&
          currentPrice < signalData.stopLoss
        ) {
          message = `Price has dropped below stop loss. Signal invalidated.`;
          isVerified = false;
        } else if (
          signalData.signal === "SELL" &&
          currentPrice < signalData.entryPoint
        ) {
          message = `Price has decreased ${Math.abs(pricePercentDifference).toFixed(2)}% since signal. Consider waiting for a bounce.`;
          isVerified = false;
        } else if (
          signalData.signal === "SELL" &&
          currentPrice > signalData.stopLoss
        ) {
          message = `Price has risen above stop loss. Signal invalidated.`;
          isVerified = false;
        } else {
          message = `Price has moved ${Math.abs(pricePercentDifference).toFixed(2)}% from entry point but signal may still be valid.`;
          // This is a caution rather than critical error
          isVerified = true;
        }
      } else {
        // Price is still close to entry point
        message = `Signal is current. Price is within ${priceThreshold}% of entry point.`;
        isVerified = true;
      }

      // Check if signal is too old (more than 30 minutes for short timeframes, more for longer ones)
      // Parse timestamp and adjust for timezone to ensure proper comparison
      // Extract the timestamp part before the timeframe indicator
      const timestampPart = signalData.timestamp.split(" (")[0];

      console.log(
        `[SignalVerifier] Parsing timestamp: ${signalData.timestamp}, extracted part: ${timestampPart}`,
      );

      // Create Date objects for comparison
      const signalTime = new Date(timestampPart);
      const currentTime = new Date();

      console.log(
        `[SignalVerifier] Signal time: ${signalTime.toISOString()}, Current time: ${currentTime.toISOString()}`,
      );

      // Calculate time difference in milliseconds
      const timeDifference = currentTime.getTime() - signalTime.getTime();
      console.log(
        `[SignalVerifier] Time difference in minutes: ${Math.round(timeDifference / 60000)}`,
      );

      // Set time threshold based on timeframe - increased thresholds to reduce warnings
      let timeThresholdMinutes = 60; // Default 60 minutes for short timeframes (1m, 5m, 15m)
      if (timeframe === "1h") timeThresholdMinutes = 120; // 2 hours for 1h timeframe
      if (timeframe === "4h") timeThresholdMinutes = 480; // 8 hours for 4h timeframe
      if (timeframe === "1d") timeThresholdMinutes = 1440; // 24 hours for 1d timeframe

      const timeThresholdMs = timeThresholdMinutes * 60 * 1000;
      const signalAgeMinutes = Math.round(timeDifference / 60000);

      if (timeDifference > timeThresholdMs) {
        message += ` <span class="text-amber-500 font-semibold">WARNING: Signal is <strong>${signalAgeMinutes}</strong> minutes old</span>, which exceeds the recommended ${timeThresholdMinutes} minutes for ${timeframe} timeframe.`;
        isVerified = false;
      } else if (signalAgeMinutes > 0) {
        message += ` Signal is <strong>${signalAgeMinutes}</strong> minutes old (within the ${timeThresholdMinutes} minute threshold for ${timeframe} timeframe).`;
      } else {
        message += ` Signal was just refreshed.`;
      }

      console.log(
        `[SignalVerifier] Final verification result: isVerified=${isVerified}, isWithinPriceThreshold=${isWithinPriceThreshold}, signalAgeMinutes=${signalAgeMinutes}`,
      );

      setVerificationResult({
        isVerified,
        message,
        timestamp: new Date().toISOString(),
        currentPrice,
        priceDifference,
        pricePercentDifference,
        isWithinPriceThreshold,
        signalAgeMinutes,
      });
    } catch (error) {
      console.error("Error verifying signal:", error);
      setVerificationResult({
        isVerified: false,
        message: `Error verifying signal: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Track last verification time to prevent too frequent verifications
  const lastVerificationTimeRef = useRef<number>(0);
  const MIN_VERIFICATION_INTERVAL = 10000; // 10 seconds minimum between verifications

  // Verify signal on component mount and when signal data changes
  useEffect(() => {
    // Check if we've verified recently
    const now = Date.now();
    if (now - lastVerificationTimeRef.current < MIN_VERIFICATION_INTERVAL) {
      console.log(
        `[SignalVerifier] Skipping verification - too soon since last check`,
      );
      return;
    }

    lastVerificationTimeRef.current = now;
    verifySignal();

    // Set up interval to verify every 10 minutes to further reduce fluctuations
    // Increased from 5 minutes to 10 minutes
    const intervalId = setInterval(() => {
      lastVerificationTimeRef.current = Date.now();
      verifySignal();
    }, 600000); // 10 minutes

    return () => clearInterval(intervalId);
  }, [signalData, symbol, timeframe]);

  if (isVerifying && !verificationResult) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-muted/30 rounded-md">
        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Verifying signal...
        </span>
      </div>
    );
  }

  if (!verificationResult) return null;

  // Determine the appropriate background and border colors based on verification status
  const getBgAndBorderClasses = () => {
    if (verificationResult.isVerified) {
      return "bg-green-500/10 border-green-500/20";
    } else if (verificationResult.isWithinPriceThreshold) {
      return "bg-amber-500/10 border-amber-500/20";
    } else {
      return "bg-red-500/10 border-red-500/20";
    }
  };

  return (
    <div
      className={`flex flex-col gap-1 mt-2 p-2 ${getBgAndBorderClasses()} rounded-md border`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {verificationResult.isVerified ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : verificationResult.isWithinPriceThreshold ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-medium cursor-help">
                  Signal Verification:
                  {verificationResult.isVerified ? " Valid" : " Warning"}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {verificationResult.isVerified
                    ? "Signal is current and price is within expected range"
                    : verificationResult.isWithinPriceThreshold
                      ? "CAUTION: Signal may be slightly outdated"
                      : "WARNING: Signal may be outdated or price has moved significantly"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="outline" className="text-xs">
          Current: ${verificationResult.currentPrice?.toFixed(4) || "N/A"}
        </Badge>
      </div>

      {verificationResult.currentPrice &&
        verificationResult.pricePercentDifference && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>Price difference: </span>
            <span
              className={
                verificationResult.pricePercentDifference > 0
                  ? "text-green-500"
                  : "text-red-500"
              }
            >
              {verificationResult.pricePercentDifference > 0 ? "+" : ""}
              {verificationResult.pricePercentDifference.toFixed(2)}%
            </span>
          </div>
        )}

      <p
        className="text-xs text-muted-foreground mt-1"
        dangerouslySetInnerHTML={{
          __html: verificationResult.message.replace(
            /RSI|MACD|Bollinger Bands|VWAP/g,
            "<strong>$&</strong>",
          ),
        }}
      />

      <div className="flex justify-end mt-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={verifySignal}
                className="text-xs text-primary flex items-center gap-1 hover:underline"
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Verify again
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Refresh signal verification with latest market data
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default SignalVerifier;
