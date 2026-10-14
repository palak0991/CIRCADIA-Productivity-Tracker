import pytest
from datetime import datetime, timezone as dt_timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import AnalyticsCalculateRequest, TaskItem
from app.analytics_engine import calculate_analytics

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert "service" in data

def test_empty_dataset():
    req = AnalyticsCalculateRequest(
        userId=1,
        timezone="UTC",
        startDate="2026-10-01",
        endDate="2026-10-07",
        tasks=[],
        includeHeatmapImage=False,
    )
    result = calculate_analytics(req)
    assert result.overview.totalTasks == 0
    assert result.overview.completedTasks == 0
    assert result.overview.completionRate == 0.0
    assert result.overview.totalPlannedMinutes == 0
    assert result.overview.totalActualMinutes == 0
    assert len(result.heatmap.matrix) == 7
    assert len(result.heatmap.matrix[0]) == 24
    assert result.heatmap.totalActivityPoints == 0
    assert len(result.overrunAnalysis.topOverrunningTasks) == 0

def test_planned_vs_actual_duration_separation():
    # Verify that planned duration is NEVER substituted as actual duration
    now = datetime(2026, 10, 10, 12, 0, tzinfo=dt_timezone.utc)
    t1 = TaskItem(
        id=1,
        title="Task Without Actual Duration",
        status="COMPLETED",
        startDateTime=now,
        endDateTime=now + timedelta(minutes=60),
        plannedDurationMinutes=60,
        actualStartDateTime=None,
        actualEndDateTime=None,
        actualDurationMinutes=None,
    )
    t2 = TaskItem(
        id=2,
        title="Task With Actual Duration",
        status="COMPLETED",
        startDateTime=now + timedelta(hours=2),
        endDateTime=now + timedelta(hours=3),
        plannedDurationMinutes=60,
        actualStartDateTime=now + timedelta(hours=2),
        actualEndDateTime=now + timedelta(hours=2, minutes=80),
        actualDurationMinutes=80,
    )
    
    req = AnalyticsCalculateRequest(
        userId=1,
        timezone="UTC",
        startDate="2026-10-10",
        endDate="2026-10-10",
        tasks=[t1, t2],
        referenceTime=now + timedelta(days=1),
        includeHeatmapImage=False,
    )
    res = calculate_analytics(req)
    
    # Total planned is 60 + 60 = 120
    assert res.overview.totalPlannedMinutes == 120
    # Total actual must ONLY come from t2 (80 mins), never treating t1's planned 60 as actual
    assert res.overview.totalActualMinutes == 80
    assert res.overview.actualDurationAvailableTasks == 1
    assert res.overview.averageActualDurationMinutes == 80.0
    assert res.overview.averagePlannedDurationMinutes == 60.0

def test_zero_planned_duration_safe_division():
    # Verify zero planned duration doesn't cause division by zero
    now = datetime(2026, 10, 10, 10, 0, tzinfo=dt_timezone.utc)
    t = TaskItem(
        id=3,
        title="Zero Duration Milestone",
        status="COMPLETED",
        startDateTime=now,
        endDateTime=now,
        plannedDurationMinutes=0,
        actualStartDateTime=now,
        actualEndDateTime=now + timedelta(minutes=15),
        actualDurationMinutes=15,
    )
    req = AnalyticsCalculateRequest(
        userId=1,
        timezone="UTC",
        startDate="2026-10-10",
        endDate="2026-10-10",
        tasks=[t],
        includeHeatmapImage=False,
    )
    res = calculate_analytics(req)
    assert res.overview.totalTasks == 1
    assert res.overrunAnalysis.totalOverrunningTasks == 1
    # Overrun percentage should be safely handled
    overrun_task = res.overrunAnalysis.topOverrunningTasks[0]
    assert overrun_task.differenceMinutes == 15
    assert overrun_task.overrunPercentage is None

def test_overdue_tasks_calculation():
    ref_time = datetime(2026, 10, 14, 15, 0, tzinfo=dt_timezone.utc)
    # Task in past but still PLANNED => Overdue
    past_planned = TaskItem(
        id=10,
        title="Overdue Task",
        status="PLANNED",
        startDateTime=ref_time - timedelta(hours=5),
        endDateTime=ref_time - timedelta(hours=3),
        plannedDurationMinutes=120,
    )
    # Task in past but COMPLETED => NOT Overdue
    past_completed = TaskItem(
        id=11,
        title="Completed Task",
        status="COMPLETED",
        startDateTime=ref_time - timedelta(hours=5),
        endDateTime=ref_time - timedelta(hours=3),
        plannedDurationMinutes=120,
    )
    # Task in future and PLANNED => NOT Overdue
    future_planned = TaskItem(
        id=12,
        title="Future Task",
        status="PLANNED",
        startDateTime=ref_time + timedelta(hours=2),
        endDateTime=ref_time + timedelta(hours=4),
        plannedDurationMinutes=120,
    )
    
    req = AnalyticsCalculateRequest(
        userId=1,
        timezone="UTC",
        startDate="2026-10-14",
        endDate="2026-10-14",
        tasks=[past_planned, past_completed, future_planned],
        referenceTime=ref_time,
        includeHeatmapImage=False,
    )
    res = calculate_analytics(req)
    assert res.overview.totalTasks == 3
    assert res.overview.overdueTasks == 1
    assert res.overview.completedTasks == 1
    assert res.overview.pendingTasks == 2

