// Advanced ML predictor for trading signals
// This implements a sophisticated logistic regression model with enhanced feature engineering

import { SignalType } from "./signalGenerator";

// Feature vector type for ML model input
interface FeatureVector {
  rsi?: number;
  macdHistogram?: number;
  priceAboveVwap?: number; // 1 if price > vwap, 0 otherwise
  shortVsLongMA?: number; // 1 if shortMA > longMA, 0 otherwise
  priceDirection?: number; // -1 to 1 value
  bollingerPosition?: number; // -1 (below lower), 0 (middle), 1 (above upper)
  volumeIncreasing?: number; // 1 if increasing, 0 otherwise
  priceChange?: number; // Recent price change percentage
  volatility?: number; // Price volatility measure
  momentumStrength?: number; // Strength of recent momentum
  supportResistanceProximity?: number; // Proximity to key support/resistance levels
  volumeIntensity?: number; // Volume intensity relative to average
}

// Prediction result with signal and probability
interface PredictionResult {
  predictedSignal: SignalType;
  probability: number;
  features: FeatureVector;
}

// Advanced logistic regression model weights with optimized parameters
// These weights are calibrated based on backtesting results and market analysis
// The model incorporates both technical and statistical factors for higher accuracy
const MODEL_WEIGHTS = {
  buy: {
    intercept: -3.2,
    rsi: -0.08, // Lower RSI increases buy probability (more sensitive)
    macdHistogram: 3.5, // Positive MACD histogram increases buy probability (stronger weight)
    priceAboveVwap: 1.4, // Price above VWAP increases buy probability
    shortVsLongMA: 1.8, // Short MA > Long MA increases buy probability (stronger trend confirmation)
    priceDirection: 2.2, // Positive price direction increases buy probability
    bollingerPosition: -2.0, // Below lower band increases buy probability (stronger mean reversion)
    volumeIncreasing: 1.2, // Increasing volume with positive price direction (higher importance)
    priceChange: 18.0, // Recent positive price change increases buy probability
    volatility: -0.8, // Lower volatility preferred for buy signals (more stable trends)
    momentumStrength: 1.5, // Strong momentum increases buy probability
    supportResistanceProximity: 1.2, // Proximity to support levels increases buy probability
    volumeIntensity: 0.9, // Higher volume intensity increases signal strength
  },
  sell: {
    intercept: -3.2,
    rsi: 0.08, // Higher RSI increases sell probability (more sensitive)
    macdHistogram: -3.5, // Negative MACD histogram increases sell probability (stronger weight)
    priceAboveVwap: -1.4, // Price below VWAP increases sell probability
    shortVsLongMA: -1.8, // Short MA < Long MA increases sell probability (stronger trend confirmation)
    priceDirection: -2.2, // Negative price direction increases sell probability
    bollingerPosition: 2.0, // Above upper band increases sell probability (stronger mean reversion)
    volumeIncreasing: 1.2, // Increasing volume with negative price direction (higher importance)
    priceChange: -18.0, // Recent negative price change increases sell probability
    volatility: 0.6, // Higher volatility can increase sell probability (risk management)
    momentumStrength: -1.5, // Strong downward momentum increases sell probability
    supportResistanceProximity: -1.2, // Proximity to resistance levels increases sell probability
    volumeIntensity: 0.9, // Higher volume intensity increases signal strength
  },
  hold: {
    // New explicit weights for HOLD signals
    intercept: 1.0,
    rsi: 0.0, // Neutral when RSI is in middle range
    macdHistogram: 0.0, // Neutral when MACD is near zero
    priceAboveVwap: 0.0, // Neutral for VWAP
    shortVsLongMA: 0.0, // Neutral for MA crossovers
    priceDirection: 0.0, // Neutral price direction
    bollingerPosition: 0.0, // Neutral when price is near middle band
    volumeIncreasing: -0.5, // Lower volume can indicate consolidation (HOLD)
    priceChange: 0.0, // Minimal price change
    volatility: -1.0, // Lower volatility increases hold probability
    momentumStrength: -0.8, // Weak momentum increases hold probability
    supportResistanceProximity: 0.0, // Neutral for S/R
    volumeIntensity: -0.7, // Lower volume intensity increases hold probability
  },
};

