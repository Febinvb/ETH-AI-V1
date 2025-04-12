from fastapi import APIRouter, HTTPException
from typing import List
from .models import TradeData
import time

router = APIRouter()

# Mock data that matches the TypeScript mockTradeLogData
mock_trade_log_data = [
    {
        "id": "1",
        "date": "2023-06-01 14:30",
        "direction": "BUY",
        "entry": 0.5123,
        "exit": 0.5345,
        "pnl": 4.33,
        "status": "COMPLETED",
    },
    {
        "id": "2",
        "date": "2023-06-02 09:15",
        "direction": "SELL",
        "entry": 0.542,
        "exit": 0.521,
        "pnl": 3.87,
        "status": "COMPLETED",
    },
    {
        "id": "3",
        "date": "2023-06-03 11:45",
        "direction": "BUY",
        "entry": 0.518,
        "exit": 0.511,
        "pnl": -1.35,
        "status": "COMPLETED",
    },
    {
        "id": "4",
        "date": "2023-06-04 16:20",
        "direction": "BUY",
        "entry": 0.523,
        "exit": 0,
        "pnl": 0,
        "status": "OPEN",
    },
    {
        "id": "5",
        "date": "2023-06-05 10:05",
        "direction": "SELL",
        "entry": 0.531,
        "exit": 0.541,
        "pnl": -1.88,
        "status": "COMPLETED",
    },
    {
        "id": "6",
        "date": "2023-06-06 13:45",
        "direction": "BUY",
        "entry": 0.525,
        "exit": 0.538,
        "pnl": 2.48,
        "status": "COMPLETED",
    },
    {
        "id": "7",
        "date": "2023-06-07 15:30",
        "direction": "BUY",
        "entry": 0.54,
        "exit": 0.552,
        "pnl": 2.22,
        "status": "COMPLETED",
    },
    {
        "id": "8",
        "date": "2023-06-08 09:20",
        "direction": "SELL",
        "entry": 0.549,
        "exit": 0,
        "pnl": 0,
        "status": "OPEN",
    },
]

@router.get("/tradeLog", response_model=List[TradeData])
async def get_trade_log():
    # Simulate API delay
    time.sleep(0.6)
    
    return mock_trade_log_data