def test_timezone_conversion_and_heatmap():
    # 2026-10-14 20:00 UTC = 2026-10-15 01:30 in Asia/Kolkata (+5:30)
    # Wednesday 20:00 UTC -> Thursday 01:30 IST
    t_utc = datetime(2026, 10, 14, 20, 0, tzinfo=dt_timezone.utc) # Wed
    task = TaskItem(
        id=20,
        title="Late night UTC task",
        status="COMPLETED",
        startDateTime=t_utc,
        endDateTime=t_utc + timedelta(hours=1),
        plannedDurationMinutes=60,
    )
    
    # Calculate in Asia/Kolkata
    req_ist = AnalyticsCalculateRequest(
        userId=1,
        timezone="Asia/Kolkata",
        startDate="2026-10-14",
        endDate="2026-10-15",
        tasks=[task],
        includeHeatmapImage=False,
    )
    res_ist = calculate_analytics(req_ist)
    
    # In IST: local hour is 1 (01:30 AM), local day is Thursday (index 3)
    # Monday=0, Tuesday=1, Wednesday=2, Thursday=3
    matrix = res_ist.heatmap.matrix
    assert matrix[3][1] == 1
    assert res_ist.heatmap.totalActivityPoints == 1

def test_overrun_vs_underrun_distinction():
    now = datetime(2026, 10, 14, 10, 0, tzinfo=dt_timezone.utc)
    t_overrun = TaskItem(
        id=31,
        title="Long meeting",
        categoryName="Work",
        status="COMPLETED",
        startDateTime=now,
        endDateTime=now + timedelta(minutes=60),
        plannedDurationMinutes=60,
        actualStartDateTime=now,
        actualEndDateTime=now + timedelta(minutes=90),
        actualDurationMinutes=90,
    )
    t_underrun = TaskItem(
        id=32,
        title="Quick call",
        categoryName="Work",
        status="COMPLETED",
        startDateTime=now + timedelta(hours=2),
        endDateTime=now + timedelta(hours=3),
        plannedDurationMinutes=60,
        actualStartDateTime=now + timedelta(hours=2),
        actualEndDateTime=now + timedelta(hours=2, minutes=45),
        actualDurationMinutes=45,
    )
    t_ontime = TaskItem(
        id=33,
        title="Lunch",
        categoryName="Personal",
        status="COMPLETED",
        startDateTime=now + timedelta(hours=4),
        endDateTime=now + timedelta(hours=5),
        plannedDurationMinutes=60,
        actualStartDateTime=now + timedelta(hours=4),
        actualEndDateTime=now + timedelta(hours=5),
        actualDurationMinutes=60,
    )
    
    req = AnalyticsCalculateRequest(
        userId=1,
        timezone="UTC",
        startDate="2026-10-14",
        endDate="2026-10-14",
        tasks=[t_overrun, t_underrun, t_ontime],
        includeHeatmapImage=True,
    )
    res = calculate_analytics(req)
    
    oa = res.overrunAnalysis
    assert oa.totalOverrunningTasks == 1
    assert oa.totalUnderrunningTasks == 1
    assert oa.totalOnTimeTasks == 1
    assert len(oa.topOverrunningTasks) == 1
    assert oa.topOverrunningTasks[0].differenceMinutes == 30
    assert oa.topOverrunningTasks[0].overrunPercentage == 50.0
    assert oa.topOverrunningTasks[0].type == "OVERRUN"
    
    assert len(oa.topUnderrunningTasks) == 1
    assert oa.topUnderrunningTasks[0].differenceMinutes == -15
    assert oa.topUnderrunningTasks[0].overrunPercentage == -25.0
    assert oa.topUnderrunningTasks[0].type == "UNDERRUN"
    
    assert res.heatmapImageBase64 is not None
    assert res.heatmapImageBase64.startswith("data:image/png;base64,")

def test_api_calculate_endpoint():
    now = datetime(2026, 10, 14, 10, 0, tzinfo=dt_timezone.utc)
    payload = {
        "userId": 42,
        "timezone": "UTC",
        "startDate": "2026-10-14",
        "endDate": "2026-10-14",
        "tasks": [
            {
                "id": 101,
                "title": "API Test Task",
                "categoryName": "Testing",
                "status": "COMPLETED",
                "startDateTime": now.isoformat(),
                "endDateTime": (now + timedelta(minutes=45)).isoformat(),
                "plannedDurationMinutes": 45,
                "actualDurationMinutes": 40
            }
        ],
        "includeHeatmapImage": False
    }
    response = client.post("/api/v1/analytics/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["overview"]["totalTasks"] == 1
    assert data["overview"]["completedTasks"] == 1
    assert data["overview"]["completionRate"] == 100.0
    assert data["overview"]["totalPlannedMinutes"] == 45
    assert data["overview"]["totalActualMinutes"] == 40
