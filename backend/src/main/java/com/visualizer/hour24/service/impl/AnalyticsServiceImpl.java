package com.visualizer.hour24.service.impl;

import com.visualizer.hour24.dto.response.CategoryAnalyticsDto;
import com.visualizer.hour24.dto.response.DayAnalyticsResponse;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.enums.TaskStatus;
import com.visualizer.hour24.repository.TaskRepository;
import com.visualizer.hour24.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AnalyticsServiceImpl implements AnalyticsService {

    private final TaskRepository taskRepository;

    @Override
    @Transactional(readOnly = true)
    public DayAnalyticsResponse getAnalyticsForDate(Long userId, LocalDate date, String timezone) {
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(timezone != null ? timezone : "UTC");
        } catch (DateTimeException e) {
            zoneId = ZoneId.of("UTC");
        }

        Instant rangeStart = date.atStartOfDay(zoneId).toInstant();
        Instant rangeEnd = date.plusDays(1).atStartOfDay(zoneId).toInstant();

        List<Task> tasks = taskRepository.findTasksInDateRange(userId, rangeStart, rangeEnd);

        // Status counts
        long completed = tasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();
        long missed = tasks.stream().filter(t -> t.getStatus() == TaskStatus.MISSED).count();
        long cancelled = tasks.stream().filter(t -> t.getStatus() == TaskStatus.CANCELLED).count();
        long planned = tasks.stream().filter(t -> t.getStatus() == TaskStatus.PLANNED).count();
        long inProgress = tasks.stream().filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS).count();

        // Minutes calculations (clamped to day window)
        long totalPlannedMinutes = tasks.stream()
            .filter(t -> t.getStatus() != TaskStatus.CANCELLED)
            .mapToLong(t -> clampedDurationMinutes(t, rangeStart, rangeEnd))
            .sum();

        long totalCompletedMinutes = tasks.stream()
            .filter(t -> t.getStatus() == TaskStatus.COMPLETED)
            .mapToLong(t -> clampedDurationMinutes(t, rangeStart, rangeEnd))
            .sum();

        // Productivity score: (completedMinutes / max(plannedMinutes, 1)) * 100, capped at 100
        double productivityScore = totalPlannedMinutes > 0
            ? Math.min(100.0, (totalCompletedMinutes * 100.0) / totalPlannedMinutes)
            : 0.0;

        // Category breakdown
        Map<Long, List<Task>> byCategory = tasks.stream()
            .collect(Collectors.groupingBy(t -> t.getCategory().getId()));

        List<CategoryAnalyticsDto> categoryBreakdown = byCategory.entrySet().stream()
            .map(entry -> {
                List<Task> catTasks = entry.getValue();
                Task representative = catTasks.get(0);
                long catPlannedMins = catTasks.stream()
                    .filter(t -> t.getStatus() != TaskStatus.CANCELLED)
                    .mapToLong(t -> clampedDurationMinutes(t, rangeStart, rangeEnd))
                    .sum();
                long catCompletedMins = catTasks.stream()
                    .filter(t -> t.getStatus() == TaskStatus.COMPLETED)
                    .mapToLong(t -> clampedDurationMinutes(t, rangeStart, rangeEnd))
                    .sum();

                return CategoryAnalyticsDto.builder()
                    .categoryId(entry.getKey())
                    .categoryName(representative.getCategory().getName())
                    .color(representative.getCategory().getColor())
                    .plannedMinutes(catPlannedMins)
                    .completedMinutes(catCompletedMins)
                    .taskCount(catTasks.size())
                    .build();
            })
            .sorted(Comparator.comparingLong(CategoryAnalyticsDto::getPlannedMinutes).reversed())
            .collect(Collectors.toList());

        return DayAnalyticsResponse.builder()
            .date(date.toString())
            .totalTasks(tasks.size())
            .completedTasks((int) completed)
            .missedTasks((int) missed)
            .cancelledTasks((int) cancelled)
            .plannedTasks((int) planned)
            .inProgressTasks((int) inProgress)
            .totalPlannedMinutes(totalPlannedMinutes)
            .totalCompletedMinutes(totalCompletedMinutes)
            .productivityScore(Math.round(productivityScore * 10.0) / 10.0)
            .categoryBreakdown(categoryBreakdown)
            .build();
    }

    @Override
    public void detectAndMarkMissedTasks(Long userId) {
        Instant now = Instant.now();

        // Find all user tasks that ended before now but are still PLANNED or IN_PROGRESS
        List<Task> allTasks = taskRepository.findAllByUserId(userId);
        List<Task> missedCandidates = allTasks.stream()
            .filter(t -> t.getEndDateTime().isBefore(now))
            .filter(t -> t.getStatus() == TaskStatus.PLANNED || t.getStatus() == TaskStatus.IN_PROGRESS)
            .collect(Collectors.toList());

        if (!missedCandidates.isEmpty()) {
            missedCandidates.forEach(t -> t.setStatus(TaskStatus.MISSED));
            taskRepository.saveAll(missedCandidates);
            log.info("Marked {} task(s) as MISSED for userId={}", missedCandidates.size(), userId);
        }
    }

    private long clampedDurationMinutes(Task task, Instant rangeStart, Instant rangeEnd) {
        Instant effectiveStart = task.getStartDateTime().isBefore(rangeStart) ? rangeStart : task.getStartDateTime();
        Instant effectiveEnd = task.getEndDateTime().isAfter(rangeEnd) ? rangeEnd : task.getEndDateTime();
        return Math.max(0, ChronoUnit.MINUTES.between(effectiveStart, effectiveEnd));
    }
}
