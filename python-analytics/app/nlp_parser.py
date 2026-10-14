import re
from datetime import datetime, date, time, timedelta, timezone as dt_timezone
from typing import Dict, Any, List, Optional, Tuple
from zoneinfo import ZoneInfo
import dateparser
import spacy

from app.schemas import NLPParseRequest, NLPParseResponse, CategoryOption

# Load spaCy English model
try:
    nlp = spacy.load("en_core_web_sm")
except Exception:
    # Fallback to blank model if not found
    nlp = spacy.blank("en")

# Word-to-number mapping for duration parsing
WORD_NUMBERS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "half": 0.5,
    "quarter": 0.25, "single": 1
}

DAYS_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6
}

def _get_timezone(tz_str: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz_str)
    except Exception:
        return ZoneInfo("UTC")

def _parse_duration(text: str) -> Tuple[Optional[int], Optional[str], Optional[Tuple[int, int]]]:
    """
    Extracts duration in minutes and the matched string span.
    Supports: "for 90 minutes", "for 45 mins", "for two hours", "for 1.5 hours", "for half an hour"
    Returns: (minutes, matched_text, (start_idx, end_idx))
    """
    # Regex for "for <number|word> <units>" or "<number> minute(s)/hour(s)"
    pattern = re.compile(
        r'\b(?:for\s+)?((?:\d+(?:\.\d+)?)|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*'
        r'(hours?|hrs?|minutes?|mins?)\b',
        re.IGNORECASE
    )
    
    match = pattern.search(text)
    if not match:
        # Check "half an hour"
        half_hr = re.search(r'\b(?:for\s+)?half\s+an\s+hour\b', text, re.IGNORECASE)
        if half_hr:
            return 30, half_hr.group(0), half_hr.span()
        return None, None, None
        
    num_str = match.group(1).lower()
    unit_str = match.group(2).lower()
    
    if num_str in WORD_NUMBERS:
        val = WORD_NUMBERS[num_str]
    else:
        try:
            val = float(num_str)
        except ValueError:
            return None, None, None
            
    if "hour" in unit_str or "hr" in unit_str:
        mins = int(val * 60)
    else:
        mins = int(val)
        
    return mins, match.group(0), match.span()

def _parse_time_range(text: str) -> Tuple[Optional[time], Optional[time], Optional[str], Optional[Tuple[int, int]]]:
    """
    Extracts time intervals:
    e.g. "from 4 PM to 5:30 PM", "from 10 AM to noon", "from 10:00 to 11:30", "4 PM - 5:30 PM"
    Returns: (start_time, end_time, matched_text, (start_idx, end_idx))
    """
    # Pattern: from <time1> to <time2> or <time1> - <time2>
    pattern = re.compile(
        r'\b(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\s*'
        r'(?:to|-|until)\s*'
        r'(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b',
        re.IGNORECASE
    )
    
    match = pattern.search(text)
    if not match:
        return None, None, None, None
        
    t1_str = match.group(1).strip()
    t2_str = match.group(2).strip()
    
    def parse_time_token(token: str, default_meridiem: Optional[str] = None) -> Optional[time]:
        low = token.lower()
        if low == "noon":
            return time(12, 0)
        if low == "midnight":
            return time(0, 0)
            
        m = re.match(r'^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$', low)
        if not m:
            return None
            
        h = int(m.group(1))
        mins = int(m.group(2)) if m.group(2) else 0
        meridiem = m.group(3) or default_meridiem
        
        if meridiem == "pm" and h < 12:
            h += 12
        elif meridiem == "am" and h == 12:
            h = 0
            
        if 0 <= h < 24 and 0 <= mins < 60:
            return time(h, mins)
        return None

    # Determine default meridiem from t2 if t1 lacks it (e.g., "from 4 to 5:30 PM")
    t2_meridiem = "pm" if "pm" in t2_str.lower() else ("am" if "am" in t2_str.lower() else None)
    
    t2 = parse_time_token(t2_str)
    t1 = parse_time_token(t1_str, default_meridiem=t2_meridiem)
    
    if t1 and t2:
        return t1, t2, match.group(0), match.span()
        
    return None, None, None, None

