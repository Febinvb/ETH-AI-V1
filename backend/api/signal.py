from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from .models import SignalData
import time

router = APIRouter()

# Mock data that matches the TypeScript mockSignalData
mock_signal_data = {
    "default": {
        "signal": "SELL",
        "entryPoint": 1589.9,
        "stopLoss": 1610.5,
        "targetPrice": 1550.0,
        "confidence": 81,
        "reasoning": "Hourly chart showing bearish divergence on RSI. Price rejected at key resistance level with increasing sell volume.",
        "timestamp": "2023-07-21 14:00:00 (1h)",
    },
    "1m": {
        "signal": "SELL",
        "entryPoint": 1589.9,
        "stopLoss": 1595.0,
        "targetPrice": 1580.0,
        "confidence": 65,
        "reasoning": "Short-term momentum showing downward pressure with increasing sell volume.",
        "timestamp": "2023-07-21 14:45:12 (1m)",
    },
    "5m": {
        "signal": "SELL",
        "entryPoint": 1589.9,
        "stopLoss": 1600.0,
        "targetPrice": 1570.0,
        "confidence": 72,
        "reasoning": "Price breaking below 5-minute support with strong volume confirmation. MACD showing bearish crossover.",
        "timestamp": "2023-07-21 14:40:05 (5m)",
    },
    "15m": {
        "signal": "SELL",
        "entryPoint": 1589.9,
        "stopLoss": 1605.0,
        "targetPrice": 1560.0,
        "confidence": 78,
        "reasoning": "15-minute chart showing clear downtrend with lower highs. RSI indicating bearish momentum.",
        "timestamp": "2023-07-21 14:32:05 (15m)",
    },
    "1h": {
        "signal": "SELL",
        "entryPoint": 1589.9,
        "stopLoss": 1610.5,
        "targetPrice": 1550.0,
        "confidence": 81,
        "reasoning": "Hourly chart showing bearish divergence on RSI. Price rejected at key resistance level with increasing sell volume.",
        "timestamp": "2023-07-21 14:00:00 (1h)",
    },
    "4h": {
        "signal": "SELL",
        "entryPoint": 1589.9,
        "stopLoss": 1620.0,
        "targetPrice": 1540.0,
        "confidence": 85,
        "reasoning": "4-hour chart showing clear bearish pattern with decreasing buy volume. Multiple resistance rejections.",
        "timestamp": "2023-07-21 12:00:00 (4h)",
    },
    "1d": {
        "signal": "HOLD",
        "entryPoint": 1589.9,
        "stopLoss": 1550.0,
        "targetPrice": 1650.0,
        "confidence": 60,
        "reasoning": "Daily chart showing consolidation pattern. Waiting for clear breakout direction.",
        "timestamp": "2023-07-21 00:00:00 (1d)",
    },
}

@router.get("/signal", response_model=SignalData)
async def get_signal(timeframe: str = Query("15m", description="Timeframe for the signal")):
    # Simulate API delay
    time.sleep(0.5)
    
    # Return signal data based on timeframe
    if timeframe in mock_signal_data:
        return mock_signal_data[timeframe]
    return mock_signal_data["default"]
