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

# Industry & technical acronym dictionary for intelligent title formatting
TECH_ACRONYMS = {
    "dbms": "DBMS", "sql": "SQL", "nosql": "NoSQL", "dsa": "DSA",
    "api": "API", "apis": "APIs", "rest": "REST", "ai": "AI", "ml": "ML",
    "nlp": "NLP", "os": "OS", "cn": "CN", "aws": "AWS", "gcp": "GCP",
    "ui": "UI", "ux": "UX", "ui/ux": "UI/UX", "pr": "PR", "prs": "PRs",
    "ci/cd": "CI/CD", "cicd": "CI/CD", "oop": "OOP", "oops": "OOP",
    "llm": "LLM", "llms": "LLMs", "html": "HTML", "css": "CSS", "js": "JS",
    "ts": "TS", "iot": "IoT", "k8s": "K8s", "docker": "Docker",
    "python": "Python", "java": "Java", "react": "React", "springboot": "Spring Boot",
    "spring": "Spring", "leetcode": "LeetCode", "codechef": "CodeChef",
    "hackerrank": "HackerRank"
}

def _get_timezone(tz_str: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz_str)
    except Exception:
        return ZoneInfo("UTC")

def _parse_duration(text: str) -> Tuple[Optional[int], Optional[str], Optional[Tuple[int, int]]]:
    """
    Extracts duration in minutes and matched string span.
    Supports:
    - Compound durations: "for 1 hour 30 mins", "2 hrs and 15 mins", "1 hr 45 min"
    - Single unit: "for 90 minutes", "for 45 mins", "for two hours", "for 1.5 hours"
    - Idiomatic: "for half an hour", "half an hour", "quarter of an hour"
    """
    # 1. Compound duration (hours + minutes)
    compound_pattern = re.compile(
        r'\b(?:for\s+)?(\d+)\s*(?:hours?|hrs?)\s*(?:and\s+)?(\d+)\s*(?:minutes?|mins?)\b',
        re.IGNORECASE
    )
    m_comp = compound_pattern.search(text)
    if m_comp:
        hrs = int(m_comp.group(1))
        mins = int(m_comp.group(2))
        return hrs * 60 + mins, m_comp.group(0), m_comp.span()

    # 2. Idiomatic "half an hour" or "quarter of an hour"
    half_hr = re.search(r'\b(?:for\s+)?half\s+an?\s+hour\b', text, re.IGNORECASE)
    if half_hr:
        return 30, half_hr.group(0), half_hr.span()

    quarter_hr = re.search(r'\b(?:for\s+)?(?:a\s+)?quarter\s+(?:of\s+an?\s+)?hour\b', text, re.IGNORECASE)
    if quarter_hr:
        return 15, quarter_hr.group(0), quarter_hr.span()

    # 3. Standard single unit: "for <number|word> <units>" or "<number> minute(s)/hour(s)"
    pattern = re.compile(
        r'\b(?:for\s+)?((?:\d+(?:\.\d+)?)|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*'
        r'(hours?|hrs?|minutes?|mins?)\b',
        re.IGNORECASE
    )
    match = pattern.search(text)
    if not match:
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

def _parse_time_token(token: str, default_meridiem: Optional[str] = None) -> Optional[time]:
    low = token.lower().strip()
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

