import React, { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  timeframe: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  timeframe,
}) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      // Clear any existing chart
      container.current.innerHTML = "";

      // Create a unique container ID to prevent conflicts
      const containerId = `tv_chart_container_${Date.now()}`;
      container.current.id = containerId;

      // Format symbol for TradingView
      // Check if symbol already includes exchange prefix
      const formattedSymbol = symbol.includes(":")
        ? symbol
        : `BINANCE:${symbol}`;
      console.log(`[TradingViewChart] Loading chart for ${formattedSymbol}`);

      // Load data from TradingView with advanced options
      const tvWidget = new window.TradingView.widget({
        container_id: containerId,
        autosize: true,
        symbol: formattedSymbol,
        interval: timeframe,
        timezone: "Etc/UTC",
        theme: "Dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#1E1E1E",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
        loading_screen: {
          backgroundColor: "#1E1E1E",
          foregroundColor: "#2962FF",
        },
        disabled_features: ["use_localstorage_for_settings"],
        enabled_features: ["study_templates"],
        overrides: {
          "mainSeriesProperties.candleStyle.upColor": "#26a69a",
          "mainSeriesProperties.candleStyle.downColor": "#ef5350",
          "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
        },
        time_frames: [
          { text: "1d", resolution: "1" },
          { text: "1w", resolution: "15" },
          { text: "1m", resolution: "60" },
          { text: "3m", resolution: "120" },
          { text: "6m", resolution: "1D" },
          { text: "1y", resolution: "1W" },
          { text: "5y", resolution: "1M" },
        ],
      });

      // Add event listener for when the chart is ready
      const handleChartReady = () => {
        console.log(
          `TradingView chart ready for ${symbol} on ${timeframe} timeframe`,
        );
      };

      if (tvWidget.iframe) {
        tvWidget.iframe.addEventListener("load", handleChartReady);
      }

      return () => {
        // Clean up the widget
        if (tvWidget && tvWidget.iframe) {
          tvWidget.iframe.removeEventListener("load", handleChartReady);
          try {
            // Try to use the official cleanup method
            if (typeof tvWidget.remove === "function") {
              tvWidget.remove();
            } else {
              // Fallback to manual cleanup
              tvWidget.iframe.remove();
            }
          } catch (e) {
            console.error("Error cleaning up TradingView widget:", e);
          }
        }
      };
    }
  }, [symbol, timeframe]);

  return (
    <div
      ref={container}
      className="w-full h-full min-h-[500px] bg-gradient-card rounded-md overflow-hidden shadow-md border border-border/30"
    />
  );
};

export default TradingViewChart;
