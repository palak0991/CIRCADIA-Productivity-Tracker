package com.visualizer.hour24.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityCalendarResponse {
    private LocalDate startDate;
    private LocalDate endDate;
    private int totalActiveDays;
    private int currentStreak;
    private int longestStreak;
    private long totalTasksCompleted;
    private long totalWorkMinutes;

    @Builder.Default
    private List<ActivityDayDto> dailyContributions = new ArrayList<>();
}
