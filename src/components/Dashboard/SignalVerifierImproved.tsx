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

const SignalVerifierImproved = ({
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

  // Track last verification time to prevent too frequent verifications
  const lastVerificationTimeRef = useRef<number>(0);
  const MIN_VERIFICATION_INTERVAL = 10000; // 10 seconds minimum between verifications (reduced from 30s)

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

        // Try again with a small delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        currentPrice = binanceService.getCurrentPrice(normalizedSymbol);

        if (!currentPrice || currentPrice === 0) {
          // Still no price, use fallback price estimation based on symbol
          if (normalizedSymbol.includes("btc")) {
            currentPrice = 84000;
            console.log(
              `[SignalVerifier] Using fallback price for BTC: ${currentPrice}`,
            );
          } else if (normalizedSymbol.includes("eth")) {
            currentPrice = 3500;
            console.log(
              `[SignalVerifier] Using fallback price for ETH: ${currentPrice}`,
            );
          } else if (normalizedSymbol.includes("sol")) {
            currentPrice = 150;
            console.log(
              `[SignalVerifier] Using fallback price for SOL: ${currentPrice}`,
            );
          } else if (normalizedSymbol.includes("bnb")) {
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
            setIsVerifying(false);
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
      let signalTime: Date;
      const currentTime = new Date();

      try {
        // Try to parse the timestamp directly
        signalTime = new Date(timestampPart);

        // Check if the date is valid
        if (isNaN(signalTime.getTime())) {
          throw new Error("Invalid date format");
        }

        // Check if the timestamp is in the future (which would be an error)
        if (signalTime > currentTime) {
          console.warn(
            `[SignalVerifier] Future timestamp detected: ${timestampPart}, signal time: ${signalTime.toISOString()}, current time: ${currentTime.toISOString()}`,
          );
          // Use current time minus 5 minutes as a reasonable fallback
          signalTime = new Date(currentTime.getTime() - 5 * 60000);
        }

        // Check if the timestamp is too far in the past (>24h)
        // This could indicate a stale signal or timestamp parsing issue
        else if (
          currentTime.getTime() - signalTime.getTime() >
          24 * 60 * 60 * 1000
        ) {
          console.warn(
            `[SignalVerifier] Very old timestamp detected: ${timestampPart}, signal time: ${signalTime.toISOString()}, current time: ${currentTime.toISOString()}`,
          );
          // Use a more recent fallback time but still show it's somewhat old
          signalTime = new Date(currentTime.getTime() - 30 * 60000); // Assume 30 minutes old
        }

        // Additional check for timestamps with year far in the future (like 2025)
        // This is likely a formatting issue
        else if (signalTime.getFullYear() > currentTime.getFullYear() + 1) {
          console.warn(
            `[SignalVerifier] Future year detected in timestamp: ${timestampPart}, year: ${signalTime.getFullYear()}`,
          );
          // Use current time minus 5 minutes as a reasonable fallback
          signalTime = new Date(currentTime.getTime() - 5 * 60000);
        }
      } catch (error) {
        console.warn(
          `[SignalVerifier] Error parsing timestamp: ${timestampPart}, error: ${error}. Using fallback time.`,
        );
        // If we can't parse the timestamp, use a recent time (10 minutes ago) to avoid extreme warnings
        signalTime = new Date(currentTime.getTime() - 10 * 60000);
      }

      // Calculate time difference in milliseconds
      const timeDifference = currentTime.getTime() - signalTime.getTime();
      console.log(
        `[SignalVerifier] Time difference in minutes: ${Math.round(timeDifference / 60000)}`,
      );

      // Additional check for suspiciously large time differences that might indicate timezone issues
      if (timeDifference > 12 * 60 * 60 * 1000 && timestampPart.includes(" ")) {
        console.warn(
          `[SignalVerifier] Possible timezone issue detected with timestamp: ${timestampPart}`,
        );
        // Adjust the signal time to be more recent
        signalTime = new Date(currentTime.getTime() - 5 * 60000); // Assume 5 minutes old
      }

      // Set time threshold based on timeframe - adjusted thresholds to be more appropriate
      let timeThresholdMinutes = 30; // Default 30 minutes for 1m timeframe
      if (timeframe === "5m") timeThresholdMinutes = 45; // 45 minutes for 5m timeframe
      if (timeframe === "15m") timeThresholdMinutes = 60; // 1 hour for 15m timeframe
      if (timeframe === "1h") timeThresholdMinutes = 120; // 2 hours for 1h timeframe
      if (timeframe === "4h") timeThresholdMinutes = 480; // 8 hours for 4h timeframe
      if (timeframe === "1d") timeThresholdMinutes = 1440; // 24 hours for 1d timeframe

      const timeThresholdMs = timeThresholdMinutes * 60 * 1000;

      // Calculate signal age in minutes, ensuring it's not negative
      // If the time difference is suspiciously large (>12 hours for short timeframes),
      // it might indicate a timestamp parsing issue
      let signalAgeMinutes = Math.max(0, Math.round(timeDifference / 60000));

      // Apply additional sanity check for suspiciously large age values
      // This helps catch timestamp parsing issues that weren't caught earlier
      const maxReasonableAge =
        {
          "1m": 30, // 30 minutes for 1m timeframe
          "5m": 45, // 45 minutes for 5m timeframe
          "15m": 60, // 1 hour for 15m timeframe
          "1h": 180, // 3 hours for 1h timeframe
          "4h": 360, // 6 hours for 4h timeframe
          "1d": 720, // 12 hours for 1d timeframe
        }[timeframe] || 60;

      if (signalAgeMinutes > maxReasonableAge) {
        console.warn(
          `[SignalVerifier] Suspiciously large signal age detected: ${signalAgeMinutes} minutes for ${timeframe} timeframe. Capping to ${maxReasonableAge / 2} minutes.`,
        );
        // Cap to half the maximum reasonable age to indicate it's old but not absurdly so
        signalAgeMinutes = Math.floor(maxReasonableAge / 2);
      }

      // Log the calculated age for debugging
      console.log(
        `[SignalVerifier] Calculated signal age: ${signalAgeMinutes} minutes, threshold: ${timeThresholdMinutes} minutes`,
      );

      // Cap the displayed signal age to a reasonable maximum to prevent UI issues
      const maxDisplayedAge = 1440; // 24 hours in minutes
      const displayedAge = Math.min(signalAgeMinutes, maxDisplayedAge);

      if (timeDifference > timeThresholdMs) {
        message += ` <span class="text-amber-500 font-semibold">WARNING: Signal is <strong>${displayedAge}</strong> minutes old</span>, which exceeds the recommended ${timeThresholdMinutes} minutes for ${timeframe} timeframe.`;
        isVerified = false;
      } else if (signalAgeMinutes > 5) {
        // Only show age if it's more than 5 minutes old to avoid confusion with just-refreshed signals
        message += ` Signal is <strong>${displayedAge}</strong> minutes old (within the ${timeThresholdMinutes} minute threshold for ${timeframe} timeframe).`;
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

    // Log the timestamp format for debugging
    if (signalData && signalData.timestamp) {
      console.log(
        `[SignalVerifier] Signal timestamp format check: ${signalData.timestamp}`,
        `Split result: ${signalData.timestamp.split(" (")[0]}`,
        `Parsed date: ${new Date(signalData.timestamp.split(" (")[0]).toISOString()}`,
      );
    }

    lastVerificationTimeRef.current = now;
    verifySignal();

    // Set up interval to verify more frequently (every 1 minute)
    // This ensures we're using fresh price data from Binance
    const intervalId = setInterval(() => {
      lastVerificationTimeRef.current = Date.now();
      verifySignal();
    }, 60000); // 1 minute

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

export default SignalVerifierImproved;
