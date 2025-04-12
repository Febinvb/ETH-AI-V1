// Simple ML predictor for trading signals
// This implements a basic logistic regression model for signal prediction

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
}

// Prediction result with signal and probability
interface PredictionResult {
  predictedSignal: SignalType;
  probability: number;
  features: FeatureVector;
}

// Simple logistic regression model weights
// These weights would normally be trained on historical data
// For now, we'll use pre-defined weights based on domain knowledge
const MODEL_WEIGHTS = {
  buy: {
    intercept: -2.5,
    rsi: -0.05, // Lower RSI increases buy probability
    macdHistogram: 3.0, // Positive MACD histogram increases buy probability
    priceAboveVwap: 1.2, // Price above VWAP increases buy probability
    shortVsLongMA: 1.5, // Short MA > Long MA increases buy probability
    priceDirection: 2.0, // Positive price direction increases buy probability
    bollingerPosition: -1.8, // Below lower band increases buy probability
    volumeIncreasing: 0.8, // Increasing volume with positive price direction
    priceChange: 15.0, // Recent positive price change increases buy probability
  },
  sell: {
    intercept: -2.5,
    rsi: 0.05, // Higher RSI increases sell probability
    macdHistogram: -3.0, // Negative MACD histogram increases sell probability
    priceAboveVwap: -1.2, // Price below VWAP increases sell probability
    shortVsLongMA: -1.5, // Short MA < Long MA increases sell probability
    priceDirection: -2.0, // Negative price direction increases sell probability
    bollingerPosition: 1.8, // Above upper band increases sell probability
    volumeIncreasing: 0.8, // Increasing volume with negative price direction
    priceChange: -15.0, // Recent negative price change increases sell probability
  },
};

// Sigmoid function for logistic regression
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

// Prepare feature vector from technical indicators
export function prepareFeatures(
  indicators: any,
  priceChange: number,
  volumeIncreasing: boolean,
): FeatureVector {
  const currentPrice = indicators.currentPrice || 0;

  // Calculate bollinger position
  let bollingerPosition = 0;
  if (indicators.bollingerLower && indicators.bollingerUpper) {
    if (currentPrice < indicators.bollingerLower) {
      bollingerPosition = -1; // Below lower band
    } else if (currentPrice > indicators.bollingerUpper) {
      bollingerPosition = 1; // Above upper band
    }
  }

  return {
    rsi: indicators.rsi,
    macdHistogram: indicators.macdHistogram,
    priceAboveVwap: indicators.vwap
      ? currentPrice > indicators.vwap
        ? 1
        : 0
      : 0.5,
    shortVsLongMA: indicators.shortMA > indicators.longMA ? 1 : 0,
    priceDirection: indicators.priceDirection || 0,
    bollingerPosition,
    volumeIncreasing: volumeIncreasing ? 1 : 0,
    priceChange: priceChange * 100, // Convert to percentage
  };
}

