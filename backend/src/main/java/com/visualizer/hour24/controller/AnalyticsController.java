package com.visualizer.hour24.controller;

import com.visualizer.hour24.dto.response.DayAnalyticsResponse;
import com.visualizer.hour24.service.AnalyticsService;
import com.visualizer.hour24.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
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

    @PostMapping("/detect-missed")
    public ResponseEntity<String> detectMissedTasks() {
        Long userId = securityUtils.getCurrentUserId();
        analyticsService.detectAndMarkMissedTasks(userId);
        return ResponseEntity.ok("Missed task detection completed");
    }
}