def _parse_time_range(text: str) -> Tuple[Optional[time], Optional[time], Optional[str], Optional[Tuple[int, int]]]:
    """
    Extracts time intervals:
    e.g.:
    - "from 5 to 6pm", "from 4 PM to 5:30 PM", "5 to 6pm", "5 to 6 pm"
    - "5-6pm", "5:00 - 6:30 pm", "5pm to 6pm"
    - "between 5 and 6pm", "between 2:00 and 4:00 pm"
    - "11pm to 7am" (midnight crossing)
    - "11 to 1pm" (11 AM to 1 PM)
    - "coding 2 to 4" (defaults to afternoon 14:00 to 16:00)
    """
    pattern = re.compile(
        r'\b(?:from\s+|between\s+)?'
        r'(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\s*'
        r'(?:to|-|until|till|through|and)\s*'
        r'(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b',
        re.IGNORECASE
    )

    match = pattern.search(text)
    if not match:
        return None, None, None, None

    t1_raw = match.group(1).strip()
    t2_raw = match.group(2).strip()

    t2_low = t2_raw.lower()
    t1_low = t1_raw.lower()

    t2_meridiem = "pm" if "pm" in t2_low else ("am" if "am" in t2_low else None)
    t1_meridiem = "pm" if "pm" in t1_low else ("am" if "am" in t1_low else None)

    m1 = re.match(r'^(\d{1,2})', t1_raw)
    m2 = re.match(r'^(\d{1,2})', t2_raw)

    default_t1_meridiem = t1_meridiem
    default_t2_meridiem = t2_meridiem

    if not t1_meridiem and t2_meridiem == "pm" and m1 and m2:
        h1 = int(m1.group(1))
        h2 = int(m2.group(1))
        if h1 < h2:
            default_t1_meridiem = "pm"
        elif h1 > h2:
            default_t1_meridiem = "am"  # e.g., 11 to 1pm -> 11 AM to 1 PM
        elif h1 == 12:
            default_t1_meridiem = "pm"  # 12 to 1pm -> 12 PM (noon)
        else:
            default_t1_meridiem = "pm"
    elif not t1_meridiem and not t2_meridiem:
        # Check text context for time-of-day hints
        low_context = text.lower()
        if any(w in low_context for w in ["evening", "night", "afternoon", "dinner", "lunch"]):
            default_t1_meridiem = "pm"
            default_t2_meridiem = "pm"
        elif any(w in low_context for w in ["morning", "breakfast"]):
            default_t1_meridiem = "am"
            default_t2_meridiem = "am"
        else:
            if m1 and int(m1.group(1)) < 7:
                default_t1_meridiem = "pm"
                default_t2_meridiem = "pm"
            else:
                default_t1_meridiem = None
                default_t2_meridiem = None
    elif not default_t1_meridiem:
        default_t1_meridiem = default_t2_meridiem

    t2 = _parse_time_token(t2_raw, default_meridiem=default_t2_meridiem)
    t1 = _parse_time_token(t1_raw, default_meridiem=default_t1_meridiem)

    if t1 and t2:
        return t1, t2, match.group(0), match.span()

    return None, None, None, None

