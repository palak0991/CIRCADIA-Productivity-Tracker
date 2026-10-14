package com.visualizer.hour24.controller;

import com.visualizer.hour24.dto.response.DayAnalyticsResponse;
import com.visualizer.hour24.service.AnalyticsService;
import com.visualizer.hour24.service.PythonAnalyticsService;
import com.visualizer.hour24.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final PythonAnalyticsService pythonAnalyticsService;
    private final SecurityUtils securityUtils;

    @GetMapping("/day")
    public ResponseEntity<DayAnalyticsResponse> getDayAnalytics(
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "timezone", required = false, defaultValue = "UTC") String timezone) {

        Long userId = securityUtils.getCurrentUserId();
        LocalDate targetDate = (date != null) ? date : LocalDate.now();

        DayAnalyticsResponse analytics = analyticsService.getAnalyticsForDate(userId, targetDate, timezone);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/productivity")
    public ResponseEntity<Map<String, Object>> getProductivityAnalytics(
            @RequestParam(value = "startDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(value = "endDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(value = "timezone", required = false, defaultValue = "UTC") String timezone) {

        Long userId = securityUtils.getCurrentUserId();
        LocalDate targetEnd = (endDate != null) ? endDate : LocalDate.now();
        LocalDate targetStart = (startDate != null) ? startDate : targetEnd.minusDays(6);

        Map<String, Object> result = pythonAnalyticsService.calculateProductivityAnalytics(
                userId, targetStart, targetEnd, timezone);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/detect-missed")
    public ResponseEntity<String> detectMissedTasks() {
        Long userId = securityUtils.getCurrentUserId();
        analyticsService.detectAndMarkMissedTasks(userId);
        return ResponseEntity.ok("Missed task detection completed");
    }
}
