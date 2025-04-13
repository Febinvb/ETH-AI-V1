import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  processTrade,
  clearAnalyzerData,
  setAnalyzerSymbol,
  getCurrentPrice,
  type GeneratedSignal,
  type SignalType,
} from "./signalGenerator";
import { BinanceTradeEvent } from "../services/binanceService";
import * as mlPredictor from "./mlPredictor";

// Mock the ML predictor module
vi.mock("./mlPredictor", () => ({
  prepareFeatures: vi.fn(),
  predictSignal: vi.fn(),
  explainPrediction: vi.fn(),
}));

describe("Signal Generator", () => {
  // Reset data before each test
  beforeEach(() => {
    clearAnalyzerData();
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(mlPredictor.prepareFeatures).mockReturnValue({});
    vi.mocked(mlPredictor.predictSignal).mockReturnValue({
      predictedSignal: "HOLD" as SignalType,
      probability: 0.5,
    });
    vi.mocked(mlPredictor.explainPrediction).mockReturnValue(
      "Mock explanation",
    );
  });

  // Helper function to create mock trade events
  const createMockTrade = (
    price: number,
    isBuyerMaker: boolean = false,
  ): BinanceTradeEvent => ({
    e: "trade",
    E: Date.now(),
    s: "ETHUSDT",
    t: 12345,
    p: price.toString(),
    q: "1.0",
    b: 12345,
    a: 12345,
    T: Date.now().toString(),
    m: isBuyerMaker,
    M: true,
  });

  // Helper function to generate price history
  const generatePriceHistory = (
    basePrice: number,
    count: number,
    volatility: number = 0.01,
  ) => {
    const trades: BinanceTradeEvent[] = [];
    let currentPrice = basePrice;

    for (let i = 0; i < count; i++) {
      // Add some randomness to create price movement
      const priceChange = (Math.random() - 0.5) * 2 * volatility * basePrice;
      currentPrice = basePrice + priceChange;
      trades.push(createMockTrade(currentPrice));
    }

    return trades;
  };

  describe("BUY Signal Tests", () => {
    beforeEach(() => {
      // Setup conditions for a BUY signal
      setAnalyzerSymbol("ethusdt");

      // Mock ML predictor to return BUY signal with high confidence
      vi.mocked(mlPredictor.predictSignal).mockReturnValue({
        predictedSignal: "BUY" as SignalType,
        probability: 0.8,
      });
    });

    it("should calculate appropriate stop loss for BUY signal in low volatility", () => {
      // Generate price history with low volatility
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.005); // 0.5% volatility

      // Process trades to build up data
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Force a BUY signal by adding specific trades that trigger buy conditions
      // Add trades with increasing prices to trigger short MA > long MA
      for (let i = 0; i < 10; i++) {
        processTrade(createMockTrade(basePrice * (1 + 0.001 * (i + 1))), "5m");
      }

      // Get the signal
      const signal = processTrade(createMockTrade(basePrice * 1.01), "5m");

      // Assertions
      expect(signal).not.toBeNull();
      expect(signal?.signal).toBe("BUY");

      // Stop loss should be below entry point but not too far (max 10%)
      expect(signal?.stopLoss).toBeLessThan(signal?.entryPoint);
      expect(signal?.stopLoss).toBeGreaterThan(signal?.entryPoint * 0.9);

      // Target price should be above entry point
      expect(signal?.targetPrice).toBeGreaterThan(signal?.entryPoint);

      // Risk-reward ratio check (target distance / stop loss distance)
      const riskDistance = signal!.entryPoint - signal!.stopLoss;
      const rewardDistance = signal!.targetPrice - signal!.entryPoint;
      const riskRewardRatio = rewardDistance / riskDistance;

      // For BUY with high ML confidence, risk-reward should be higher
      expect(riskRewardRatio).toBeGreaterThan(2.0);
    });

    it("should calculate appropriate stop loss for BUY signal in high volatility", () => {
      // Generate price history with high volatility
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.02); // 2% volatility

      // Process trades to build up data
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Force a BUY signal
      for (let i = 0; i < 10; i++) {
        processTrade(createMockTrade(basePrice * (1 + 0.002 * (i + 1))), "5m");
      }

      // Get the signal
      const signal = processTrade(createMockTrade(basePrice * 1.02), "5m");

      // Assertions
      expect(signal).not.toBeNull();
      expect(signal?.signal).toBe("BUY");

      // In high volatility, stop loss should be further from entry point but still within limits
      expect(signal?.stopLoss).toBeLessThan(signal?.entryPoint);
      expect(signal?.stopLoss).toBeGreaterThan(signal?.entryPoint * 0.85); // Allow for wider stop in high volatility

      // Risk-reward ratio might be adjusted for high volatility
      const riskDistance = signal!.entryPoint - signal!.stopLoss;
      const rewardDistance = signal!.targetPrice - signal!.entryPoint;
      const riskRewardRatio = rewardDistance / riskDistance;

      // For high volatility, risk-reward might be slightly lower
      expect(riskRewardRatio).toBeGreaterThan(1.5);
    });

    it("should adjust target price based on ML confidence for BUY signal", () => {
      // Setup
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.01);
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Test with different ML confidence levels
      const confidenceLevels = [0.6, 0.75, 0.9];
      const signals: (GeneratedSignal | null)[] = [];

      for (const confidence of confidenceLevels) {
        clearAnalyzerData();
        trades.forEach((trade) => processTrade(trade, "5m"));

        // Set ML confidence
        vi.mocked(mlPredictor.predictSignal).mockReturnValue({
          predictedSignal: "BUY" as SignalType,
          probability: confidence,
        });

        // Force BUY signal
        for (let i = 0; i < 10; i++) {
          processTrade(
            createMockTrade(basePrice * (1 + 0.001 * (i + 1))),
            "5m",
          );
        }

        signals.push(processTrade(createMockTrade(basePrice * 1.01), "5m"));
      }

      // Verify that higher confidence leads to more aggressive targets
      for (let i = 1; i < signals.length; i++) {
        if (
          signals[i] &&
          signals[i - 1] &&
          signals[i]?.signal === "BUY" &&
          signals[i - 1]?.signal === "BUY"
        ) {
          // Higher confidence should lead to higher target relative to entry
          const prevRatio =
            (signals[i - 1]!.targetPrice - signals[i - 1]!.entryPoint) /
            (signals[i - 1]!.entryPoint - signals[i - 1]!.stopLoss);
          const currRatio =
            (signals[i]!.targetPrice - signals[i]!.entryPoint) /
            (signals[i]!.entryPoint - signals[i]!.stopLoss);

          expect(currRatio).toBeGreaterThanOrEqual(prevRatio);
        }
      }
    });
  });

  describe("SELL Signal Tests", () => {
    beforeEach(() => {
      // Setup conditions for a SELL signal
      setAnalyzerSymbol("ethusdt");

      // Mock ML predictor to return SELL signal with high confidence
      vi.mocked(mlPredictor.predictSignal).mockReturnValue({
        predictedSignal: "SELL" as SignalType,
        probability: 0.8,
      });
    });

    it("should calculate appropriate stop loss for SELL signal in low volatility", () => {
      // Generate price history with low volatility
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.005);

      // Process trades to build up data
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Force a SELL signal by adding specific trades that trigger sell conditions
      // Add trades with decreasing prices to trigger short MA < long MA
      for (let i = 0; i < 10; i++) {
        processTrade(createMockTrade(basePrice * (1 - 0.001 * (i + 1))), "5m");
      }

      // Get the signal
      const signal = processTrade(createMockTrade(basePrice * 0.99), "5m");

      // Assertions
      expect(signal).not.toBeNull();
      expect(signal?.signal).toBe("SELL");

      // Stop loss should be above entry point but not too far (max 10%)
      expect(signal?.stopLoss).toBeGreaterThan(signal?.entryPoint);
      expect(signal?.stopLoss).toBeLessThan(signal?.entryPoint * 1.1);

      // Target price should be below entry point
      expect(signal?.targetPrice).toBeLessThan(signal?.entryPoint);

      // Risk-reward ratio check
      const riskDistance = signal!.stopLoss - signal!.entryPoint;
      const rewardDistance = signal!.entryPoint - signal!.targetPrice;
      const riskRewardRatio = rewardDistance / riskDistance;

      // For SELL with high ML confidence, risk-reward should be higher
      expect(riskRewardRatio).toBeGreaterThan(2.0);
    });

    it("should calculate appropriate stop loss for SELL signal in high volatility", () => {
      // Generate price history with high volatility
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.02);

      // Process trades to build up data
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Force a SELL signal
      for (let i = 0; i < 10; i++) {
        processTrade(createMockTrade(basePrice * (1 - 0.002 * (i + 1))), "5m");
      }

      // Get the signal
      const signal = processTrade(createMockTrade(basePrice * 0.98), "5m");

      // Assertions
      expect(signal).not.toBeNull();
      expect(signal?.signal).toBe("SELL");

      // In high volatility, stop loss should be further from entry point but still within limits
      expect(signal?.stopLoss).toBeGreaterThan(signal?.entryPoint);
      expect(signal?.stopLoss).toBeLessThan(signal?.entryPoint * 1.15); // Allow for wider stop in high volatility

      // Risk-reward ratio might be adjusted for high volatility
      const riskDistance = signal!.stopLoss - signal!.entryPoint;
      const rewardDistance = signal!.entryPoint - signal!.targetPrice;
      const riskRewardRatio = rewardDistance / riskDistance;

      // For high volatility, risk-reward might be slightly lower
      expect(riskRewardRatio).toBeGreaterThan(1.5);
    });

    it("should adjust target price based on ML confidence for SELL signal", () => {
      // Setup
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.01);
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Test with different ML confidence levels
      const confidenceLevels = [0.6, 0.75, 0.9];
      const signals: (GeneratedSignal | null)[] = [];

      for (const confidence of confidenceLevels) {
        clearAnalyzerData();
        trades.forEach((trade) => processTrade(trade, "5m"));

        // Set ML confidence
        vi.mocked(mlPredictor.predictSignal).mockReturnValue({
          predictedSignal: "SELL" as SignalType,
          probability: confidence,
        });

        // Force SELL signal
        for (let i = 0; i < 10; i++) {
          processTrade(
            createMockTrade(basePrice * (1 - 0.001 * (i + 1))),
            "5m",
          );
        }

        signals.push(processTrade(createMockTrade(basePrice * 0.99), "5m"));
      }

      // Verify that higher confidence leads to more aggressive targets
      for (let i = 1; i < signals.length; i++) {
        if (
          signals[i] &&
          signals[i - 1] &&
          signals[i]?.signal === "SELL" &&
          signals[i - 1]?.signal === "SELL"
        ) {
          // Higher confidence should lead to lower target relative to entry
          const prevRatio =
            (signals[i - 1]!.entryPoint - signals[i - 1]!.targetPrice) /
            (signals[i - 1]!.stopLoss - signals[i - 1]!.entryPoint);
          const currRatio =
            (signals[i]!.entryPoint - signals[i]!.targetPrice) /
            (signals[i]!.stopLoss - signals[i]!.entryPoint);

          expect(currRatio).toBeGreaterThanOrEqual(prevRatio);
        }
      }
    });
  });

  describe("HOLD Signal Tests", () => {
    beforeEach(() => {
      setAnalyzerSymbol("ethusdt");

      // Mock ML predictor to return HOLD signal
      vi.mocked(mlPredictor.predictSignal).mockReturnValue({
        predictedSignal: "HOLD" as SignalType,
        probability: 0.7,
      });
    });

    it("should set conservative stop loss and target for HOLD signals", () => {
      // Generate balanced price history that doesn't strongly indicate buy or sell
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.01);

      // Process trades to build up data
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Get the signal (should be HOLD due to mixed indicators)
      const signal = processTrade(createMockTrade(basePrice), "5m");

      // Assertions
      expect(signal).not.toBeNull();
      expect(signal?.signal).toBe("HOLD");

      // For HOLD signals, stop loss should be below entry point
      expect(signal?.stopLoss).toBeLessThan(signal?.entryPoint);

      // Target price should be above entry point
      expect(signal?.targetPrice).toBeGreaterThan(signal?.entryPoint);

      // For HOLD signals, the risk-reward should be more conservative
      const riskPercentage =
        (signal!.entryPoint - signal!.stopLoss) / signal!.entryPoint;
      const rewardPercentage =
        (signal!.targetPrice - signal!.entryPoint) / signal!.entryPoint;

      // Typically for HOLD, reward percentage should be about 1.5x the risk percentage
      expect(rewardPercentage).toBeCloseTo(riskPercentage * 1.5, 1);
    });

    it("should adjust risk percentage based on ML confidence for HOLD signal", () => {
      // Setup
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.01);

      // Test with different ML confidence levels
      const confidenceLevels = [0.6, 0.75, 0.9];
      const signals: (GeneratedSignal | null)[] = [];

      for (const confidence of confidenceLevels) {
        clearAnalyzerData();
        trades.forEach((trade) => processTrade(trade, "5m"));

        // Set ML confidence
        vi.mocked(mlPredictor.predictSignal).mockReturnValue({
          predictedSignal: "HOLD" as SignalType,
          probability: confidence,
        });

        signals.push(processTrade(createMockTrade(basePrice), "5m"));
      }

      // Verify that higher confidence leads to tighter risk percentages
      for (let i = 1; i < signals.length; i++) {
        if (
          signals[i] &&
          signals[i - 1] &&
          signals[i]?.signal === "HOLD" &&
          signals[i - 1]?.signal === "HOLD"
        ) {
          // Higher confidence should lead to tighter stop loss (smaller risk)
          const prevRiskPercentage =
            (signals[i - 1]!.entryPoint - signals[i - 1]!.stopLoss) /
            signals[i - 1]!.entryPoint;
          const currRiskPercentage =
            (signals[i]!.entryPoint - signals[i]!.stopLoss) /
            signals[i]!.entryPoint;

          expect(currRiskPercentage).toBeLessThanOrEqual(prevRiskPercentage);
        }
      }
    });
  });

  describe("ML Disagreement Tests", () => {
    it("should widen stop loss when ML strongly disagrees with technical indicators (BUY vs SELL)", () => {
      // Setup for technical BUY signal
      setAnalyzerSymbol("ethusdt");
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.01);

      // Process trades to build up data
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Force technical indicators to suggest BUY
      for (let i = 0; i < 10; i++) {
        processTrade(createMockTrade(basePrice * (1 + 0.002 * (i + 1))), "5m");
      }

      // But ML model strongly suggests SELL
      vi.mocked(mlPredictor.predictSignal).mockReturnValue({
        predictedSignal: "SELL" as SignalType,
        probability: 0.85,
      });

      const signal = processTrade(createMockTrade(basePrice * 1.02), "5m");

      // Assertions
      expect(signal).not.toBeNull();
      // Technical indicators should still determine the signal type
      expect(signal?.signal).toBe("BUY");

      // But stop loss should be wider due to ML disagreement
      const riskPercentage =
        (signal!.entryPoint - signal!.stopLoss) / signal!.entryPoint;

      // Compare with a scenario where ML agrees
      clearAnalyzerData();
      trades.forEach((trade) => processTrade(trade, "5m"));
      for (let i = 0; i < 10; i++) {
        processTrade(createMockTrade(basePrice * (1 + 0.002 * (i + 1))), "5m");
      }

      vi.mocked(mlPredictor.predictSignal).mockReturnValue({
        predictedSignal: "BUY" as SignalType,
        probability: 0.85,
      });

      const agreeSignal = processTrade(createMockTrade(basePrice * 1.02), "5m");
      const agreeRiskPercentage =
        (agreeSignal!.entryPoint - agreeSignal!.stopLoss) /
        agreeSignal!.entryPoint;

      // Risk percentage should be higher (wider stop loss) when ML disagrees
      expect(riskPercentage).toBeGreaterThan(agreeRiskPercentage);
    });

    it("should adjust risk-reward ratio when ML disagrees with technical indicators", () => {
      // Setup for technical SELL signal
      setAnalyzerSymbol("ethusdt");
      const basePrice = 2000;
      const trades = generatePriceHistory(basePrice, 50, 0.01);

      // Process trades to build up data
      trades.forEach((trade) => processTrade(trade, "5m"));

      // Force technical indicators to suggest SELL
      for (let i = 0; i < 10; i++) {
        processTrade(createMockTrade(basePrice * (1 - 0.002 * (i + 1))), "5m");
      }

      // Test scenarios: ML agrees vs disagrees
      // 1. ML agrees with SELL
      vi.mocked(mlPredictor.predictSignal).mockReturnValue({
        predictedSignal: "SELL" as SignalType,
        probability: 0.85,
      });

      const agreeSignal = processTrade(createMockTrade(basePrice * 0.98), "5m");

      // 2. ML disagrees with SELL (suggests BUY)
      clearAnalyzerData();
      trades.forEach((trade) => processTrade(trade, "5m"));
      for (let i = 0; i < 10; i++) {
        processTrade(createMockTrade(basePrice * (1 - 0.002 * (i + 1))), "5m");
      }

      vi.mocked(mlPredictor.predictSignal).mockReturnValue({
        predictedSignal: "BUY" as SignalType,
        probability: 0.85,
      });

      const disagreeSignal = processTrade(
        createMockTrade(basePrice * 0.98),
        "5m",
      );

      // Both should be SELL signals based on technical indicators
      expect(agreeSignal?.signal).toBe("SELL");
      expect(disagreeSignal?.signal).toBe("SELL");

      // Calculate risk-reward ratios
      const agreeRiskReward =
        (agreeSignal!.entryPoint - agreeSignal!.targetPrice) /
        (agreeSignal!.stopLoss - agreeSignal!.entryPoint);

      const disagreeRiskReward =
        (disagreeSignal!.entryPoint - disagreeSignal!.targetPrice) /
        (disagreeSignal!.stopLoss - disagreeSignal!.entryPoint);

      // Risk-reward should be lower when ML disagrees
      expect(disagreeRiskReward).toBeLessThan(agreeRiskReward);
    });
  });

  describe("Edge Cases", () => {
    it("should handle extremely low volatility scenarios", () => {
      // Setup with extremely low volatility (almost flat price)
      setAnalyzerSymbol("ethusdt");
      const basePrice = 2000;

      // Generate trades with very low volatility
      for (let i = 0; i < 50; i++) {
        // Very small random fluctuations (±0.05%)
        const price = basePrice * (1 + (Math.random() - 0.5) * 0.001);
        processTrade(createMockTrade(price), "5m");
      }

      // Force a signal
      const signal = processTrade(createMockTrade(basePrice), "5m");

      // Assertions
      expect(signal).not.toBeNull();

      // Even in low volatility, stop loss and target should be set reasonably
      if (signal?.signal === "BUY") {
        expect(signal.stopLoss).toBeLessThan(signal.entryPoint);
        expect(signal.targetPrice).toBeGreaterThan(signal.entryPoint);
      } else if (signal?.signal === "SELL") {
        expect(signal.stopLoss).toBeGreaterThan(signal.entryPoint);
        expect(signal.targetPrice).toBeLessThan(signal.entryPoint);
      } else {
        // HOLD signal
        expect(signal?.stopLoss).toBeLessThan(signal?.entryPoint);
        expect(signal?.targetPrice).toBeGreaterThan(signal?.entryPoint);
      }

      // Minimum risk percentage should be applied
      const riskPercentage =
        signal?.signal === "SELL"
          ? (signal.stopLoss - signal.entryPoint) / signal.entryPoint
          : (signal!.entryPoint - signal!.stopLoss) / signal!.entryPoint;

      expect(riskPercentage).toBeGreaterThanOrEqual(0.005); // Minimum 0.5% risk
    });

    it("should handle extremely high volatility scenarios", () => {
      // Setup with extremely high volatility
      setAnalyzerSymbol("ethusdt");
      const basePrice = 2000;

      // Generate trades with very high volatility (±10%)
      for (let i = 0; i < 50; i++) {
        const price = basePrice * (1 + (Math.random() - 0.5) * 0.2);
        processTrade(createMockTrade(price), "5m");
      }

      // Force a signal
      const signal = processTrade(createMockTrade(basePrice), "5m");

      // Assertions
      expect(signal).not.toBeNull();

      // In high volatility, stop loss should still be within reasonable bounds
      if (signal?.signal === "BUY") {
        expect(signal.stopLoss).toBeGreaterThan(signal.entryPoint * 0.8); // Max 20% stop
      } else if (signal?.signal === "SELL") {
        expect(signal.stopLoss).toBeLessThan(signal.entryPoint * 1.2); // Max 20% stop
      }

      // Maximum risk percentage should be applied
      const riskPercentage =
        signal?.signal === "SELL"
          ? (signal.stopLoss - signal.entryPoint) / signal.entryPoint
          : (signal!.entryPoint - signal!.stopLoss) / signal!.entryPoint;

      expect(riskPercentage).toBeLessThanOrEqual(0.1); // Maximum 10% risk
    });
  });
});
