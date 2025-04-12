from fastapi import APIRouter, HTTPException
from .models import PerformanceData
import time

router = APIRouter()

# Mock data that matches the TypeScript mockPerformanceData
mock_performance_data = {
    "winRate": 68.5,
    "avgPnl": 2.4,
    "totalTrades": 124,
    "monthlyPnl": 18.7,
    "pnlHistory": [
        {"date": "2023-06-01", "pnl": 4.33},
        {"date": "2023-06-02", "pnl": 8.2},
        {"date": "2023-06-03", "pnl": 6.85},
        {"date": "2023-06-04", "pnl": 6.85},
        {"date": "2023-06-05", "pnl": 4.97},
        {"date": "2023-06-06", "pnl": 7.25},
        {"date": "2023-06-07", "pnl": 10.5},
        {"date": "2023-06-08", "pnl": 12.8},
        {"date": "2023-06-09", "pnl": 11.2},
        {"date": "2023-06-10", "pnl": 14.5},
        {"date": "2023-06-11", "pnl": 13.8},
        {"date": "2023-06-12", "pnl": 16.2},
        {"date": "2023-06-13", "pnl": 15.4},
        {"date": "2023-06-14", "pnl": 18.7},
    ]
}

@router.get("/performance", response_model=PerformanceData)
async def get_performance():
    # Simulate API delay
    time.sleep(0.7)
    
    return mock_performance_data
