import {
  BinanceTradeEvent,
  BinanceKlineEvent,
} from "../services/binanceService";
import {
  prepareFeatures,
  predictSignal,
  explainPrediction,
} from "./mlPredictor";

export type SignalType = "BUY" | "SELL" | "HOLD";

export interface GeneratedSignal {
  signal: SignalType;
  entryPoint: number;
  stopLoss: number;
  targetPrice: number;
  confidence: number;
  reasoning: string;
  timestamp: string;
  mlPrediction?: {
    signal: SignalType;
    probability: number;
    explanation: string;
  };
}

// Technical indicator types
interface Indicators {
  rsi?: number;
  macdLine?: number;
  macdSignal?: number;
  macdHistogram?: number;
  vwap?: number;
  shortMA: number;
  longMA: number;
  priceDirection: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  bollingerWidth?: number;
}

// Class to store and analyze recent trade data
class TradeAnalyzer {
  // Map to store data for each symbol
  private symbolDataMap: Map<
    string,
    {
      recentTrades: BinanceTradeEvent[];
      priceHistory: number[];
      volumeHistory: number[];
      timeHistory: number[];
      lastSignal: GeneratedSignal | null;
      lastSignalTime: number;
    }
  > = new Map();

  private maxTrades = 200; // Increased to have more data for indicators
  private signalCooldown = 0; // No cooldown between signals to ensure immediate updates
  private currentSymbol = "ethusdt"; // Default symbol

  // Initialize data structure for a new symbol
  private initSymbolData(symbol: string): void {
    if (!this.symbolDataMap.has(symbol)) {
      this.symbolDataMap.set(symbol, {
        recentTrades: [],
        priceHistory: [],
        volumeHistory: [],
        timeHistory: [],
        lastSignal: null,
        lastSignalTime: 0,
      });
    }
  }

  // Set the current symbol
  public setSymbol(symbol: string): void {
    const normalizedSymbol = symbol.toLowerCase();
    this.currentSymbol = normalizedSymbol;
    this.initSymbolData(normalizedSymbol);
  }

  // Get the current symbol
  public getCurrentSymbol(): string {
    return this.currentSymbol;
  }

  // Add a new trade to the analyzer
  public addTrade(trade: BinanceTradeEvent, symbol?: string): void {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    this.initSymbolData(targetSymbol);

    const symbolData = this.symbolDataMap.get(targetSymbol)!;

    // Add the trade to the beginning of the array
    symbolData.recentTrades.unshift(trade);

    // Keep only the most recent trades
    if (symbolData.recentTrades.length > this.maxTrades) {
      symbolData.recentTrades.pop();
    }

    // Update price and volume history
    const price = parseFloat(trade.p);
    const volume = parseFloat(trade.q);
    const timestamp = parseInt(trade.T); // Trade timestamp

    symbolData.priceHistory.unshift(price);
    symbolData.volumeHistory.unshift(volume);
    symbolData.timeHistory.unshift(timestamp);

    if (symbolData.priceHistory.length > this.maxTrades) {
      symbolData.priceHistory.pop();
      symbolData.volumeHistory.pop();
      symbolData.timeHistory.pop();
    }
  }

  // Calculate all technical indicators
  private calculateIndicators(symbol?: string): Indicators | null {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (!symbolData || symbolData.recentTrades.length < 20) {
      return null;
    }

    // Simple moving averages
    const shortMA = this.calculateMA(5);
    const longMA = this.calculateMA(20);

    // Calculate RSI (14 period)
    const rsi = this.calculateRSI(14);

    // Calculate MACD (12, 26, 9)
    const macd = this.calculateMACD(12, 26, 9);

    // Calculate VWAP
    const vwap = this.calculateVWAP();

    // Calculate price direction (positive values indicate uptrend)
    const priceDirection = this.calculatePriceDirection(5);

    // Calculate Bollinger Bands (20 period, 2 standard deviations)
    const bollinger = this.calculateBollingerBands(20, 2);

    return {
      rsi,
      macdLine: macd?.macdLine,
      macdSignal: macd?.signalLine,
      macdHistogram: macd?.histogram,
      vwap,
      shortMA,
      longMA,
      priceDirection,
      bollingerUpper: bollinger?.upper,
      bollingerMiddle: bollinger?.middle,
      bollingerLower: bollinger?.lower,
      bollingerWidth: bollinger?.width,
    };
  }

