package com.visualizer.hour24.service;

import java.time.LocalDate;
import java.util.Map;

public interface PythonAnalyticsService {

    /**
     * Gathers authorized task data for the user across the specified date range
     * and delegates high-level analytics calculation to the Python microservice.
     */
    Map<String, Object> calculateProductivityAnalytics(Long userId, LocalDate startDate, LocalDate endDate, String timezone);
}