def _parse_single_time(text: str) -> Tuple[Optional[time], Optional[str], Optional[Tuple[int, int]]]:
    """
    Extracts standalone start time:
    e.g. "at 7 PM", "at 7:30 am", "at noon"
    Returns: (start_time, matched_text, (start_idx, end_idx))
    """
    pattern = re.compile(
        r'\b(?:at|around)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b',
        re.IGNORECASE
    )
    match = pattern.search(text)
    if not match:
        return None, None, None
        
    token = match.group(1).lower().strip()
    if token == "noon":
        return time(12, 0), match.group(0), match.span()
    if token == "midnight":
        return time(0, 0), match.group(0), match.span()
        
    m = re.match(r'^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$', token)
    if not m:
        return None, None, None
        
    h = int(m.group(1))
    mins = int(m.group(2)) if m.group(2) else 0
    meridiem = m.group(3)
    
    if meridiem == "pm" and h < 12:
        h += 12
    elif meridiem == "am" and h == 12:
        h = 0
        
    if 0 <= h < 24 and 0 <= mins < 60:
        return time(h, mins), match.group(0), match.span()
        
    return None, None, None

def _parse_relative_date(text: str, ref_date: date) -> Tuple[Optional[date], Optional[str], Optional[Tuple[int, int]]]:
    """
    Resolves relative date relative to reference date:
    - today, tomorrow, yesterday
    - this Saturday, next Monday, on Friday
    """
    low = text.lower()
    
    # 1. Direct relative words
    if re.search(r'\btomorrow\b', low):
        m = re.search(r'\btomorrow\b', text, re.IGNORECASE)
        return ref_date + timedelta(days=1), m.group(0), m.span()
        
    if re.search(r'\btoday\b', low):
        m = re.search(r'\btoday\b', text, re.IGNORECASE)
        return ref_date, m.group(0), m.span()
        
    # 2. Weekday matching: "this Saturday", "next Monday", "on Friday", "Saturday"
    weekday_pattern = re.compile(
        r'\b(?:(this|next|on)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
        re.IGNORECASE
    )
    m = weekday_pattern.search(text)
    if m:
        qualifier = (m.group(1) or "").lower()
        day_name = m.group(2).lower()
        target_weekday = DAYS_MAP[day_name]
        curr_weekday = ref_date.weekday()
        
        days_ahead = (target_weekday - curr_weekday) % 7
        if days_ahead == 0 and qualifier == "next":
            days_ahead = 7
        elif days_ahead == 0 and qualifier == "this":
            days_ahead = 0
        elif days_ahead == 0 and not qualifier:
            days_ahead = 7
        elif qualifier == "next" and days_ahead <= 7:
            days_ahead += 7
            
        target_date = ref_date + timedelta(days=days_ahead)
        return target_date, m.group(0), m.span()
        
    # 3. Use dateparser as general fallback
    parsed = dateparser.parse(
        text,
        settings={
            "RELATIVE_BASE": datetime.combine(ref_date, time(12, 0)),
            "PREFER_DATES_FROM": "future",
            "RETURN_AS_TIMEZONE_AWARE": False
        }
    )
    if parsed:
        return parsed.date(), None, None
        
    return None, None, None

def _detect_time_of_day_ambiguity(text: str) -> Optional[str]:
    """
    Detects if morning, afternoon, evening, or night is mentioned without explicit hour.
    """
    low = text.lower()
    if re.search(r'\bmorning\b', low):
        return "morning"
    if re.search(r'\bafternoon\b', low):
        return "afternoon"
    if re.search(r'\bevening\b', low):
        return "evening"
    if re.search(r'\bnight\b', low):
        return "night"
    return None

