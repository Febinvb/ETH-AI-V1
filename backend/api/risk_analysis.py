from fastapi import APIRouter, HTTPException
from .models import RiskAnalysisData
import time

router = APIRouter()

# Mock data that matches the TypeScript mockRiskAnalysisData
mock_risk_analysis_data = {
    "overallRisk": 42,
    "metrics": [
        {
            "name": "Volatility",
            "value": 68,
            "threshold": 60,
            "description": "30-day price volatility is above average",
            "isHighRisk": True,
        },
        {
            "name": "Liquidity",
            "value": 75,
            "threshold": 40,
            "description": "Market liquidity is healthy",
            "isHighRisk": False,
        },
        {
            "name": "Market Correlation",
            "value": 82,
            "threshold": 70,
            "description": "High correlation with BTC movements",
            "isHighRisk": True,
        },
        {
            "name": "Support Strength",
            "value": 65,
            "threshold": 50,
            "description": "Multiple support levels identified",
            "isHighRisk": False,
        },
    ],
    "recommendations": [
        "Reduce position size by 25%",
        "Tighten stop loss to 2%",
        "Consider diversifying into other trading pairs",
    ],
}

@router.get("/riskAnalysis", response_model=RiskAnalysisData)
async def get_risk_analysis():
    # Simulate API delay
    time.sleep(0.55)
    
    return mock_risk_analysis_data