// Predict signal using logistic regression
export function predictSignal(features: FeatureVector): PredictionResult {
  // Calculate buy probability
  let buyScore = MODEL_WEIGHTS.buy.intercept;
  if (features.rsi !== undefined)
    buyScore += MODEL_WEIGHTS.buy.rsi * features.rsi;
  if (features.macdHistogram !== undefined)
    buyScore += MODEL_WEIGHTS.buy.macdHistogram * features.macdHistogram;
  if (features.priceAboveVwap !== undefined)
    buyScore += MODEL_WEIGHTS.buy.priceAboveVwap * features.priceAboveVwap;
  if (features.shortVsLongMA !== undefined)
    buyScore += MODEL_WEIGHTS.buy.shortVsLongMA * features.shortVsLongMA;
  if (features.priceDirection !== undefined)
    buyScore += MODEL_WEIGHTS.buy.priceDirection * features.priceDirection;
  if (features.bollingerPosition !== undefined)
    buyScore +=
      MODEL_WEIGHTS.buy.bollingerPosition * features.bollingerPosition;
  if (features.volumeIncreasing !== undefined)
    buyScore += MODEL_WEIGHTS.buy.volumeIncreasing * features.volumeIncreasing;
  if (features.priceChange !== undefined)
    buyScore += MODEL_WEIGHTS.buy.priceChange * features.priceChange;

  const buyProbability = sigmoid(buyScore);

  // Calculate sell probability
  let sellScore = MODEL_WEIGHTS.sell.intercept;
  if (features.rsi !== undefined)
    sellScore += MODEL_WEIGHTS.sell.rsi * features.rsi;
  if (features.macdHistogram !== undefined)
    sellScore += MODEL_WEIGHTS.sell.macdHistogram * features.macdHistogram;
  if (features.priceAboveVwap !== undefined)
    sellScore += MODEL_WEIGHTS.sell.priceAboveVwap * features.priceAboveVwap;
  if (features.shortVsLongMA !== undefined)
    sellScore += MODEL_WEIGHTS.sell.shortVsLongMA * features.shortVsLongMA;
  if (features.priceDirection !== undefined)
    sellScore += MODEL_WEIGHTS.sell.priceDirection * features.priceDirection;
  if (features.bollingerPosition !== undefined)
    sellScore +=
      MODEL_WEIGHTS.sell.bollingerPosition * features.bollingerPosition;
  if (features.volumeIncreasing !== undefined)
    sellScore +=
      MODEL_WEIGHTS.sell.volumeIncreasing * features.volumeIncreasing;
  if (features.priceChange !== undefined)
    sellScore += MODEL_WEIGHTS.sell.priceChange * features.priceChange;

  const sellProbability = sigmoid(sellScore);

  // Calculate hold probability (neither strong buy nor strong sell)
  const holdProbability = 1 - (buyProbability + sellProbability);

  // Determine the predicted signal
  let predictedSignal: SignalType = "HOLD";
  let probability = holdProbability;

  if (buyProbability > sellProbability && buyProbability > holdProbability) {
    predictedSignal = "BUY";
    probability = buyProbability;
  } else if (
    sellProbability > buyProbability &&
    sellProbability > holdProbability
  ) {
    predictedSignal = "SELL";
    probability = sellProbability;
  }

  return {
    predictedSignal,
    probability,
    features,
  };
}

// Generate explanation for ML prediction
export function explainPrediction(prediction: PredictionResult): string {
  const { predictedSignal, probability, features } = prediction;

  let explanation = `ML model predicts ${predictedSignal} with ${(probability * 100).toFixed(1)}% confidence. `;

  // Add feature importance explanations
  if (predictedSignal === "BUY") {
    if (features.rsi !== undefined && features.rsi < 30) {
      explanation += `RSI is oversold (${features.rsi.toFixed(1)}). `;
    }
    if (features.macdHistogram !== undefined && features.macdHistogram > 0) {
      explanation += `MACD histogram is positive (${features.macdHistogram.toFixed(4)}). `;
    }
    if (features.priceDirection !== undefined && features.priceDirection > 0) {
      explanation += `Price direction is upward. `;
    }
    if (
      features.bollingerPosition !== undefined &&
      features.bollingerPosition < 0
    ) {
      explanation += `Price is below lower Bollinger Band. `;
    }
  } else if (predictedSignal === "SELL") {
    if (features.rsi !== undefined && features.rsi > 70) {
      explanation += `RSI is overbought (${features.rsi.toFixed(1)}). `;
    }
    if (features.macdHistogram !== undefined && features.macdHistogram < 0) {
      explanation += `MACD histogram is negative (${features.macdHistogram.toFixed(4)}). `;
    }
    if (features.priceDirection !== undefined && features.priceDirection < 0) {
      explanation += `Price direction is downward. `;
    }
    if (
      features.bollingerPosition !== undefined &&
      features.bollingerPosition > 0
    ) {
      explanation += `Price is above upper Bollinger Band. `;
    }
  } else {
    explanation += `Indicators are mixed or neutral. `;
  }

  return explanation;
}
