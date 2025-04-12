from fastapi import APIRouter, HTTPException, Body
from .models import SettingsData, SettingsUpdate
import time

router = APIRouter()

# Mock data that matches the TypeScript mockSettingsData
mock_settings_data = {
    "autoTrading": False,
    "stopLoss": 2.5,
    "takeProfit": 5.0,
    "telegramAlerts": True,
    "accountType": "futures",
}

@router.get("/settings", response_model=SettingsData)
async def get_settings():
    # Simulate API delay
    time.sleep(0.4)
    
    return mock_settings_data

@router.patch("/settings", response_model=SettingsData)
async def update_settings(settings: SettingsUpdate = Body(...)):
    # Simulate API delay
    time.sleep(0.5)
    
    # Update mock settings with non-None values
    for key, value in settings.dict(exclude_unset=True).items():
        if value is not None:
            mock_settings_data[key] = value
    
    return mock_settings_data
