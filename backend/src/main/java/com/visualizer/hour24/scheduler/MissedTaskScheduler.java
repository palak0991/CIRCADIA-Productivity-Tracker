package com.visualizer.hour24.scheduler;

import com.visualizer.hour24.repository.UserRepository;
import com.visualizer.hour24.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MissedTaskScheduler {

    private final AnalyticsService analyticsService;
    private final UserRepository userRepository;

    /**
     * Runs every 15 minutes. Scans PLANNED/IN_PROGRESS tasks whose endDateTime is in
     * the past and automatically marks them as MISSED.
     */
    @Scheduled(fixedRateString = "${app.scheduler.missed-task-interval-ms:900000}")
    public void detectMissedTasks() {
        log.info("Running scheduled missed-task detection...");
        userRepository.findAll().forEach(user ->
            analyticsService.detectAndMarkMissedTasks(user.getId())
        );
        log.info("Completed missed-task detection sweep");
    }
}
