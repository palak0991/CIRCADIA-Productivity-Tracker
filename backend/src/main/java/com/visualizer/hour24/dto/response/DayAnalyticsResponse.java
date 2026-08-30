package com.visualizer.hour24.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DayAnalyticsResponse {

    private String date;
    private int totalTasks;
    private int completedTasks;
    private int missedTasks;
    private int cancelledTasks;
    private int plannedTasks;
    private int inProgressTasks;

    private long totalPlannedMinutes;
    private long totalCompletedMinutes;
    private long totalActualMinutes;

    // Productivity score 0-100
    private double productivityScore;

    // Category breakdown
    private List<CategoryAnalyticsDto> categoryBreakdown;
}