  // Generate a signal based on recent trades
  public generateSignal(
    timeframe: string,
    symbol?: string,
  ): GeneratedSignal | null {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    this.initSymbolData(targetSymbol);

    const symbolData = this.symbolDataMap.get(targetSymbol)!;

    // Don't generate a new signal if we're in cooldown period
    const now = Date.now();
    if (
      symbolData.lastSignalTime > 0 &&
      now - symbolData.lastSignalTime < this.signalCooldown &&
      symbolData.lastSignal !== null
    ) {
      console.log(
        `Signal in cooldown period, returning last signal for ${targetSymbol}`,
      );
      return symbolData.lastSignal;
    }

    // No cooldown to ensure immediate signal updates
    this.signalCooldown = 0; // No cooldown

    // Need at least some trades to generate a signal
    if (symbolData.recentTrades.length < 20) {
      return null;
    }

    // Calculate all technical indicators
    const indicators = this.calculateIndicators(targetSymbol);
    if (!indicators) return null;

    // Current price is the most recent trade price
    const currentPrice = symbolData.priceHistory[0];
    indicators.currentPrice = currentPrice; // Add current price to indicators for ML model

    // Volume analysis
    const recentVolumeAvg = this.calculateVolumeMA(5, targetSymbol);
    const longerVolumeAvg = this.calculateVolumeMA(20, targetSymbol);
    const volumeIncreasing = recentVolumeAvg > longerVolumeAvg;

    // Price momentum - check more recent price changes
    const shortTermPriceChange = this.calculatePriceChange(5, targetSymbol); // Last 5 trades
    const mediumTermPriceChange = this.calculatePriceChange(10, targetSymbol); // Last 10 trades
    const longTermPriceChange = this.calculatePriceChange(20, targetSymbol); // Last 20 trades

    // Generate ML prediction with enhanced features
    const features = prepareFeatures(
      {
        ...indicators,
        recentLow: recentLow,
        recentHigh: recentHigh,
        recentVolumeAvg: recentVolumeAvg,
        longerVolumeAvg: longerVolumeAvg,
      },
      shortTermPriceChange,
      volumeIncreasing,
    );
    const mlPrediction = predictSignal(features);
    const mlExplanation = explainPrediction(mlPrediction);

    // Generate signal based on multiple indicators
    let signal: SignalType = "HOLD";
    let confidence = 50;
    let reasoning = "";

    // Extract indicators for easier reference
    const {
      rsi,
      macdLine,
      macdSignal,
      macdHistogram,
      vwap,
      shortMA,
      longMA,
      priceDirection,
      bollingerUpper,
      bollingerMiddle,
      bollingerLower,
      bollingerWidth,
    } = indicators;

    // BUY SIGNALS - Multiple conditions with different confidence levels
    let buySignals = 0;
    let buyConfidence = 0;
    let buyReasoning = "";

    // 1. RSI oversold and turning up (strong buy signal)
    if (rsi !== undefined && rsi < 30) {
      buySignals++;
      buyConfidence += 20;
      buyReasoning += `RSI is oversold (${rsi.toFixed(2)}) indicating potential bullish reversal. `;
    }

    // 2. MACD crossover (buy signal)
    if (
      macdLine !== undefined &&
      macdSignal !== undefined &&
      macdHistogram !== undefined &&
      macdHistogram > 0 &&
      macdLine > macdSignal
    ) {
      buySignals++;
      buyConfidence += 15;
      buyReasoning += `MACD line (${macdLine.toFixed(4)}) crossed above signal line (${macdSignal.toFixed(4)}). `;
    }

    // 3. Price above VWAP (bullish)
    if (vwap !== undefined && currentPrice > vwap) {
      buySignals++;
      buyConfidence += 10;
      buyReasoning += `Price (${currentPrice.toFixed(4)}) is above VWAP (${vwap.toFixed(4)}). `;
    }

    // 4. Moving average crossover (bullish)
    if (shortMA > longMA) {
      buySignals++;
      buyConfidence += 15;
      buyReasoning += `Short-term MA (${shortMA.toFixed(4)}) above long-term MA (${longMA.toFixed(4)}). `;
    }

    // 5. Strong price momentum
    if (shortTermPriceChange > 0.005) {
      buySignals++;
      buyConfidence += 10;
      buyReasoning += `Strong positive price action (${(shortTermPriceChange * 100).toFixed(2)}%). `;
    }

    // 6. Volume confirmation
    if (volumeIncreasing) {
      buySignals++;
      buyConfidence += 5;
      buyReasoning += `Increasing volume supports uptrend. `;
    }

    // 7. Bollinger Bands - price near lower band (potential buy)
    if (bollingerLower !== undefined && currentPrice < bollingerLower * 1.01) {
      buySignals++;
      buyConfidence += 15;
      buyReasoning += `Price (${currentPrice.toFixed(4)}) is near/below Bollinger lower band (${bollingerLower.toFixed(4)}), indicating oversold condition with potential upward reversion. `;
    }

    // 8. Bollinger Band squeeze (low volatility often precedes breakout)
    if (bollingerWidth !== undefined && bollingerWidth < 0.03) {
      // Only add this as a buy signal if other bullish indicators exist
      if (
        priceDirection > 0 ||
        (macdHistogram !== undefined && macdHistogram > 0)
      ) {
        buySignals++;
        buyConfidence += 10;
        buyReasoning += `Bollinger Band squeeze detected (width: ${bollingerWidth.toFixed(4)}), indicating low volatility with potential for significant upward breakout. `;
      }
    }

    // SELL SIGNALS - Multiple conditions with different confidence levels
    let sellSignals = 0;
    let sellConfidence = 0;
    let sellReasoning = "";

    // 1. RSI overbought and turning down (strong sell signal)
    if (rsi !== undefined && rsi > 70) {
      sellSignals++;
      sellConfidence += 20;
      sellReasoning += `RSI is overbought (${rsi.toFixed(2)}) indicating potential bearish reversal. `;
    }

    // 2. MACD crossover (sell signal)
    if (
      macdLine !== undefined &&
      macdSignal !== undefined &&
      macdHistogram !== undefined &&
      macdHistogram < 0 &&
      macdLine < macdSignal
    ) {
      sellSignals++;
      sellConfidence += 15;
      sellReasoning += `MACD line (${macdLine.toFixed(4)}) crossed below signal line (${macdSignal.toFixed(4)}). `;
    }

    // 3. Price below VWAP (bearish)
    if (vwap !== undefined && currentPrice < vwap) {
      sellSignals++;
      sellConfidence += 10;
      sellReasoning += `Price (${currentPrice.toFixed(4)}) is below VWAP (${vwap.toFixed(4)}). `;
    }

    // 4. Moving average crossover (bearish)
    if (shortMA < longMA) {
      sellSignals++;
      sellConfidence += 15;
      sellReasoning += `Short-term MA (${shortMA.toFixed(4)}) below long-term MA (${longMA.toFixed(4)}). `;
    }

    // 5. Strong negative price momentum
    if (shortTermPriceChange < -0.005) {
      sellSignals++;
      sellConfidence += 10;
      sellReasoning += `Strong negative price action (${(shortTermPriceChange * 100).toFixed(2)}%). `;
    }

    // 6. Volume confirmation for downtrend
    if (volumeIncreasing && shortTermPriceChange < 0) {
      sellSignals++;
      sellConfidence += 5;
      sellReasoning += `Increasing volume supports downtrend. `;
    }

    // 7. Bollinger Bands - price near upper band (potential sell)
    if (bollingerUpper !== undefined && currentPrice > bollingerUpper * 0.99) {
      sellSignals++;
      sellConfidence += 15;
      sellReasoning += `Price (${currentPrice.toFixed(4)}) is near/above Bollinger upper band (${bollingerUpper.toFixed(4)}), indicating overbought condition with potential downward reversion. `;
    }

    // 8. Bollinger Band squeeze (low volatility often precedes breakout)
    if (bollingerWidth !== undefined && bollingerWidth < 0.03) {
      // Only add this as a sell signal if other bearish indicators exist
      if (
        priceDirection < 0 ||
        (macdHistogram !== undefined && macdHistogram < 0)
      ) {
        sellSignals++;
        sellConfidence += 10;
        sellReasoning += `Bollinger Band squeeze detected (width: ${bollingerWidth.toFixed(4)}), indicating low volatility with potential for significant downward breakout. `;
      }
    }

    // Decision logic - require at least 3 signals for a BUY or SELL with stronger threshold
    if (buySignals >= 3 && buySignals > sellSignals + 2) {
      signal = "BUY";
      confidence = Math.min(90, 50 + buyConfidence);
      reasoning = `BUY signal based on ${buySignals} technical indicators. ${buyReasoning}`;
    } else if (sellSignals >= 3 && sellSignals > buySignals + 2) {
      signal = "SELL";
      confidence = Math.min(90, 50 + sellConfidence);
      reasoning = `SELL signal based on ${sellSignals} technical indicators. ${sellReasoning}`;
    } else {
      // Default to HOLD when signals are mixed or weak
      signal = "HOLD";
      confidence = 50;
      reasoning =
        "Mixed or insufficient signals detected. Waiting for clearer trend confirmation before taking action.";

      // Add some context about the conflicting signals
      if (buySignals > 0 || sellSignals > 0) {
        reasoning += ` (Buy signals: ${buySignals}, Sell signals: ${sellSignals})`;
      }

      // Check if we have a previous signal and maintain it with reduced confidence if it's recent
      if (
        symbolData.lastSignal &&
        now - symbolData.lastSignalTime < 1800000 && // 30 minutes
        (symbolData.lastSignal.signal === "BUY" ||
          symbolData.lastSignal.signal === "SELL")
      ) {
        // Maintain previous signal but with reduced confidence
        signal = symbolData.lastSignal.signal;
        confidence = Math.max(50, symbolData.lastSignal.confidence - 5); // Gradually reduce confidence
        reasoning = `Maintaining previous ${signal} signal with reduced confidence. ${reasoning}`;
      }
    }

    // Calculate entry point, stop loss, and target price with improved accuracy
    const entryPoint = currentPrice;

    // For BUY signals: stop loss below recent low, target above based on dynamic risk/reward
    // For SELL signals: stop loss above recent high, target below based on dynamic risk/reward

    // Use more data points for recent highs/lows based on volatility
    const volatilityFactor =
      bollingerWidth !== undefined
        ? Math.max(10, Math.min(50, Math.round(50 * bollingerWidth)))
        : 20;

    const recentLow = Math.min(
      ...symbolData.priceHistory.slice(0, volatilityFactor),
    );
    const recentHigh = Math.max(
      ...symbolData.priceHistory.slice(0, volatilityFactor),
    );

    // Calculate price volatility as a percentage
    const priceRange = recentHigh - recentLow;
    const volatilityPercentage = priceRange / entryPoint;

    // Adjust stop loss distance based on volatility and ML confidence
    let stopLossBuffer = Math.max(
      0.005,
      Math.min(0.03, volatilityPercentage * 0.5),
    );

    // If ML model has high confidence and agrees with the signal, we can tighten the stop loss
    // If ML model disagrees or has low confidence, we should widen the stop loss for safety
    if (mlPrediction && mlPrediction.probability > 0.6) {
      if (mlPrediction.predictedSignal === signal) {
        // ML agrees with technical indicators - can tighten stop loss slightly
        stopLossBuffer *= 1 - (mlPrediction.probability - 0.6) * 0.5; // Up to 20% tighter
      } else if (mlPrediction.probability > 0.75) {
        // ML strongly disagrees - widen stop loss for safety
        stopLossBuffer *= 1 + (mlPrediction.probability - 0.6) * 0.75; // Up to 30% wider
      }
    }

    // Calculate dynamic risk-reward ratio based on signal strength, market conditions, and ML confidence
    // Higher confidence = higher risk-reward ratio
    let dynamicRiskRewardRatio;

    // Base risk-reward ratio based on technical indicator signals
    if (buySignals >= 5 || sellSignals >= 5) {
      // Strong signal = higher risk-reward
      dynamicRiskRewardRatio = 3.0;
    } else if (buySignals >= 4 || sellSignals >= 4) {
      dynamicRiskRewardRatio = 2.5;
    } else {
      // Default risk-reward ratio
      dynamicRiskRewardRatio = 2.0;
    }

    // Adjust risk-reward ratio based on ML model confidence if available
    if (mlPrediction && mlPrediction.probability > 0.5) {
      // Scale the adjustment based on how confident the ML model is (0.5 to 1.0)
      // Higher ML confidence increases the risk-reward ratio
      const mlConfidenceAdjustment = (mlPrediction.probability - 0.5) * 2; // 0 to 1 scale

      // Apply a weighted adjustment to the risk-reward ratio
      // More weight to ML prediction when it strongly agrees with the signal
      if (mlPrediction.predictedSignal === signal) {
        // ML agrees with technical indicators - boost risk-reward ratio
        dynamicRiskRewardRatio *= 1 + mlConfidenceAdjustment * 0.5; // Up to 50% increase
      } else if (mlPrediction.probability > 0.8) {
        // ML strongly disagrees - reduce risk-reward ratio
        dynamicRiskRewardRatio *= 1 - mlConfidenceAdjustment * 0.3; // Up to 30% decrease
      }

      // Cap the risk-reward ratio to reasonable limits
      dynamicRiskRewardRatio = Math.max(
        1.5,
        Math.min(4.0, dynamicRiskRewardRatio),
      );
    }

    // Adjust risk-reward ratio based on volatility
    // Higher volatility = slightly lower risk-reward ratio to account for increased risk
    if (bollingerWidth !== undefined) {
      if (bollingerWidth > 0.05) {
        // High volatility
        dynamicRiskRewardRatio *= 0.9;
      } else if (bollingerWidth < 0.02) {
        // Low volatility
        dynamicRiskRewardRatio *= 1.1;
      }
    }

    // Final cap on risk-reward ratio to ensure it stays within reasonable bounds
    dynamicRiskRewardRatio = Math.max(
      1.5,
      Math.min(4.0, dynamicRiskRewardRatio),
    );

    let stopLoss, targetPrice;

    if (signal === "BUY") {
      // For BUY: stop loss below recent low with buffer
      stopLoss = recentLow * (1 - stopLossBuffer);

      // Ensure stop loss is not too far from entry (max 10%)
      stopLoss = Math.max(entryPoint * 0.9, stopLoss);

      const risk = entryPoint - stopLoss;
      targetPrice = entryPoint + risk * dynamicRiskRewardRatio;

      // Apply ML confidence to fine-tune target price
      if (
        mlPrediction &&
        mlPrediction.predictedSignal === "BUY" &&
        mlPrediction.probability > 0.7
      ) {
        // If ML strongly agrees with BUY, we can be more aggressive with target
        const mlBoost = (mlPrediction.probability - 0.7) * 3.33; // 0 to 1 scale for 0.7 to 1.0 probability
        targetPrice =
          entryPoint + risk * dynamicRiskRewardRatio * (1 + mlBoost * 0.2); // Up to 20% higher target
      }
    } else if (signal === "SELL") {
      // For SELL: stop loss above recent high with buffer
      stopLoss = recentHigh * (1 + stopLossBuffer);

      // Ensure stop loss is not too far from entry (max 10%)
      stopLoss = Math.min(entryPoint * 1.1, stopLoss);

      const risk = stopLoss - entryPoint;
      targetPrice = entryPoint - risk * dynamicRiskRewardRatio;

      // Apply ML confidence to fine-tune target price
      if (
        mlPrediction &&
        mlPrediction.predictedSignal === "SELL" &&
        mlPrediction.probability > 0.7
      ) {
        // If ML strongly agrees with SELL, we can be more aggressive with target
        const mlBoost = (mlPrediction.probability - 0.7) * 3.33; // 0 to 1 scale for 0.7 to 1.0 probability
        targetPrice =
          entryPoint - risk * dynamicRiskRewardRatio * (1 + mlBoost * 0.2); // Up to 20% lower target
      }
    } else {
      // For HOLD signals: use more conservative values
      let holdRiskPercentage = Math.max(
        0.03,
        Math.min(0.07, volatilityPercentage),
      );

      // If ML model has high confidence in HOLD, adjust the risk percentage
      if (
        mlPrediction &&
        mlPrediction.predictedSignal === "HOLD" &&
        mlPrediction.probability > 0.6
      ) {
        // Reduce risk percentage when ML is confident about HOLD
        holdRiskPercentage *= 1 - (mlPrediction.probability - 0.6) * 0.5; // Up to 20% reduction
      }

      stopLoss = entryPoint * (1 - holdRiskPercentage);
      targetPrice = entryPoint * (1 + holdRiskPercentage * 1.5);
    }

    // Format timestamp with timeframe
    const date = new Date();
    const timestamp = `${date.toISOString().replace("T", " ").slice(0, 19)} (${timeframe})`;

    // Create the signal
    const generatedSignal: GeneratedSignal = {
      signal,
      entryPoint,
      stopLoss,
      targetPrice,
      confidence,
      reasoning,
      timestamp,
      mlPrediction: {
        signal: mlPrediction.predictedSignal,
        probability: mlPrediction.probability,
        explanation: mlExplanation,
      },
    };

    // Adjust confidence based on ML prediction if signals match
    if (signal === mlPrediction.predictedSignal) {
      // Increase confidence when ML agrees with technical indicators
      const mlConfidenceBoost = Math.round(mlPrediction.probability * 10);
      generatedSignal.confidence = Math.min(95, confidence + mlConfidenceBoost);
      generatedSignal.reasoning += ` ML model confirms ${signal} signal with ${Math.round(mlPrediction.probability * 100)}% probability.`;
    } else if (mlPrediction.probability > 0.7) {
      // If ML strongly disagrees, add a note but don't change the signal
      generatedSignal.reasoning += ` Note: ML model suggests ${mlPrediction.predictedSignal} with ${Math.round(mlPrediction.probability * 100)}% probability, but technical analysis indicates ${signal}.`;
    }

    // Update last signal and time
    symbolData.lastSignal = generatedSignal;
    symbolData.lastSignalTime = now;

    return generatedSignal;
  }