def _match_category(text: str, categories: List[CategoryOption]) -> Tuple[Optional[int], Optional[str]]:
    """
    Matches text against user's actual categories list.
    Never invents categories.
    """
    if not categories:
        return None, None
        
    low_text = text.lower()
    
    # Keyword associations for common task types
    KEYWORDS = {
        "study": ["study", "dbms", "sql", "exam", "reading", "read", "lecture", "book", "course", "learn"],
        "work": ["work", "project", "assignment", "interview", "meeting", "code", "client", "pr", "bug"],
        "personal": ["personal", "workout", "gym", "dinner", "lunch", "errand", "doctor", "relax"],
        "fitness": ["gym", "run", "workout", "exercise", "walk"],
    }
    
    # 1. Exact or partial match on category name
    for cat in categories:
        c_name = cat.name.lower()
        if re.search(r'\b' + re.escape(c_name) + r'\b', low_text):
            return cat.id, cat.name
            
    # 2. Check keyword associations against category name
    for cat in categories:
        c_name = cat.name.lower()
        for group, words in KEYWORDS.items():
            if group in c_name:
                for w in words:
                    if re.search(r'\b' + re.escape(w) + r'\b', low_text):
                        return cat.id, cat.name
                        
    return None, None

def parse_natural_language_task(req: NLPParseRequest) -> NLPParseResponse:
    text = req.text.strip()
    if not text:
        return NLPParseResponse(
            originalText="",
            title="Untitled Task",
            missingFields=["title", "date", "startTime", "endTime"],
            needsConfirmation=True,
            clarificationQuestions=["Please provide a task description."],
            confidence={"overall": "low"}
        )

    tz = _get_timezone(req.timezone)
    ref_dt = req.referenceTime if req.referenceTime else datetime.now(dt_timezone.utc)
    ref_local = ref_dt.astimezone(tz)
    ref_date = ref_local.date()

    # Track spans of temporal tokens to remove when isolating task description
    spans_to_remove: List[Tuple[int, int]] = []

    # 1. Parse Duration
    dur_mins, dur_str, dur_span = _parse_duration(text)
    if dur_span:
        spans_to_remove.append(dur_span)

    # 2. Parse Time Range ("from 4 PM to 5:30 PM", "from 10 AM to noon")
    start_t, end_t, range_str, range_span = _parse_time_range(text)
    if range_span:
        spans_to_remove.append(range_span)

    # 3. Parse Single Start Time ("at 7 PM") if range wasn't matched
    if not start_t:
        start_t, single_str, single_span = _parse_single_time(text)
        if single_span:
            spans_to_remove.append(single_span)

    # 4. Parse Relative Date ("today", "tomorrow", "this Saturday")
    target_date, date_str, date_span = _parse_relative_date(text, ref_date)
    if date_span:
        spans_to_remove.append(date_span)

    # 5. Check Time of Day Ambiguity ("morning", "evening", etc.)
    time_of_day = _detect_time_of_day_ambiguity(text)
    if time_of_day:
        tod_m = re.search(r'\b' + time_of_day + r'\b', text, re.IGNORECASE)
        if tod_m:
            spans_to_remove.append(tod_m.span())

    # 6. Check for duration inconsistency if both range and duration are given
    inconsistent_duration = False
    clarification_questions: List[str] = []
    
    if start_t and end_t and dur_mins:
        # Calculate range minutes
        dt1 = datetime.combine(ref_date, start_t)
        dt2 = datetime.combine(ref_date, end_t)
        if dt2 <= dt1:
            dt2 += timedelta(days=1)
        range_mins = int((dt2 - dt1).total_seconds() / 60)
        
        if range_mins != dur_mins:
            inconsistent_duration = True
            clarification_questions.append(
                f"Notice: The time interval ({start_t.strftime('%I:%M %p').lstrip('0')} to {end_t.strftime('%I:%M %p').lstrip('0')}) is {range_mins} minutes, "
                f"but you also specified {dur_mins} minutes. Please confirm which duration you prefer."
            )
    elif start_t and end_t and not dur_mins:
        dt1 = datetime.combine(ref_date, start_t)
        dt2 = datetime.combine(ref_date, end_t)
        if dt2 <= dt1:
            dt2 += timedelta(days=1)
        dur_mins = int((dt2 - dt1).total_seconds() / 60)
    elif start_t and dur_mins and not end_t:
        dt1 = datetime.combine(ref_date, start_t)
        dt2 = dt1 + timedelta(minutes=dur_mins)
        end_t = dt2.time()

    # 7. spaCy Linguistic Processing to extract Title and Clean Description
    # Remove all extracted temporal spans from text to isolate task intent
    cleaned_chars = list(text)
    for s_idx, e_idx in sorted(spans_to_remove, key=lambda x: x[0], reverse=True):
        for i in range(s_idx, e_idx):
            cleaned_chars[i] = " "
            
    raw_desc = "".join(cleaned_chars).strip()
    # Normalize leftover whitespace and prepositions
    raw_desc = re.sub(r'\s+', ' ', raw_desc)
    raw_desc = re.sub(r'\b(at|on|for|from|to|this|tomorrow|today)\b\s*$', '', raw_desc, flags=re.IGNORECASE).strip()
    raw_desc = re.sub(r'^\s*(at|on|for|from|to)\b', '', raw_desc, flags=re.IGNORECASE).strip()

    # Use spaCy for linguistic title extraction
    doc = nlp(raw_desc if raw_desc else text)
    
    title_candidate = raw_desc if raw_desc else text
    if title_candidate:
        # Capitalize first letter
        title = title_candidate[0].upper() + title_candidate[1:]
    else:
        title = "New Task"

    # 8. Category Matching
    cat_id, cat_name = _match_category(text, req.availableCategories)

    # 9. Format output fields
    date_formatted = target_date.strftime("%Y-%m-%d") if target_date else None
    start_time_formatted = start_t.strftime("%H:%M") if start_t else None
    end_time_formatted = end_t.strftime("%H:%M") if end_t else None

    # Construct UTC ISO-8601 timestamps if sufficient info is present
    start_iso = None
    end_iso = None
    if target_date and start_t:
        local_start = datetime.combine(target_date, start_t).replace(tzinfo=tz)
        start_iso = local_start.astimezone(dt_timezone.utc).isoformat()
        
    if target_date and end_t:
        local_end = datetime.combine(target_date, end_t).replace(tzinfo=tz)
        if start_t and end_t <= start_t:
            local_end += timedelta(days=1)
        end_iso = local_end.astimezone(dt_timezone.utc).isoformat()

    # 10. Check Missing Fields & Ambiguity
    missing_fields: List[str] = []
    confidence: Dict[str, str] = {}

    if not target_date:
        missing_fields.append("date")
        clarification_questions.append("Which date would you like to schedule this task for?")
        confidence["date"] = "missing"
    else:
        confidence["date"] = "high"

    if not start_t:
        missing_fields.append("startTime")
        if time_of_day:
            clarification_questions.append(
                f"You mentioned {time_of_day}. What specific start time would you like (e.g., 9:00 AM)?"
            )
            confidence["startTime"] = "ambiguous"
        elif dur_mins:
            clarification_questions.append(
                f"You specified a duration of {dur_mins} minutes. What start time should we set?"
            )
            confidence["startTime"] = "missing"
        else:
            clarification_questions.append("What time would you like this task to start?")
            confidence["startTime"] = "missing"
    else:
        confidence["startTime"] = "high"

    if not end_t:
        missing_fields.append("endTime")
        confidence["endTime"] = "missing"
    else:
        confidence["endTime"] = "high"

    if not cat_id:
        confidence["category"] = "unassigned"
    else:
        confidence["category"] = "high"

    confidence["title"] = "high" if len(title) > 2 else "medium"

    needs_confirmation = len(missing_fields) > 0 or inconsistent_duration or (len(clarification_questions) > 0)

    return NLPParseResponse(
        originalText=text,
        title=title,
        description=text,
        date=date_formatted,
        startTime=start_time_formatted,
        endTime=end_time_formatted,
        durationMinutes=dur_mins,
        categoryId=cat_id,
        categoryName=cat_name,
        startDateTime=start_iso,
        endDateTime=end_iso,
        missingFields=missing_fields,
        needsConfirmation=needs_confirmation,
        clarificationQuestions=clarification_questions,
        confidence=confidence,
        inconsistentDuration=inconsistent_duration
    )
