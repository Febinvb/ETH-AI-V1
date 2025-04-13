import React, { useEffect, useRef, useState } from "react";
import { getSignal, refreshSignal, SignalData } from "@/api/signal";

interface TradingViewProps {
  symbol?: string;
  interval?: string;
  theme?: "light" | "dark";
  autosize?: boolean;
  height?: number;
  width?: number;
  timeframe?: string;
  onSignalUpdate?: (signal: SignalData) => void;
  onSymbolChange?: (symbol: string) => void;
}

const TradingView = ({
  symbol = "BINANCE:ETHUSDT",
  interval = "15",
  theme = "dark",
  autosize = true,
  height = 500,
  width = 1000,
  timeframe = "15m",
  onSignalUpdate,
  onSymbolChange,
}: TradingViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [currentTimeframe, setCurrentTimeframe] = useState(timeframe);
  const [currentSymbol, setCurrentSymbol] = useState(symbol);

  // Map UI timeframe to TradingView interval
  const getIntervalFromTimeframe = (tf: string): string => {
    switch (tf) {
      case "1m":
        return "1";
      case "5m":
        return "5";
      case "15m":
        return "15";
      case "1h":
        return "60";
      case "4h":
        return "240";
      case "1d":
        return "D";
      default:
        return "15";
    }
  };

  // Fetch signal data when timeframe or symbol changes
  useEffect(() => {
    const fetchSignalData = async () => {
      setLoading(true);
      try {
        const data = await getSignal(
          currentTimeframe,
          currentSymbol.includes(":")
            ? currentSymbol.split(":")[1]
            : currentSymbol,
        );
        if (onSignalUpdate) {
          onSignalUpdate(data);
        }
      } catch (error) {
        console.error("Error fetching signal data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignalData();
  }, [currentTimeframe, currentSymbol, onSignalUpdate]);

  // Update interval when timeframe changes
  useEffect(() => {
    setCurrentTimeframe(timeframe);
  }, [timeframe]);

  // Update symbol when it changes from props
  useEffect(() => {
    setCurrentSymbol(symbol);
    // When symbol changes from props, also notify parent component
    if (onSymbolChange && symbol !== currentSymbol) {
      const plainSymbol = symbol.includes(":") ? symbol.split(":")[1] : symbol;
      onSymbolChange(plainSymbol);
    }
  }, [symbol, onSymbolChange, currentSymbol]);

  useEffect(() => {
    // Clean up any existing widgets
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    // Create the TradingView widget script
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== "undefined" && containerRef.current) {
        new window.TradingView.widget({
          container_id: containerRef.current.id,
          symbol: currentSymbol,
          interval: getIntervalFromTimeframe(currentTimeframe),
          timezone: "Etc/UTC",
          theme: theme,
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          save_image: false,
          studies: [
            "RSI@tv-basicstudies",
            "MACD@tv-basicstudies",
            "Volume@tv-basicstudies",
            "VWAP@tv-basicstudies",
          ],
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
          autosize: autosize,
          height: height,
          width: width,
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      // Clean up
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [currentSymbol, currentTimeframe, theme, autosize, height, width]);

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tfMap: Record<string, string> = {
      "1": "1m",
      "5": "5m",
      "15": "15m",
      "60": "1h",
      "240": "4h",
      D: "1d",
    };
    setCurrentTimeframe(tfMap[e.target.value] || "15m");
  };

  const handleRefresh = () => {
    // Re-fetch signal data
    setLoading(true);
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
    const plainSymbol = currentSymbol.includes(":")
      ? currentSymbol.split(":")[1]
      : currentSymbol;
    refreshSignal(currentTimeframe, plainSymbol)
      .then((data) => {
        if (onSignalUpdate) {
          onSignalUpdate(data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error refreshing signal data:", error);
        setLoading(false);
      });
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSymbol = e.target.value;
    setCurrentSymbol(newSymbol);
    if (onSymbolChange) {
      const plainSymbol = newSymbol.includes(":")
        ? newSymbol.split(":")[1]
        : newSymbol;
      onSymbolChange(plainSymbol);
    }

    // When symbol changes, we need to refresh the signal data
    setLoading(true);
    const plainSymbol = newSymbol.includes(":")
      ? newSymbol.split(":")[1]
      : newSymbol;
    getSignal(currentTimeframe, plainSymbol)
      .then((data) => {
        if (onSignalUpdate) {
          onSignalUpdate(data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching signal data for new symbol:", error);
        setLoading(false);
      });
  };

  return (
    <div className="w-full h-full bg-card rounded-lg shadow-md overflow-hidden border border-border">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {currentSymbol.replace("BINANCE:", "")} Chart
        </h2>
        <div className="flex space-x-2">
          <select
            className="bg-background text-foreground text-sm rounded-md border border-input px-2 py-1"
            value={currentSymbol}
            onChange={handleSymbolChange}
          >
            <option value="BINANCE:ETHUSDT">ETH/USDT</option>
            <option value="BINANCE:BTCUSDT">BTC/USDT</option>
            <option value="BINANCE:SOLUSDT">SOL/USDT</option>
            <option value="BINANCE:BNBUSDT">BNB/USDT</option>
            <option value="BINANCE:ADAUSDT">ADA/USDT</option>
            <option value="BINANCE:DOGEUSDT">DOGE/USDT</option>
            <option value="BINANCE:XRPUSDT">XRP/USDT</option>
            <option value="BINANCE:DOTUSDT">DOT/USDT</option>
            <option value="BINANCE:LINKUSDT">LINK/USDT</option>
            <option value="BINANCE:MATICUSDT">MATIC/USDT</option>
            <option value="BINANCE:AVAXUSDT">AVAX/USDT</option>
          </select>
          <select
            className="bg-background text-foreground text-sm rounded-md border border-input px-2 py-1"
            value={getIntervalFromTimeframe(currentTimeframe)}
            onChange={handleTimeframeChange}
          >
            <option value="1">1m</option>
            <option value="5">5m</option>
            <option value="15">15m</option>
            <option value="60">1h</option>
            <option value="240">4h</option>
            <option value="D">1d</option>
          </select>
          <button
            className="bg-primary text-primary-foreground text-sm rounded-md px-3 py-1 flex items-center"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>
      <div
        id="tradingview_widget"
        ref={containerRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};

// Add TypeScript declaration for TradingView
declare global {
  interface Window {
    TradingView: {
      widget: new (config: any) => any;
    };
  }
}

export default TradingView;