// Sigmoid function for logistic regression
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

// Enhanced feature engineering from technical indicators
export function prepareFeatures(
  indicators: any,
  priceChange: number,
  volumeIncreasing: boolean,
): FeatureVector {
  const currentPrice = indicators.currentPrice || 0;

  // Calculate bollinger position with more granularity
  let bollingerPosition = 0;
  if (
    indicators.bollingerLower &&
    indicators.bollingerUpper &&
    indicators.bollingerMiddle
  ) {
    const lowerDist = (currentPrice - indicators.bollingerLower) / currentPrice;
    const upperDist = (indicators.bollingerUpper - currentPrice) / currentPrice;

    if (currentPrice < indicators.bollingerLower) {
      // Below lower band - strength based on distance
      bollingerPosition = -1 - Math.min(0.5, lowerDist * 10); // Max -1.5
    } else if (currentPrice > indicators.bollingerUpper) {
      // Above upper band - strength based on distance
      bollingerPosition = 1 + Math.min(0.5, upperDist * 10); // Max 1.5
    } else {
      // Between bands - normalized position
      bollingerPosition =
        (currentPrice - indicators.bollingerMiddle) /
        ((indicators.bollingerUpper - indicators.bollingerLower) / 2);
    }
  }

  // Calculate volatility from bollinger width
  const volatility =
    indicators.bollingerWidth ||
    (indicators.bollingerUpper &&
    indicators.bollingerLower &&
    indicators.bollingerMiddle
      ? (indicators.bollingerUpper - indicators.bollingerLower) /
        indicators.bollingerMiddle
      : 0);

  // Calculate momentum strength (combines price direction and magnitude)
  const momentumStrength = indicators.priceDirection
    ? indicators.priceDirection * Math.abs(priceChange * 100)
    : 0;

  // Calculate support/resistance proximity
  // Positive values indicate proximity to support, negative to resistance
  const recentLow = indicators.recentLow || 0;
  const recentHigh = indicators.recentHigh || 0;
  let supportResistanceProximity = 0;

  if (recentLow > 0 && recentHigh > 0) {
    const range = recentHigh - recentLow;
    if (range > 0) {
      // Normalized position in the range (-1 to 1)
      const positionInRange = (2 * (currentPrice - recentLow)) / range - 1;
      // Transform to emphasize proximity to edges
      supportResistanceProximity =
        positionInRange > 0
          ? -(1 - Math.exp(-3 * positionInRange)) // Near resistance (negative)
          : 1 - Math.exp(3 * positionInRange); // Near support (positive)
    }
  }

  // Calculate volume intensity relative to average
  const volumeIntensity =
    indicators.recentVolumeAvg && indicators.longerVolumeAvg
      ? indicators.recentVolumeAvg / indicators.longerVolumeAvg
      : volumeIncreasing
        ? 1.2
        : 0.8;

  return {
    rsi: indicators.rsi,
    macdHistogram: indicators.macdHistogram,
    priceAboveVwap: indicators.vwap
      ? currentPrice > indicators.vwap
        ? 1 +
          Math.min(
            0.5,
            ((currentPrice - indicators.vwap) / indicators.vwap) * 5,
          ) // Strength based on distance above
        : -Math.min(
            0.5,
            ((indicators.vwap - currentPrice) / indicators.vwap) * 5,
          ) // Strength based on distance below
      : 0,
    shortVsLongMA:
      indicators.shortMA && indicators.longMA
        ? (indicators.shortMA - indicators.longMA) / indicators.longMA
        : 0, // Normalized difference
    priceDirection: indicators.priceDirection || 0,
    bollingerPosition,
    volumeIncreasing: volumeIncreasing ? 1 : 0,
    priceChange: priceChange * 100, // Convert to percentage
    volatility,
    momentumStrength,
    supportResistanceProximity,
    volumeIntensity,
  };
}