  // Calculate simple moving average of prices
  private calculateMA(period: number, symbol?: string): number {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (!symbolData || symbolData.priceHistory.length < period) {
      return symbolData?.priceHistory[0] || 0;
    }

    const sum = symbolData.priceHistory
      .slice(0, period)
      .reduce((a, b) => a + b, 0);
    return sum / period;
  }

  // Calculate simple moving average of volumes
  private calculateVolumeMA(period: number, symbol?: string): number {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (!symbolData || symbolData.volumeHistory.length < period) {
      return symbolData?.volumeHistory[0] || 0;
    }

    const sum = symbolData.volumeHistory
      .slice(0, period)
      .reduce((a, b) => a + b, 0);
    return sum / period;
  }

  // Calculate percentage price change over a period
  private calculatePriceChange(period: number, symbol?: string): number {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (!symbolData || symbolData.priceHistory.length < period) {
      return 0;
    }

    const currentPrice = symbolData.priceHistory[0];
    const oldPrice = symbolData.priceHistory[period - 1];

    // Avoid division by zero
    if (oldPrice === 0) return 0;

    return (currentPrice - oldPrice) / oldPrice;
  }

  // Calculate price direction based on recent candles
  private calculatePriceDirection(period: number = 5, symbol?: string): number {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (!symbolData || symbolData.priceHistory.length < period) {
      return 0;
    }

    // Count how many price increases vs decreases in the recent period
    let increases = 0;
    let decreases = 0;

    for (let i = 0; i < period - 1; i++) {
      if (symbolData.priceHistory[i] > symbolData.priceHistory[i + 1]) {
        increases++;
      } else if (symbolData.priceHistory[i] < symbolData.priceHistory[i + 1]) {
        decreases++;
      }
    }

    // Return a value between -1 and 1 indicating direction strength
    return (increases - decreases) / period;
  }

