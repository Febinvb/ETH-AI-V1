# ETH AI Trading Agent Backend API

This FastAPI backend provides endpoints that match the structure of the frontend mock API.

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the server:
   ```
   python main.py
   ```
   
   Or with uvicorn directly:
   ```
   uvicorn main:app --reload
   ```

3. Access the API documentation at:
   ```
   http://localhost:8000/docs
   ```

## API Endpoints

- `/api/signal` - Get trading signals with timeframe parameter
- `/api/performance` - Get performance metrics
- `/api/tradeLog` - Get trade history
- `/api/settings` - Get or update trading settings
- `/api/sentiment` - Get market sentiment analysis
- `/api/riskAnalysis` - Get risk analysis data

## Integration with Frontend

To connect the frontend to this backend:

1. Update the API base URL in your frontend code
2. Replace the mock API calls with actual HTTP requests to these endpoints
