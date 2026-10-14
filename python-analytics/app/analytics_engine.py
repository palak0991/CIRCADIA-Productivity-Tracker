import base64
import io
import math
from datetime import datetime, date, timedelta, timezone as dt_timezone
from typing import Dict, Any, List, Optional
from zoneinfo import ZoneInfo

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd

from app.schemas import (
    AnalyticsCalculateRequest,
    AnalyticsResponse,
    ProductivityOverview,
    DailyTrendItem,
    WeeklyTrendItem,
    CategoryAnalyticsItem,
    OverrunTaskItem,
    OverrunAnalysis,
    HeatmapMatrix,
)

DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return default
    return round(float(val), 2)

def _safe_int(val: Any, default: int = 0) -> int:
    if val is None or pd.isna(val) or math.isnan(val) or math.isinf(val):
        return default
    return int(val)

def _get_zone_info(tz_str: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz_str)
    except Exception:
        return ZoneInfo("UTC")

def _generate_seaborn_heatmap(matrix: List[List[int]], max_val: int) -> Optional[str]:
    try:
        data = np.array(matrix)
        plt.figure(figsize=(10, 3.8), dpi=130)
        
        # Soft pink / blush aesthetic colormap
        cmap = sns.color_palette(["#2d1b2e", "#4a1942", "#831843", "#be185d", "#ec4899", "#f472b6", "#fbcfe8", "#fff1f2"], as_cmap=True)
        
        ax = sns.heatmap(
            data,
            cmap=cmap,
            linewidths=0.5,
            linecolor="#1f162b",
            cbar=True,
            cbar_kws={"label": "Activity Count", "shrink": 0.8},
            yticklabels=DAYS_OF_WEEK,
            xticklabels=[f"{h:02d}" for h in range(24)],
            vmin=0,
            vmax=max(max_val, 1),
        )
        
        plt.title("24-Hour Productivity Heatmap (Day × Hour)", fontsize=11, fontweight="bold", color="#fbcfe8", pad=12)
        plt.xlabel("Hour of Day (Local Time)", fontsize=9, color="#f472b6", labelpad=6)
        plt.ylabel("Day of Week", fontsize=9, color="#f472b6", labelpad=6)
        
        # Style axes and background
        ax.set_facecolor("#150f1f")
        plt.gcf().patch.set_facecolor("#150f1f")
        ax.tick_params(colors="#fbcfe8", labelsize=8)
        cbar = ax.collections[0].colorbar
        if cbar:
            cbar.ax.yaxis.set_tick_params(color="#fbcfe8")
            plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color="#fbcfe8", size=8)
            cbar.set_label("Activity Count", color="#fbcfe8", size=9)
            
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format="png", bbox_inches="tight", facecolor=plt.gcf().get_facecolor(), edgecolor="none")
        plt.close()
        buf.seek(0)
        
        base64_str = base64.b64encode(buf.read()).decode("utf-8")
        return f"data:image/png;base64,{base64_str}"
    except Exception as e:
        plt.close()
        return None

