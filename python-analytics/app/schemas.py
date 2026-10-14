from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class TaskItem(BaseModel):
    id: Optional[int] = None
    title: str = "Untitled Task"
    categoryId: Optional[int] = None
    categoryName: Optional[str] = "Uncategorized"
    categoryColor: Optional[str] = "#3B82F6"
    status: str = "PLANNED"
    startDateTime: datetime
    endDateTime: datetime
    actualStartDateTime: Optional[datetime] = None
    actualEndDateTime: Optional[datetime] = None
    plannedDurationMinutes: Optional[int] = None
    actualDurationMinutes: Optional[int] = None

class AnalyticsCalculateRequest(BaseModel):
    userId: Optional[int] = None
    timezone: str = "UTC"
    startDate: str = Field(..., description="YYYY-MM-DD")
    endDate: str = Field(..., description="YYYY-MM-DD")
    tasks: List[TaskItem] = Field(default_factory=list)
    referenceTime: Optional[datetime] = None
    includeHeatmapImage: bool = True

class ProductivityOverview(BaseModel):
    totalTasks: int
    completedTasks: int
    pendingTasks: int
    inProgressTasks: int
    missedTasks: int
    cancelledTasks: int
    overdueTasks: int
    completionRate: float
    totalPlannedMinutes: int
    totalActualMinutes: int
    averagePlannedDurationMinutes: float
    averageActualDurationMinutes: float
    actualDurationAvailableTasks: int

class DailyTrendItem(BaseModel):
    date: str
    dayOfWeek: str
    totalTasks: int
    completedTasks: int
    completionRate: float
    plannedMinutes: int
    actualMinutes: int

class WeeklyTrendItem(BaseModel):
    weekLabel: str
    totalTasks: int
    completedTasks: int
    completionRate: float
    plannedMinutes: int
    actualMinutes: int

class CategoryAnalyticsItem(BaseModel):
    categoryId: Optional[int] = None
    categoryName: str
    categoryColor: str
    totalTasks: int
    completedTasks: int
    completionRate: float
    plannedMinutes: int
    actualMinutes: int
    averagePlannedDurationMinutes: float
    averageActualDurationMinutes: float
    averageOverrunMinutes: float

class OverrunTaskItem(BaseModel):
    id: Optional[int] = None
    title: str
    categoryName: Optional[str] = None
    plannedMinutes: int
    actualMinutes: int
    differenceMinutes: int
    overrunPercentage: Optional[float] = None
    status: str
    type: str

class OverrunAnalysis(BaseModel):
    totalOverrunningTasks: int
    totalUnderrunningTasks: int
    totalOnTimeTasks: int
    averageOverrunPercentage: float
    topOverrunningTasks: List[OverrunTaskItem]
    topUnderrunningTasks: List[OverrunTaskItem]

class HeatmapMatrix(BaseModel):
    days: List[str]
    hours: List[int]
    matrix: List[List[int]]
    maxActivity: int
    totalActivityPoints: int

class AnalyticsResponse(BaseModel):
    overview: ProductivityOverview
    dailyTrends: List[DailyTrendItem]
    weeklyTrends: List[WeeklyTrendItem]
    categoryAnalysis: List[CategoryAnalyticsItem]
    overrunAnalysis: OverrunAnalysis
    heatmap: HeatmapMatrix
    heatmapImageBase64: Optional[str] = None
    dateRange: Dict[str, Any]
    generatedAt: datetime

# ─── NLP Natural Language Task Creation Schemas ──────────────────────────────
class CategoryOption(BaseModel):
    id: int
    name: str
    color: Optional[str] = None

class NLPParseRequest(BaseModel):
    text: str = Field(..., description="Natural language task description")
    referenceTime: Optional[datetime] = Field(None, description="Anchor timestamp in UTC for relative dates")
    timezone: str = Field("UTC", description="Target timezone name (e.g. UTC, Asia/Kolkata)")
    availableCategories: List[CategoryOption] = Field(default_factory=list)

class NLPParseResponse(BaseModel):
    originalText: str
    title: str
    description: Optional[str] = None
    date: Optional[str] = None           # YYYY-MM-DD
    startTime: Optional[str] = None      # HH:MM (24h)
    endTime: Optional[str] = None        # HH:MM (24h)
    durationMinutes: Optional[int] = None
    categoryId: Optional[int] = None
    categoryName: Optional[str] = None
    startDateTime: Optional[str] = None  # ISO-8601 UTC
    endDateTime: Optional[str] = None    # ISO-8601 UTC
    missingFields: List[str] = Field(default_factory=list)
    needsConfirmation: bool = False
    clarificationQuestions: List[str] = Field(default_factory=list)
    confidence: Dict[str, str] = Field(default_factory=dict)
    inconsistentDuration: bool = False

