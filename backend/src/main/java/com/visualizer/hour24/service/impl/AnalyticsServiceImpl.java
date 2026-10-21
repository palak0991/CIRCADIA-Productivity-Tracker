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

        long totalActualMinutes = tasks.stream()
            .filter(t -> t.getStatus() != TaskStatus.CANCELLED)
            .mapToLong(t -> clampedActualDurationMinutes(t, rangeStart, rangeEnd))
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
                long catActualMins = catTasks.stream()
                    .filter(t -> t.getStatus() != TaskStatus.CANCELLED)
                    .mapToLong(t -> clampedActualDurationMinutes(t, rangeStart, rangeEnd))
                    .sum();

                return CategoryAnalyticsDto.builder()
                    .categoryId(entry.getKey())
                    .categoryName(representative.getCategory().getName())
                    .color(representative.getCategory().getColor())
                    .plannedMinutes(catPlannedMins)
                    .completedMinutes(catCompletedMins)
                    .actualMinutes(catActualMins)
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
            .totalActualMinutes(totalActualMinutes)
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

    private long clampedActualDurationMinutes(Task task, Instant rangeStart, Instant rangeEnd) {
        if (task.getActualStartDateTime() == null) {
            return 0;
        }
        Instant effectiveStart = task.getActualStartDateTime().isBefore(rangeStart) ? rangeStart : task.getActualStartDateTime();
        Instant rawEnd = task.getActualEndDateTime() != null ? task.getActualEndDateTime() : Instant.now();
        Instant effectiveEnd = rawEnd.isAfter(rangeEnd) ? rangeEnd : rawEnd;
        if (effectiveEnd.isBefore(effectiveStart)) {
            return 0;
        }
        return Math.max(0, ChronoUnit.MINUTES.between(effectiveStart, effectiveEnd));
    }

    @Override
    @Transactional(readOnly = true)
    public com.visualizer.hour24.dto.response.ActivityCalendarResponse getActivityCalendar(Long userId, int days, String timezone) {
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(timezone != null ? timezone : "UTC");
        } catch (DateTimeException e) {
            zoneId = ZoneId.of("UTC");
        }

        int targetDays = days > 0 ? Math.min(days, 730) : 365;
        LocalDate today = LocalDate.now(zoneId);
        LocalDate startDate = today.minusDays(targetDays - 1);

        Instant rangeStart = startDate.atStartOfDay(zoneId).toInstant();
        Instant rangeEnd = today.plusDays(1).atStartOfDay(zoneId).toInstant();

        List<Task> completedTasks = taskRepository.findCompletedTasksInDateRange(userId, rangeStart, rangeEnd);

        Map<LocalDate, List<Task>> tasksByDate = new HashMap<>();
        for (Task t : completedTasks) {
            Instant completionInstant = t.getActualEndDateTime() != null ? t.getActualEndDateTime() : t.getEndDateTime();
            LocalDate taskDate = completionInstant.atZone(zoneId).toLocalDate();
            if (!taskDate.isBefore(startDate) && !taskDate.isAfter(today)) {
                tasksByDate.computeIfAbsent(taskDate, k -> new ArrayList<>()).add(t);
            }
        }

        List<com.visualizer.hour24.dto.response.ActivityDayDto> dailyContributions = new ArrayList<>(targetDays);
        int totalActiveDays = 0;
        long totalTasksCompleted = 0;
        long totalWorkMinutes = 0;

        for (int i = 0; i < targetDays; i++) {
            LocalDate currentDate = startDate.plusDays(i);
            List<Task> dayTasks = tasksByDate.getOrDefault(currentDate, Collections.emptyList());

            long dayCount = dayTasks.size();
            long dayMinutes = 0;
            List<com.visualizer.hour24.dto.response.ActivityTaskSummaryDto> summaries = new ArrayList<>();

            for (Task t : dayTasks) {
                long duration;
                if (t.getActualStartDateTime() != null && t.getActualEndDateTime() != null) {
                    duration = Math.max(0, ChronoUnit.MINUTES.between(t.getActualStartDateTime(), t.getActualEndDateTime()));
                } else {
                    duration = Math.max(0, ChronoUnit.MINUTES.between(t.getStartDateTime(), t.getEndDateTime()));
                }
                dayMinutes += duration;

                summaries.add(com.visualizer.hour24.dto.response.ActivityTaskSummaryDto.builder()
                        .id(t.getId())
                        .title(t.getTitle())
                        .categoryName(t.getCategory() != null ? t.getCategory().getName() : "General")
                        .categoryColor(t.getCategory() != null ? t.getCategory().getColor() : "#EC4899")
                        .durationMinutes(duration)
                        .build());
            }

            int level = calculateActivityLevel(dayCount, dayMinutes);

            if (dayCount > 0 || dayMinutes > 0) {
                totalActiveDays++;
            }
            totalTasksCompleted += dayCount;
            totalWorkMinutes += dayMinutes;

            dailyContributions.add(com.visualizer.hour24.dto.response.ActivityDayDto.builder()
                    .date(currentDate)
                    .count(dayCount)
                    .workMinutes(dayMinutes)
                    .level(level)
                    .tasks(summaries)
                    .build());
        }

        int currentStreak = 0;
        int longestStreak = 0;
        int currentRunningStreak = 0;

        for (com.visualizer.hour24.dto.response.ActivityDayDto day : dailyContributions) {
            if (day.getCount() > 0 || day.getWorkMinutes() > 0) {
                currentRunningStreak++;
                if (currentRunningStreak > longestStreak) {
                    longestStreak = currentRunningStreak;
                }
            } else {
                currentRunningStreak = 0;
            }
        }

        int idx = dailyContributions.size() - 1;
        if (idx >= 0) {
            com.visualizer.hour24.dto.response.ActivityDayDto todayDay = dailyContributions.get(idx);
            boolean todayActive = (todayDay.getCount() > 0 || todayDay.getWorkMinutes() > 0);
            int startCheck = todayActive ? idx : idx - 1;
            while (startCheck >= 0) {
                com.visualizer.hour24.dto.response.ActivityDayDto d = dailyContributions.get(startCheck);
                if (d.getCount() > 0 || d.getWorkMinutes() > 0) {
                    currentStreak++;
                    startCheck--;
                } else {
                    break;
                }
            }
        }

        return com.visualizer.hour24.dto.response.ActivityCalendarResponse.builder()
                .startDate(startDate)
                .endDate(today)
                .totalActiveDays(totalActiveDays)
                .currentStreak(currentStreak)
                .longestStreak(longestStreak)
                .totalTasksCompleted(totalTasksCompleted)
                .totalWorkMinutes(totalWorkMinutes)
                .dailyContributions(dailyContributions)
                .build();
    }

    private int calculateActivityLevel(long taskCount, long workMinutes) {
        if (taskCount == 0 && workMinutes == 0) {
            return 0;
        }
        if (workMinutes > 180 || taskCount >= 5) {
            return 4;
        }
        if (workMinutes > 90 || taskCount >= 3) {
            return 3;
        }
        if (workMinutes > 30 || taskCount >= 2) {
            return 2;
        }
        return 1;
    }
}