  // Calculate Relative Strength Index (RSI)
  private calculateRSI(
    period: number = 14,
    symbol?: string,
  ): number | undefined {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (!symbolData || symbolData.priceHistory.length < period + 1) {
      return undefined;
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain and loss
    for (let i = 0; i < period; i++) {
      const change =
        symbolData.priceHistory[i] - symbolData.priceHistory[i + 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change; // Make losses positive
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  // Calculate Moving Average Convergence Divergence (MACD)
  private calculateMACD(
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
    symbol?: string,
  ): { macdLine: number; signalLine: number; histogram: number } | undefined {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (
      !symbolData ||
      symbolData.priceHistory.length < slowPeriod + signalPeriod
    ) {
      return undefined;
    }

    // Calculate EMA for fast period
    const fastEMA = this.calculateEMA(fastPeriod, targetSymbol);

    // Calculate EMA for slow period
    const slowEMA = this.calculateEMA(slowPeriod, targetSymbol);

    // MACD Line = Fast EMA - Slow EMA
    const macdLine = fastEMA - slowEMA;

    // Calculate Signal Line (EMA of MACD Line)
    // For simplicity, we'll use a simple approximation here
    const signalLine = macdLine * 0.9; // Simplified approximation

    // MACD Histogram = MACD Line - Signal Line
    const histogram = macdLine - signalLine;

    return { macdLine, signalLine, histogram };
  }

  // Calculate Exponential Moving Average (EMA)
  private calculateEMA(period: number, symbol?: string): number {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (!symbolData || symbolData.priceHistory.length < period) {
      return this.calculateMA(period, targetSymbol);
    }

    // Start with SMA for the first period
    let ema = this.calculateMA(period, targetSymbol);

    // Multiplier: (2 / (period + 1))
    const multiplier = 2 / (period + 1);

    // Calculate EMA: {Close - EMA(previous day)} x multiplier + EMA(previous day)
    for (let i = period - 1; i >= 0; i--) {
      ema = (symbolData.priceHistory[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  // Calculate Bollinger Bands
  private calculateBollingerBands(
    period: number = 20,
    stdDev: number = 2,
    symbol?: string,
  ):
    | { upper: number; middle: number; lower: number; width: number }
    | undefined {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (!symbolData || symbolData.priceHistory.length < period) {
      return undefined;
    }

    // Calculate the middle band (SMA)
    const middle = this.calculateMA(period, targetSymbol);

    // Calculate standard deviation
    const prices = symbolData.priceHistory.slice(0, period);
    const squaredDifferences = prices.map((price) =>
      Math.pow(price - middle, 2),
    );
    const variance =
      squaredDifferences.reduce((sum, val) => sum + val, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    // Calculate upper and lower bands
    const upper = middle + standardDeviation * stdDev;
    const lower = middle - standardDeviation * stdDev;

    // Calculate Bollinger Band width (normalized by middle band)
    const width = (upper - lower) / middle;

    return { upper, middle, lower, width };
  }

  // Calculate Volume Weighted Average Price (VWAP)
  private calculateVWAP(symbol?: string): number | undefined {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);

    if (
      !symbolData ||
      symbolData.priceHistory.length < 10 ||
      symbolData.volumeHistory.length < 10
    ) {
      return undefined;
    }

    let cumulativeTPV = 0; // Total of Price * Volume
    let cumulativeVolume = 0; // Total Volume

    // Calculate for the available data points
    const dataPoints = Math.min(
      symbolData.priceHistory.length,
      symbolData.volumeHistory.length,
    );

    for (let i = 0; i < dataPoints; i++) {
      const price = symbolData.priceHistory[i];
      const volume = symbolData.volumeHistory[i];

      cumulativeTPV += price * volume;
      cumulativeVolume += volume;
    }

    // Avoid division by zero
    if (cumulativeVolume === 0) return undefined;

    return cumulativeTPV / cumulativeVolume;
  }

  // Get the current price
  public getCurrentPrice(symbol?: string): number {
    const targetSymbol = symbol ? symbol.toLowerCase() : this.currentSymbol;
    const symbolData = this.symbolDataMap.get(targetSymbol);
    return symbolData?.priceHistory[0] || 0;
  }

  // Clear data for a specific symbol
  public clear(symbol?: string): void {
    if (symbol) {
      const targetSymbol = symbol.toLowerCase();
      this.symbolDataMap.delete(targetSymbol);
    } else {
      // Clear all data
      this.symbolDataMap.clear();
    }
  }
}

// Create a singleton instance
const tradeAnalyzer = new TradeAnalyzer();

// Function to process a new trade and potentially generate a signal
export function processTrade(
  trade: BinanceTradeEvent,
  timeframe: string,
  symbol?: string,
): GeneratedSignal | null {
  const targetSymbol = symbol || trade.s.toLowerCase();
  tradeAnalyzer.addTrade(trade, targetSymbol);
  return tradeAnalyzer.generateSignal(timeframe, targetSymbol);
}

// Function to get the current price
export function getCurrentPrice(symbol?: string): number {
  return tradeAnalyzer.getCurrentPrice(symbol);
}

// Function to clear the analyzer data
export function clearAnalyzerData(symbol?: string): void {
  tradeAnalyzer.clear(symbol);
}

// Function to set the current symbol
export function setAnalyzerSymbol(symbol: string): void {
  tradeAnalyzer.setSymbol(symbol);
}
