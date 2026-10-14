import pytest
from datetime import datetime, timezone as dt_timezone
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import NLPParseRequest, CategoryOption
from app.nlp_parser import parse_natural_language_task

client = TestClient(app)

# Fixed reference time for reproducible tests: Wednesday 2026-10-14 10:00 UTC
REF_TIME = datetime(2026, 10, 14, 10, 0, tzinfo=dt_timezone.utc)

AVAILABLE_CATEGORIES = [
    CategoryOption(id=1, name="Study", color="#3B82F6"),
    CategoryOption(id=2, name="Work", color="#EC4899"),
    CategoryOption(id=3, name="Personal", color="#10B981"),
]

def test_example_1_study_dbms_tomorrow_morning():
    # Example 1: "Study DBMS for two hours tomorrow morning."
    req = NLPParseRequest(
        text="Study DBMS for two hours tomorrow morning.",
        referenceTime=REF_TIME,
        timezone="UTC",
        availableCategories=AVAILABLE_CATEGORIES,
    )
    res = parse_natural_language_task(req)
    
    assert "Study DBMS" in res.title
    assert res.date == "2026-10-15"  # tomorrow (ref is 2026-10-14)
    assert res.durationMinutes == 120  # two hours
    assert res.categoryId == 1  # Study category
    # Start time is ambiguous because only "morning" was specified
    assert "startTime" in res.missingFields
    assert res.needsConfirmation is True
    assert any("morning" in q.lower() for q in res.clarificationQuestions)

def test_example_2_java_assignment_today_range():
    # Example 2: "Complete my Java assignment today from 4 PM to 5:30 PM."
    req = NLPParseRequest(
        text="Complete my Java assignment today from 4 PM to 5:30 PM.",
        referenceTime=REF_TIME,
        timezone="UTC",
        availableCategories=AVAILABLE_CATEGORIES,
    )
    res = parse_natural_language_task(req)
    
    assert "Complete my Java assignment" in res.title
    assert res.date == "2026-10-14"  # today
    assert res.startTime == "16:00"
    assert res.endTime == "17:30"
    assert res.durationMinutes == 90
    assert res.categoryId == 2  # Work category (assignment)
    assert "startTime" not in res.missingFields
    assert "endTime" not in res.missingFields
    assert res.startDateTime == "2026-10-14T16:00:00+00:00"
    assert res.endDateTime == "2026-10-14T17:30:00+00:00"

def test_example_3_read_tomorrow_at_7pm():
    # Example 3: "Read for 45 minutes tomorrow at 7 PM."
    req = NLPParseRequest(
        text="Read for 45 minutes tomorrow at 7 PM.",
        referenceTime=REF_TIME,
        timezone="UTC",
        availableCategories=AVAILABLE_CATEGORIES,
    )
    res = parse_natural_language_task(req)
    
    assert "Read" in res.title
    assert res.date == "2026-10-15"  # tomorrow
    assert res.startTime == "19:00"
    assert res.durationMinutes == 45
    assert res.endTime == "19:45"
    assert res.categoryId == 1  # Study category (reading)
    assert res.startDateTime == "2026-10-15T19:00:00+00:00"
    assert res.endDateTime == "2026-10-15T19:45:00+00:00"

def test_example_4_project_this_saturday():
    # Example 4: "Work on my project for 90 minutes this Saturday."
    # Ref date is Wed 2026-10-14 -> Saturday is 2026-10-17
    req = NLPParseRequest(
        text="Work on my project for 90 minutes this Saturday.",
        referenceTime=REF_TIME,
        timezone="UTC",
        availableCategories=AVAILABLE_CATEGORIES,
    )
    res = parse_natural_language_task(req)
    
    assert "Work on my project" in res.title
    assert res.date == "2026-10-17"  # Saturday
    assert res.durationMinutes == 90
    assert res.categoryId == 2  # Work
    # Start time is missing because only duration and date were given
    assert "startTime" in res.missingFields
    assert res.needsConfirmation is True
    assert any("start time" in q.lower() for q in res.clarificationQuestions)

def test_example_5_sql_interview_tomorrow_noon():
    # Example 5: "Prepare for my SQL interview tomorrow from 10 AM to noon."
    req = NLPParseRequest(
        text="Prepare for my SQL interview tomorrow from 10 AM to noon.",
        referenceTime=REF_TIME,
        timezone="UTC",
        availableCategories=AVAILABLE_CATEGORIES,
    )
    res = parse_natural_language_task(req)
    
    assert "Prepare for my SQL interview" in res.title
    assert res.date == "2026-10-15"
    assert res.startTime == "10:00"
    assert res.endTime == "12:00"
    assert res.durationMinutes == 120
    assert res.categoryId in [1, 2]  # Study / Work
    assert res.startDateTime == "2026-10-15T10:00:00+00:00"
    assert res.endDateTime == "2026-10-15T12:00:00+00:00"

def test_conflicting_duration_and_range():
    # "Meeting from 4 PM to 5 PM for 90 minutes" (4-5 PM is 60m, but 90m stated)
    req = NLPParseRequest(
        text="Team sync from 4 PM to 5 PM for 90 minutes.",
        referenceTime=REF_TIME,
        timezone="UTC",
    )
    res = parse_natural_language_task(req)
    
    assert res.inconsistentDuration is True
    assert res.needsConfirmation is True
    assert any("interval" in q.lower() and "90" in q for q in res.clarificationQuestions)

def test_category_matching_never_invents_categories():
    req = NLPParseRequest(
        text="Go to the dental clinic tomorrow at 2 PM.",
        referenceTime=REF_TIME,
        timezone="UTC",
        availableCategories=AVAILABLE_CATEGORIES,  # [Study, Work, Personal]
    )
    res = parse_natural_language_task(req)
    
    # "Dental clinic" is not in available categories, so categoryId must be None or matched to Personal
    if res.categoryId:
        assert res.categoryId in [1, 2, 3]
        assert res.categoryName in ["Study", "Work", "Personal"]

def test_empty_input():
    req = NLPParseRequest(
        text="",
        referenceTime=REF_TIME,
        timezone="UTC",
    )
    res = parse_natural_language_task(req)
    assert res.needsConfirmation is True
    assert "title" in res.missingFields

def test_api_nlp_parse_task_endpoint():
    payload = {
        "text": "Read research papers tomorrow from 3 PM to 4:30 PM",
        "referenceTime": REF_TIME.isoformat(),
        "timezone": "UTC",
        "availableCategories": [{"id": 1, "name": "Study"}]
    }
    response = client.post("/api/v1/nlp/parse-task", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["date"] == "2026-10-15"
    assert data["startTime"] == "15:00"
    assert data["endTime"] == "16:30"
    assert data["durationMinutes"] == 90
    assert data["categoryId"] == 1
    assert "Read research papers" in data["title"]