def _parse_single_time(text: str) -> Tuple[Optional[time], Optional[str], Optional[Tuple[int, int]]]:
    """
    Extracts standalone start time:
    e.g. "at 7 PM", "at 7:30 am", "at noon", "@ 5pm", "starts at 5pm", "starting at 4:00"
    """
    pattern = re.compile(
        r'\b(?:at|around|@|starts?\s+at|starting\s+at)\s*'
        r'(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b',
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

    if not meridiem:
        low_context = text.lower()
        if any(w in low_context for w in ["evening", "night", "afternoon"]):
            meridiem = "pm"
        elif any(w in low_context for w in ["morning"]):
            meridiem = "am"
        elif h < 7:
            meridiem = "pm"

    if meridiem == "pm" and h < 12:
        h += 12
    elif meridiem == "am" and h == 12:
        h = 0

    if 0 <= h < 24 and 0 <= mins < 60:
        return time(h, mins), match.group(0), match.span()

    return None, None, None

def _parse_relative_date(text: str, ref_date: date) -> Tuple[Optional[date], Optional[str], Optional[Tuple[int, int]]]:
    """
    Resolves dates relative to reference date:
    - today, tonight, this morning, this afternoon, this evening
    - tomorrow, day after tomorrow, yesterday
    - this Saturday, next Monday, on Friday
    """
    low = text.lower()

    # 1. Day after tomorrow
    m_dat = re.search(r'\bday\s+after\s+tomorrow\b', text, re.IGNORECASE)
    if m_dat:
        return ref_date + timedelta(days=2), m_dat.group(0), m_dat.span()

    # 2. Tomorrow
    m_tom = re.search(r'\btomorrow\b', text, re.IGNORECASE)
    if m_tom:
        return ref_date + timedelta(days=1), m_tom.group(0), m_tom.span()

    # 3. Today / Tonight / This morning / This afternoon / This evening
    m_today = re.search(r'\b(today|tonight|this\s+morning|this\s+afternoon|this\s+evening)\b', text, re.IGNORECASE)
    if m_today:
        return ref_date, m_today.group(0), m_today.span()

    # 4. Yesterday
    m_yes = re.search(r'\byesterday\b', text, re.IGNORECASE)
    if m_yes:
        return ref_date - timedelta(days=1), m_yes.group(0), m_yes.span()

    # 5. Weekday matching: "this Saturday", "next Monday", "on Friday", "Saturday"
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

    # 6. Use dateparser as general fallback for specific dates (e.g. "Nov 15", "15th October")
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
    Matches text against user's actual categories list with rich semantic associations.
    Never invents categories.
    """
    if not categories:
        return None, None

    low_text = text.lower()

    # Comprehensive semantic associations
    KEYWORDS = {
        "work": [
            "work", "working", "project", "assignment", "meeting", "code", "coding", "client", "pr", "pull request",
            "bug", "fix", "deploy", "deployment", "office", "standup", "sync", "feature",
            "commit", "presentation", "interview", "resume", "cv", "email", "emails",
            "task", "sprint", "jira", "review", "backend", "frontend", "api", "refactor",
            "architecture", "documentation", "call", "discussion"
        ],
        "study": [
            "study", "studying", "dbms", "sql", "nosql", "dsa", "exam", "reading", "read",
            "lecture", "book", "course", "learn", "learning", "math", "maths", "science",
            "homework", "revision", "revise", "notes", "tutorial", "class",
            "college", "school", "paper", "research", "quiz", "algorithm", "algorithms",
            "practice", "problem", "leetcode", "codechef", "hackerrank"
        ],
        "fitness": [
            "gym", "run", "running", "workout", "work out", "exercise", "exercising",
            "walk", "walking", "yoga", "cardio", "training", "swim", "swimming",
            "stretch", "stretching", "cycling", "cycle", "meditation", "weights",
            "pushups", "pilates", "football", "badminton", "cricket"
        ],
        "personal": [
            "personal", "dinner", "lunch", "breakfast", "meal", "food", "errand", "errands",
            "doctor", "clinic", "hospital", "dentist", "medicine", "relax", "relaxing",
            "movie", "show", "watch", "series", "game", "gaming", "grocery", "groceries",
            "shopping", "chores", "cleaning", "clean", "family", "friends", "coffee", "tea",
            "snack", "haircut", "bank"
        ],
        "health": [
            "health", "doctor", "dentist", "therapy", "meditation", "medicine", "checkup"
        ],
        "rest": [
            "sleep", "nap", "rest", "bed", "powernap"
        ]
    }

    # 1. Exact or whole-word match on category name
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

def _format_smart_title(raw_title: str) -> str:
    """
    Capitalizes title intelligently with tech acronym preservation.
    e.g., 'study dbms' -> 'Study DBMS'
    'complete java assignment' -> 'Complete Java assignment'
    """
    if not raw_title:
        return "New Task"

    words = raw_title.split()
    formatted = []
    for i, w in enumerate(words):
        m = re.match(r'^([^a-zA-Z0-9]*)([a-zA-Z0-9/-]+)([^a-zA-Z0-9]*)$', w)
        if m:
            prefix, core, suffix = m.group(1), m.group(2), m.group(3)
            low_core = core.lower()
            if low_core in TECH_ACRONYMS:
                formatted_core = TECH_ACRONYMS[low_core]
            elif i == 0:
                formatted_core = core[0].upper() + core[1:]
            else:
                formatted_core = core
            formatted.append(f"{prefix}{formatted_core}{suffix}")
        else:
            formatted.append(w.capitalize() if i == 0 else w)

    result = " ".join(formatted).strip()
    return result if result else "New Task"

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

    # 1. Parse Duration ("for two hours", "for 90 mins", "for 1 hr 30 mins")
    dur_mins, dur_str, dur_span = _parse_duration(text)
    if dur_span:
        spans_to_remove.append(dur_span)

    # 2. Parse Time Range ("from 5 to 6pm", "from 4 PM to 5:30 PM", "5-6pm")
    start_t, end_t, range_str, range_span = _parse_time_range(text)
    if range_span:
        spans_to_remove.append(range_span)

    # 3. Parse Single Start Time ("at 7 PM", "starts at 5pm") if range wasn't matched
    if not start_t:
        start_t, single_str, single_span = _parse_single_time(text)
        if single_span:
            spans_to_remove.append(single_span)

    # 4. Parse Relative Date ("today", "tomorrow", "this Saturday")
    target_date, date_str, date_span = _parse_relative_date(text, ref_date)
    date_was_explicit = target_date is not None
    if date_span:
        spans_to_remove.append(date_span)

    # 5. Check Time of Day Ambiguity ("morning", "evening", etc.)
    time_of_day = _detect_time_of_day_ambiguity(text)
    if time_of_day:
        tod_m = re.search(r'\b' + time_of_day + r'\b', text, re.IGNORECASE)
        if tod_m:
            spans_to_remove.append(tod_m.span())

    # 6. Intelligent Date Defaulting
    # If no explicit date was mentioned in a 24-hour visualizer task, default to today (ref_date)
    if not target_date and (start_t or dur_mins or text):
        target_date = ref_date

    # 7. Duration & Range Reconciliation
    inconsistent_duration = False
    clarification_questions: List[str] = []

    if start_t and end_t and dur_mins:
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

    # 8. Linguistic Title & Clean Description Extraction
    cleaned_chars = list(text)
    for s_idx, e_idx in sorted(spans_to_remove, key=lambda x: x[0], reverse=True):
        for i in range(s_idx, e_idx):
            cleaned_chars[i] = " "

    raw_desc = "".join(cleaned_chars).strip()
    # Normalize leftover whitespace and prepositions
    raw_desc = re.sub(r'\s+', ' ', raw_desc)
    raw_desc = re.sub(r'\b(at|on|for|from|to|this|tomorrow|today|tonight|starting|starts)\b\s*$', '', raw_desc, flags=re.IGNORECASE).strip()
    raw_desc = re.sub(r'^\s*(at|on|for|from|to|scheduled\s+for|starting\s+at)\b', '', raw_desc, flags=re.IGNORECASE).strip()

    title_candidate = raw_desc if raw_desc else text
    title = _format_smart_title(title_candidate)

    # 9. Category Matching
    cat_id, cat_name = _match_category(text, req.availableCategories)

    # 10. Format Output Fields & UTC ISO-8601 Timestamps
    date_formatted = target_date.strftime("%Y-%m-%d") if target_date else None
    start_time_formatted = start_t.strftime("%H:%M") if start_t else None
    end_time_formatted = end_t.strftime("%H:%M") if end_t else None

    start_iso = None
    end_iso = None
    if target_date and start_t:
        local_start = datetime.combine(target_date, start_t).replace(tzinfo=tz)
        start_iso = local_start.astimezone(dt_timezone.utc).isoformat()

    if target_date and end_t:
        local_end = datetime.combine(target_date, end_t).replace(tzinfo=tz)
        if start_t and end_t <= start_t:
            # Midnight-crossing task
            local_end += timedelta(days=1)
        end_iso = local_end.astimezone(dt_timezone.utc).isoformat()

    # 11. Determine Missing Fields, Ambiguities & Confidence
    missing_fields: List[str] = []
    confidence: Dict[str, str] = {}

    if not target_date:
        missing_fields.append("date")
        clarification_questions.append("Which date would you like to schedule this task for?")
        confidence["date"] = "missing"
    else:
        confidence["date"] = "high" if date_was_explicit else "default_today"

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