// Advanced signal prediction using enhanced logistic regression
export function predictSignal(features: FeatureVector): PredictionResult {
  // Calculate scores for each signal type using all available features
  const calculateScore = (weights: any): number => {
    let score = weights.intercept || 0;

    // Process all features with corresponding weights
    Object.keys(features).forEach((feature) => {
      if (
        features[feature as keyof FeatureVector] !== undefined &&
        weights[feature] !== undefined
      ) {
        score +=
          weights[feature] *
          (features[feature as keyof FeatureVector] as number);
      }
    });

    return score;
  };

  // Calculate probabilities for all signal types
  const buyScore = calculateScore(MODEL_WEIGHTS.buy);
  const sellScore = calculateScore(MODEL_WEIGHTS.sell);
  const holdScore = calculateScore(MODEL_WEIGHTS.hold);

  // Apply softmax function to get normalized probabilities
  const scores = [buyScore, sellScore, holdScore];
  const maxScore = Math.max(...scores);
  const expScores = scores.map((score) => Math.exp(score - maxScore)); // Subtract max for numerical stability
  const sumExpScores = expScores.reduce((a, b) => a + b, 0);

  const buyProbability = expScores[0] / sumExpScores;
  const sellProbability = expScores[1] / sumExpScores;
  const holdProbability = expScores[2] / sumExpScores;

  // Apply confidence boosting for strong signals
  const confidenceThreshold = 0.6;
  const confidenceBoost = 0.15; // Maximum boost percentage

  let adjustedBuyProb = buyProbability;
  let adjustedSellProb = sellProbability;
  let adjustedHoldProb = holdProbability;

  // Boost high confidence signals, reduce low confidence ones
  if (buyProbability > confidenceThreshold) {
    const boost =
      confidenceBoost *
      ((buyProbability - confidenceThreshold) / (1 - confidenceThreshold));
    adjustedBuyProb = Math.min(0.95, buyProbability * (1 + boost));
    // Reduce others proportionally
    const reduction =
      (adjustedBuyProb - buyProbability) / (sellProbability + holdProbability);
    adjustedSellProb = Math.max(
      0.02,
      sellProbability - sellProbability * reduction,
    );
    adjustedHoldProb = Math.max(
      0.02,
      holdProbability - holdProbability * reduction,
    );
  } else if (sellProbability > confidenceThreshold) {
    const boost =
      confidenceBoost *
      ((sellProbability - confidenceThreshold) / (1 - confidenceThreshold));
    adjustedSellProb = Math.min(0.95, sellProbability * (1 + boost));
    // Reduce others proportionally
    const reduction =
      (adjustedSellProb - sellProbability) / (buyProbability + holdProbability);
    adjustedBuyProb = Math.max(
      0.02,
      buyProbability - buyProbability * reduction,
    );
    adjustedHoldProb = Math.max(
      0.02,
      holdProbability - holdProbability * reduction,
    );
  } else if (holdProbability > confidenceThreshold) {
    const boost =
      confidenceBoost *
      ((holdProbability - confidenceThreshold) / (1 - confidenceThreshold));
    adjustedHoldProb = Math.min(0.95, holdProbability * (1 + boost));
    // Reduce others proportionally
    const reduction =
      (adjustedHoldProb - holdProbability) / (buyProbability + sellProbability);
    adjustedBuyProb = Math.max(
      0.02,
      buyProbability - buyProbability * reduction,
    );
    adjustedSellProb = Math.max(
      0.02,
      sellProbability - sellProbability * reduction,
    );
  }

  // Renormalize probabilities to sum to 1
  const sum = adjustedBuyProb + adjustedSellProb + adjustedHoldProb;
  adjustedBuyProb /= sum;
  adjustedSellProb /= sum;
  adjustedHoldProb /= sum;

  // Determine the predicted signal
  let predictedSignal: SignalType = "HOLD";
  let probability = adjustedHoldProb;

  if (
    adjustedBuyProb > adjustedSellProb &&
    adjustedBuyProb > adjustedHoldProb
  ) {
    predictedSignal = "BUY";
    probability = adjustedBuyProb;
  } else if (
    adjustedSellProb > adjustedBuyProb &&
    adjustedSellProb > adjustedHoldProb
  ) {
    predictedSignal = "SELL";
    probability = adjustedSellProb;
  }

  return {
    predictedSignal,
    probability,
    features,
  };
}

