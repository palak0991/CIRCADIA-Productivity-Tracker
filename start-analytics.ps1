# Start Python Analytics Microservice (FastAPI + Uvicorn)
Write-Host "Starting Python Analytics Microservice on port 8000..." -ForegroundColor Magenta
Set-Location "$PSScriptRoot\python-analytics"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