def calculate_analytics(req: AnalyticsCalculateRequest) -> AnalyticsResponse:
    tz = _get_zone_info(req.timezone)
    ref_time = req.referenceTime if req.referenceTime else datetime.now(dt_timezone.utc)
    
    # Empty dataset guard
    if not req.tasks:
        overview = ProductivityOverview(
            totalTasks=0,
            completedTasks=0,
            pendingTasks=0,
            inProgressTasks=0,
            missedTasks=0,
            cancelledTasks=0,
            overdueTasks=0,
            completionRate=0.0,
            totalPlannedMinutes=0,
            totalActualMinutes=0,
            averagePlannedDurationMinutes=0.0,
            averageActualDurationMinutes=0.0,
            actualDurationAvailableTasks=0,
        )
        empty_matrix = [[0] * 24 for _ in range(7)]
        heatmap = HeatmapMatrix(
            days=DAYS_OF_WEEK,
            hours=list(range(24)),
            matrix=empty_matrix,
            maxActivity=0,
            totalActivityPoints=0,
        )
        heatmap_img = _generate_seaborn_heatmap(empty_matrix, 0) if req.includeHeatmapImage else None
        
        return AnalyticsResponse(
            overview=overview,
            dailyTrends=[],
            weeklyTrends=[],
            categoryAnalysis=[],
            overrunAnalysis=OverrunAnalysis(
                totalOverrunningTasks=0,
                totalUnderrunningTasks=0,
                totalOnTimeTasks=0,
                averageOverrunPercentage=0.0,
                topOverrunningTasks=[],
                topUnderrunningTasks=[],
            ),
            heatmap=heatmap,
            heatmapImageBase64=heatmap_img,
            dateRange={"startDate": req.startDate, "endDate": req.endDate, "timezone": req.timezone},
            generatedAt=datetime.now(dt_timezone.utc),
        )

    # Convert tasks to a structured list of dictionaries
    records = []
    for t in req.tasks:
        start_utc = t.startDateTime if t.startDateTime.tzinfo else t.startDateTime.replace(tzinfo=dt_timezone.utc)
        end_utc = t.endDateTime if t.endDateTime.tzinfo else t.endDateTime.replace(tzinfo=dt_timezone.utc)
        
        start_local = start_utc.astimezone(tz)
        end_local = end_utc.astimezone(tz)
        
        # Planned duration in minutes
        if t.plannedDurationMinutes is not None and t.plannedDurationMinutes >= 0:
            planned_mins = t.plannedDurationMinutes
        else:
            diff = (end_utc - start_utc).total_seconds() / 60.0
            planned_mins = max(0, int(diff))
            
        # Actual duration in minutes
        actual_mins = None
        has_actual = False
        if t.actualDurationMinutes is not None and t.actualDurationMinutes >= 0:
            actual_mins = t.actualDurationMinutes
            has_actual = True
        elif t.actualStartDateTime and t.actualEndDateTime:
            act_s = t.actualStartDateTime if t.actualStartDateTime.tzinfo else t.actualStartDateTime.replace(tzinfo=dt_timezone.utc)
            act_e = t.actualEndDateTime if t.actualEndDateTime.tzinfo else t.actualEndDateTime.replace(tzinfo=dt_timezone.utc)
            diff = (act_e - act_s).total_seconds() / 60.0
            actual_mins = max(0, int(diff))
            has_actual = True
            
        # Overdue check: endDateTime < ref_time and status in PLANNED / IN_PROGRESS
        is_overdue = (t.status in ["PLANNED", "IN_PROGRESS"]) and (end_utc < ref_time)
        
        records.append({
            "id": t.id,
            "title": t.title,
            "categoryId": t.categoryId,
            "categoryName": t.categoryName or "Uncategorized",
            "categoryColor": t.categoryColor or "#ec4899",
            "status": t.status,
            "start_utc": start_utc,
            "end_utc": end_utc,
            "start_local": start_local,
            "end_local": end_local,
            "date_local": start_local.strftime("%Y-%m-%d"),
            "day_of_week_idx": start_local.weekday(),  # 0=Mon, 6=Sun
            "hour_of_day": start_local.hour,
            "planned_mins": planned_mins,
            "actual_mins": actual_mins,
            "has_actual": has_actual,
            "is_overdue": is_overdue,
        })
        
    df = pd.DataFrame(records)
    
    # ── 1. Productivity Overview ───────────────────────────────────────────────
    total_tasks = len(df)
    completed_tasks = int((df["status"] == "COMPLETED").sum())
    in_progress_tasks = int((df["status"] == "IN_PROGRESS").sum())
    pending_tasks = int((df["status"] == "PLANNED").sum())
    missed_tasks = int((df["status"] == "MISSED").sum())
    cancelled_tasks = int((df["status"] == "CANCELLED").sum())
    overdue_tasks = int(df["is_overdue"].sum())
    
    # Non-cancelled denominator for completion rate
    valid_tasks_count = total_tasks - cancelled_tasks
    if valid_tasks_count > 0:
        completion_rate = round((completed_tasks / valid_tasks_count) * 100.0, 1)
    else:
        completion_rate = 0.0
        
    # Planned minutes (all non-cancelled tasks)
    non_cancelled_df = df[df["status"] != "CANCELLED"]
    total_planned_minutes = int(non_cancelled_df["planned_mins"].sum())
    avg_planned_duration = _safe_float(non_cancelled_df["planned_mins"].mean()) if not non_cancelled_df.empty else 0.0
    
    # Actual minutes (only tasks with recorded actual duration)
    actual_df = df[df["has_actual"] == True]
    total_actual_minutes = int(actual_df["actual_mins"].sum()) if not actual_df.empty else 0
    avg_actual_duration = _safe_float(actual_df["actual_mins"].mean()) if not actual_df.empty else 0.0
    actual_duration_available_tasks = len(actual_df)
    
    overview = ProductivityOverview(
        totalTasks=total_tasks,
        completedTasks=completed_tasks,
        pendingTasks=pending_tasks,
        inProgressTasks=in_progress_tasks,
        missedTasks=missed_tasks,
        cancelledTasks=cancelled_tasks,
        overdueTasks=overdue_tasks,
        completionRate=completion_rate,
        totalPlannedMinutes=total_planned_minutes,
        totalActualMinutes=total_actual_minutes,
        averagePlannedDurationMinutes=avg_planned_duration,
        averageActualDurationMinutes=avg_actual_duration,
        actualDurationAvailableTasks=actual_duration_available_tasks,
    )
    
    # ── 2. Daily Trends ────────────────────────────────────────────────────────
    # Create complete date range sequence from startDate to endDate
    try:
        start_d = datetime.strptime(req.startDate, "%Y-%m-%d").date()
        end_d = datetime.strptime(req.endDate, "%Y-%m-%d").date()
    except Exception:
        start_d = df["start_local"].min().date()
        end_d = df["start_local"].max().date()
        
    if start_d > end_d:
        start_d, end_d = end_d, start_d
        
    daily_items: List[DailyTrendItem] = []
    curr_d = start_d
    all_dates = []
    while curr_d <= end_d:
        all_dates.append(curr_d)
        curr_d += timedelta(days=1)
        
    grouped_by_date = df.groupby("date_local") if not df.empty else None
    
    for d in all_dates:
        d_str = d.strftime("%Y-%m-%d")
        dow_str = DAYS_OF_WEEK[d.weekday()]
        
        if grouped_by_date and d_str in grouped_by_date.groups:
            sub = grouped_by_date.get_group(d_str)
            d_total = len(sub)
            d_comp = int((sub["status"] == "COMPLETED").sum())
            d_non_canc = len(sub[sub["status"] != "CANCELLED"])
            d_rate = round((d_comp / d_non_canc) * 100.0, 1) if d_non_canc > 0 else 0.0
            d_plan = int(sub[sub["status"] != "CANCELLED"]["planned_mins"].sum())
            d_act = int(sub[sub["has_actual"] == True]["actual_mins"].sum())
        else:
            d_total = 0
            d_comp = 0
            d_rate = 0.0
            d_plan = 0
            d_act = 0
            
        daily_items.append(DailyTrendItem(
            date=d_str,
            dayOfWeek=dow_str,
            totalTasks=d_total,
            completedTasks=d_comp,
            completionRate=d_rate,
            plannedMinutes=d_plan,
            actualMinutes=d_act,
        ))
        
    # ── 3. Weekly Trends ───────────────────────────────────────────────────────
    # Group daily items into 7-day chunks
    weekly_items: List[WeeklyTrendItem] = []
    chunk_size = 7
    for i in range(0, len(daily_items), chunk_size):
        chunk = daily_items[i:i + chunk_size]
        if not chunk:
            continue
        w_label = f"{chunk[0].date[5:]} to {chunk[-1].date[5:]}"
        w_total = sum(c.totalTasks for c in chunk)
        w_comp = sum(c.completedTasks for c in chunk)
        w_plan = sum(c.plannedMinutes for c in chunk)
        w_act = sum(c.actualMinutes for c in chunk)
        w_rate = round((w_comp / w_total) * 100.0, 1) if w_total > 0 else 0.0
        weekly_items.append(WeeklyTrendItem(
            weekLabel=w_label,
            totalTasks=w_total,
            completedTasks=w_comp,
            completionRate=w_rate,
            plannedMinutes=w_plan,
            actualMinutes=w_act,
        ))
        
    # ── 4. Category-Wise Analysis ──────────────────────────────────────────────
    category_items: List[CategoryAnalyticsItem] = []
    for cat_name, cat_df in df.groupby("categoryName"):
        first_row = cat_df.iloc[0]
        c_id = first_row["categoryId"]
        c_color = first_row["categoryColor"]
        c_total = len(cat_df)
        c_comp = int((cat_df["status"] == "COMPLETED").sum())
        c_non_canc = len(cat_df[cat_df["status"] != "CANCELLED"])
        c_rate = round((c_comp / c_non_canc) * 100.0, 1) if c_non_canc > 0 else 0.0
        
        c_plan = int(cat_df[cat_df["status"] != "CANCELLED"]["planned_mins"].sum())
        cat_acts = cat_df[cat_df["has_actual"] == True]
        c_act = int(cat_acts["actual_mins"].sum()) if not cat_acts.empty else 0
        
        c_avg_plan = _safe_float(cat_df[cat_df["status"] != "CANCELLED"]["planned_mins"].mean())
        c_avg_act = _safe_float(cat_acts["actual_mins"].mean()) if not cat_acts.empty else 0.0
        
        # Overrun per category: (actual - planned) for tasks that have actual duration
        if not cat_acts.empty:
            overruns = cat_acts["actual_mins"] - cat_acts["planned_mins"]
            c_avg_overrun = _safe_float(overruns.mean())
        else:
            c_avg_overrun = 0.0
            
        category_items.append(CategoryAnalyticsItem(
            categoryId=int(c_id) if pd.notna(c_id) else None,
            categoryName=str(cat_name),
            categoryColor=str(c_color),
            totalTasks=c_total,
            completedTasks=c_comp,
            completionRate=c_rate,
            plannedMinutes=c_plan,
            actualMinutes=c_act,
            averagePlannedDurationMinutes=c_avg_plan,
            averageActualDurationMinutes=c_avg_act,
            averageOverrunMinutes=c_avg_overrun,
        ))
        
    # Sort category items by total planned minutes descending
    category_items.sort(key=lambda x: x.plannedMinutes, reverse=True)
    
    # ── 5. Task Overrun Analysis ───────────────────────────────────────────────
    # Focus on tasks that have actual duration recorded
    overrun_tasks: List[OverrunTaskItem] = []
    overrunning_count = 0
    underrunning_count = 0
    ontime_count = 0
    overrun_pcts = []
    
    for _, row in actual_df.iterrows():
        p_mins = int(row["planned_mins"])
        a_mins = int(row["actual_mins"])
        diff = a_mins - p_mins
        
        if p_mins > 0:
            pct = round(((a_mins - p_mins) / p_mins) * 100.0, 1)
            overrun_pcts.append(pct)
        else:
            pct = None
            
        if diff > 0:
            task_type = "OVERRUN"
            overrunning_count += 1
        elif diff < 0:
            task_type = "UNDERRUN"
            underrunning_count += 1
        else:
            task_type = "ON_TIME"
            ontime_count += 1
            
        overrun_tasks.append(OverrunTaskItem(
            id=int(row["id"]) if pd.notna(row["id"]) else None,
            title=row["title"],
            categoryName=row["categoryName"],
            plannedMinutes=p_mins,
            actualMinutes=a_mins,
            differenceMinutes=diff,
            overrunPercentage=pct,
            status=row["status"],
            type=task_type,
        ))
        
    avg_overrun_pct = _safe_float(np.mean(overrun_pcts)) if overrun_pcts else 0.0
    
    # Top 5 overrunning tasks (largest positive difference)
    top_overruns = sorted([t for t in overrun_tasks if t.differenceMinutes > 0], key=lambda x: x.differenceMinutes, reverse=True)[:5]
    # Top 5 underrunning tasks (most negative difference / finished earliest)
    top_underruns = sorted([t for t in overrun_tasks if t.differenceMinutes < 0], key=lambda x: x.differenceMinutes)[:5]
    
    overrun_analysis = OverrunAnalysis(
        totalOverrunningTasks=overrunning_count,
        totalUnderrunningTasks=underrunning_count,
        totalOnTimeTasks=ontime_count,
        averageOverrunPercentage=avg_overrun_pct,
        topOverrunningTasks=top_overruns,
        topUnderrunningTasks=top_underruns,
    )
    
    # ── 6. Productivity Heatmap (Day × Hour) ──────────────────────────────────
    matrix = [[0] * 24 for _ in range(7)]
    total_activity_points = 0
    
    for _, row in df.iterrows():
        day_idx = int(row["day_of_week_idx"])
        hour_idx = int(row["hour_of_day"])
        if 0 <= day_idx < 7 and 0 <= hour_idx < 24:
            matrix[day_idx][hour_idx] += 1
            total_activity_points += 1
            
    max_activity = max([max(row) for row in matrix]) if total_activity_points > 0 else 0
    
    heatmap = HeatmapMatrix(
        days=DAYS_OF_WEEK,
        hours=list(range(24)),
        matrix=matrix,
        maxActivity=max_activity,
        totalActivityPoints=total_activity_points,
    )
    
    heatmap_img = _generate_seaborn_heatmap(matrix, max_activity) if req.includeHeatmapImage else None
    
    return AnalyticsResponse(
        overview=overview,
        dailyTrends=daily_items,
        weeklyTrends=weekly_items,
        categoryAnalysis=category_items,
        overrunAnalysis=overrun_analysis,
        heatmap=heatmap,
        heatmapImageBase64=heatmap_img,
        dateRange={"startDate": req.startDate, "endDate": req.endDate, "timezone": req.timezone},
        generatedAt=datetime.now(dt_timezone.utc),
    )