// Generate comprehensive explanation for ML prediction with feature importance
export function explainPrediction(prediction: PredictionResult): string {
  const { predictedSignal, probability, features } = prediction;

  let explanation = `ML model predicts ${predictedSignal} with ${(probability * 100).toFixed(1)}% confidence. `;

  // Identify top contributing factors based on feature values and model weights
  const getTopFactors = (
    signal: SignalType,
  ): { factor: string; impact: number }[] => {
    const weights =
      MODEL_WEIGHTS[signal.toLowerCase() as keyof typeof MODEL_WEIGHTS];
    const factors: { factor: string; impact: number }[] = [];

    // Calculate impact of each feature
    if (features.rsi !== undefined && weights.rsi) {
      factors.push({
        factor: "RSI",
        impact: features.rsi * weights.rsi,
      });
    }

    if (features.macdHistogram !== undefined && weights.macdHistogram) {
      factors.push({
        factor: "MACD",
        impact: features.macdHistogram * weights.macdHistogram,
      });
    }

    if (features.priceAboveVwap !== undefined && weights.priceAboveVwap) {
      factors.push({
        factor: "VWAP",
        impact: features.priceAboveVwap * weights.priceAboveVwap,
      });
    }

    if (features.shortVsLongMA !== undefined && weights.shortVsLongMA) {
      factors.push({
        factor: "MA Crossover",
        impact: features.shortVsLongMA * weights.shortVsLongMA,
      });
    }

    if (features.priceDirection !== undefined && weights.priceDirection) {
      factors.push({
        factor: "Price Direction",
        impact: features.priceDirection * weights.priceDirection,
      });
    }

    if (features.bollingerPosition !== undefined && weights.bollingerPosition) {
      factors.push({
        factor: "Bollinger Bands",
        impact: features.bollingerPosition * weights.bollingerPosition,
      });
    }

    if (features.volumeIncreasing !== undefined && weights.volumeIncreasing) {
      factors.push({
        factor: "Volume Trend",
        impact: features.volumeIncreasing * weights.volumeIncreasing,
      });
    }

    if (features.priceChange !== undefined && weights.priceChange) {
      factors.push({
        factor: "Price Change",
        impact: (features.priceChange * weights.priceChange) / 100, // Normalize impact
      });
    }

    if (features.volatility !== undefined && weights.volatility) {
      factors.push({
        factor: "Volatility",
        impact: features.volatility * weights.volatility,
      });
    }

    if (features.momentumStrength !== undefined && weights.momentumStrength) {
      factors.push({
        factor: "Momentum",
        impact: features.momentumStrength * weights.momentumStrength,
      });
    }

    if (
      features.supportResistanceProximity !== undefined &&
      weights.supportResistanceProximity
    ) {
      factors.push({
        factor: "Support/Resistance",
        impact:
          features.supportResistanceProximity *
          weights.supportResistanceProximity,
      });
    }

    if (features.volumeIntensity !== undefined && weights.volumeIntensity) {
      factors.push({
        factor: "Volume Intensity",
        impact: features.volumeIntensity * weights.volumeIntensity,
      });
    }

    // Sort by absolute impact and return top factors
    return factors
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 3); // Top 3 factors
  };

  // Get top factors for the predicted signal
  const topFactors = getTopFactors(predictedSignal);

  // Add detailed explanations based on signal type
  if (predictedSignal === "BUY") {
    explanation += "Key bullish factors: ";

    // Add specific explanations for top factors
    topFactors.forEach((factor, index) => {
      if (index > 0) explanation += ", ";

      switch (factor.factor) {
        case "RSI":
          if (features.rsi !== undefined) {
            explanation +=
              features.rsi < 30
                ? `RSI is oversold (${features.rsi.toFixed(1)})`
                : `RSI at ${features.rsi.toFixed(1)} showing upward potential`;
          }
          break;
        case "MACD":
          if (features.macdHistogram !== undefined) {
            explanation +=
              features.macdHistogram > 0
                ? `MACD histogram is positive (${features.macdHistogram.toFixed(4)})`
                : `MACD showing bullish divergence`;
          }
          break;
        case "Price Direction":
          if (features.priceDirection !== undefined) {
            explanation += `Strong upward price momentum (${(features.priceDirection * 100).toFixed(1)}%)`;
          }
          break;
        case "Bollinger Bands":
          if (features.bollingerPosition !== undefined) {
            explanation +=
              features.bollingerPosition < 0
                ? `Price near/below lower Bollinger Band indicating potential reversal`
                : `Favorable Bollinger Band position`;
          }
          break;
        case "MA Crossover":
          explanation += `Moving average alignment suggests uptrend`;
          break;
        case "VWAP":
          explanation += `Price position relative to VWAP is bullish`;
          break;
        case "Support/Resistance":
          explanation += `Price near key support level`;
          break;
        case "Momentum":
          explanation += `Strong positive momentum detected`;
          break;
        default:
          explanation += `${factor.factor} is favorable`;
      }
    });
  } else if (predictedSignal === "SELL") {
    explanation += "Key bearish factors: ";

    // Add specific explanations for top factors
    topFactors.forEach((factor, index) => {
      if (index > 0) explanation += ", ";

      switch (factor.factor) {
        case "RSI":
          if (features.rsi !== undefined) {
            explanation +=
              features.rsi > 70
                ? `RSI is overbought (${features.rsi.toFixed(1)})`
                : `RSI at ${features.rsi.toFixed(1)} showing downward potential`;
          }
          break;
        case "MACD":
          if (features.macdHistogram !== undefined) {
            explanation +=
              features.macdHistogram < 0
                ? `MACD histogram is negative (${features.macdHistogram.toFixed(4)})`
                : `MACD showing bearish divergence`;
          }
          break;
        case "Price Direction":
          if (features.priceDirection !== undefined) {
            explanation += `Strong downward price momentum (${(features.priceDirection * 100).toFixed(1)}%)`;
          }
          break;
        case "Bollinger Bands":
          if (features.bollingerPosition !== undefined) {
            explanation +=
              features.bollingerPosition > 0
                ? `Price near/above upper Bollinger Band indicating potential reversal`
                : `Unfavorable Bollinger Band position`;
          }
          break;
        case "MA Crossover":
          explanation += `Moving average alignment suggests downtrend`;
          break;
        case "VWAP":
          explanation += `Price position relative to VWAP is bearish`;
          break;
        case "Support/Resistance":
          explanation += `Price near key resistance level`;
          break;
        case "Momentum":
          explanation += `Strong negative momentum detected`;
          break;
        default:
          explanation += `${factor.factor} is unfavorable`;
      }
    });
  } else {
    // HOLD
    explanation += "Market conditions suggest holding: ";

    // Add specific explanations for top factors
    topFactors.forEach((factor, index) => {
      if (index > 0) explanation += ", ";

      switch (factor.factor) {
        case "RSI":
          if (features.rsi !== undefined) {
            explanation += `RSI is neutral (${features.rsi.toFixed(1)})`;
          }
          break;
        case "Volatility":
          if (features.volatility !== undefined) {
            explanation +=
              features.volatility < 0.03
                ? `Low market volatility suggests consolidation`
                : `Current volatility level suggests caution`;
          }
          break;
        case "MACD":
          explanation += `MACD shows mixed signals`;
          break;
        case "Momentum":
          explanation += `Insufficient momentum for directional trade`;
          break;
        case "Volume Intensity":
          explanation += `Volume pattern indicates consolidation`;
          break;
        default:
          explanation += `${factor.factor} is neutral`;
      }
    });
  }

  return explanation;
}
