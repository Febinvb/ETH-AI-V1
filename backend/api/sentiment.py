from fastapi import APIRouter, HTTPException
from .models import SentimentData
import time

router = APIRouter()

# Mock data that matches the TypeScript mockSentimentData
mock_sentiment_data = {
    "overallSentiment": 65,
    "sources": [
        {"name": "Social Media", "score": 72, "change": 5.3},
        {"name": "News Articles", "score": 58, "change": -2.1},
        {"name": "Trading Volume", "score": 81, "change": 12.7},
    ],
    "lastUpdated": "2023-07-21 15:30:00",
}

@router.get("/sentiment", response_model=SentimentData)
async def get_sentiment():
    # Simulate API delay
    time.sleep(0.6)
    
    return mock_sentiment_data
