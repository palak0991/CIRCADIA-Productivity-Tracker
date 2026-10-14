import logging
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.schemas import AnalyticsCalculateRequest, AnalyticsResponse, NLPParseRequest, NLPParseResponse
from app.analytics_engine import calculate_analytics
from app.nlp_parser import parse_natural_language_task

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("python-analytics")

app = FastAPI(
    title="24-Hour Visualizer - Python Analytics Microservice",
    description="Productivity Analytics Engine powered by FastAPI, Pandas, NumPy, and Seaborn",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "UP",
        "service": "24h-visualizer-python-analytics",
        "version": "1.0.0",
        "engine": "pandas+numpy+seaborn",
    }

@app.post("/api/v1/analytics/calculate", response_model=AnalyticsResponse, tags=["Analytics"])
def calculate_productivity_metrics(request: AnalyticsCalculateRequest):
    try:
        logger.info(
            f"Calculating analytics for user={request.userId}, "
            f"date_range={request.startDate} to {request.endDate}, "
            f"tasks_count={len(request.tasks)}, timezone={request.timezone}"
        )
        return calculate_analytics(request)
    except Exception as e:
        logger.exception("Error executing analytics calculation")
@app.post("/api/v1/nlp/parse-task", response_model=NLPParseResponse, tags=["NLP"])
def parse_task(request: NLPParseRequest):
    try:
        logger.info(f"Parsing natural language task: '{request.text}' (timezone={request.timezone})")
        return parse_natural_language_task(request)
    except Exception as e:
        logger.exception("Error during NLP task parsing")
        raise HTTPException(status_code=500, detail=f"NLP parsing error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
