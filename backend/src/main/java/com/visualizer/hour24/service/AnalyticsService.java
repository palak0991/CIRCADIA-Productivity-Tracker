package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.response.ActivityCalendarResponse;
import com.visualizer.hour24.dto.response.DayAnalyticsResponse;

import java.time.LocalDate;

public interface AnalyticsService {
    DayAnalyticsResponse getAnalyticsForDate(Long userId, LocalDate date, String timezone);
    void detectAndMarkMissedTasks(Long userId);
    ActivityCalendarResponse getActivityCalendar(Long userId, int days, String timezone);
}

