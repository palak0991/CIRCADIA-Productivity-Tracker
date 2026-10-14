package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.response.NLPParseResponse;

import java.time.LocalDate;
import java.util.Map;

public interface PythonAnalyticsService {

    /**
     * Gathers authorized task data for the user across the specified date range
     * and delegates high-level analytics calculation to the Python microservice.
     */
    Map<String, Object> calculateProductivityAnalytics(Long userId, LocalDate startDate, LocalDate endDate, String timezone);

    /**
     * Parses a natural language sentence into a structured task draft using the NLP microservice,
     * securely providing the user's available categories for intelligent classification.
     */
    NLPParseResponse parseTaskNaturalLanguage(Long userId, String text, String timezone);
}
