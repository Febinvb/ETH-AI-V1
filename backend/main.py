from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import List, Optional
from datetime import datetime
import time

# Import all API modules
from api.signal import router as signal_router
from api.performance import router as performance_router
from api.trade_log import router as trade_log_router
from api.settings import router as settings_router
from api.sentiment import router as sentiment_router
from api.risk_analysis import router as risk_analysis_router

app = FastAPI(title="ETH AI Trading Agent API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(signal_router, prefix="/api", tags=["Signal"])
app.include_router(performance_router, prefix="/api", tags=["Performance"])
app.include_router(trade_log_router, prefix="/api", tags=["Trade Log"])
app.include_router(settings_router, prefix="/api", tags=["Settings"])
app.include_router(sentiment_router, prefix="/api", tags=["Sentiment"])
app.include_router(risk_analysis_router, prefix="/api", tags=["Risk Analysis"])

@app.get("/")
async def root():
    return {"message": "ETH AI Trading Agent API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
