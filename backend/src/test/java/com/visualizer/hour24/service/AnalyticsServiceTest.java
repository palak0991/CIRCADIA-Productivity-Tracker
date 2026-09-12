package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.response.DayAnalyticsResponse;
import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.enums.TaskStatus;
import com.visualizer.hour24.repository.TaskRepository;
import com.visualizer.hour24.service.impl.AnalyticsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private TaskRepository taskRepository;

    private AnalyticsServiceImpl analyticsService;

    private User user;
    private Category category;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsServiceImpl(taskRepository);

        user = User.builder().id(1L).username("alex").email("alex@example.com").build();
        category = Category.builder()
            .id(10L)
            .user(user)
            .name("Study")
            .color("#3B82F6")
            .build();
    }

    @Test
    @DisplayName("Should compute productivity score and status counts correctly")
    void testProductivityScoreComputation() {
        LocalDate date = LocalDate.of(2026, 8, 22);
        Instant dayStart = date.atStartOfDay(ZoneOffset.UTC).toInstant();

        // Task 1: 2 hours planned and completed (120 min)
        Task completedTask = Task.builder()
            .id(1L).user(user).category(category).title("DSA Study")
            .startDateTime(dayStart.plusSeconds(3600))
            .endDateTime(dayStart.plusSeconds(3600 + 7200))
            .status(TaskStatus.COMPLETED).build();

        // Task 2: 1 hour planned but MISSED (60 min)
        Task missedTask = Task.builder()
            .id(2L).user(user).category(category).title("Reading")
            .startDateTime(dayStart.plusSeconds(10800))
            .endDateTime(dayStart.plusSeconds(10800 + 3600))
            .status(TaskStatus.MISSED).build();

        when(taskRepository.findTasksInDateRange(eq(1L), any(Instant.class), any(Instant.class)))
            .thenReturn(List.of(completedTask, missedTask));

        DayAnalyticsResponse analytics = analyticsService.getAnalyticsForDate(1L, date, "UTC");

        assertThat(analytics.getTotalTasks()).isEqualTo(2);
        assertThat(analytics.getCompletedTasks()).isEqualTo(1);
        assertThat(analytics.getMissedTasks()).isEqualTo(1);
        assertThat(analytics.getTotalPlannedMinutes()).isEqualTo(180); // 120 + 60
        assertThat(analytics.getTotalCompletedMinutes()).isEqualTo(120);
        // productivity = 120/180 * 100 = 66.7%
        assertThat(analytics.getProductivityScore()).isGreaterThan(60.0);
        assertThat(analytics.getCategoryBreakdown()).hasSize(1);
        assertThat(analytics.getCategoryBreakdown().get(0).getCategoryName()).isEqualTo("Study");
    }

    @Test
    @DisplayName("Zero tasks: Should return 0 score and 0 total tasks without throwing divide by zero errors")
    void testZeroTasksNoDivisionByZero() {
        LocalDate date = LocalDate.of(2026, 8, 22);

        when(taskRepository.findTasksInDateRange(eq(1L), any(Instant.class), any(Instant.class)))
            .thenReturn(List.of());

        DayAnalyticsResponse analytics = analyticsService.getAnalyticsForDate(1L, date, "UTC");

        assertThat(analytics.getTotalTasks()).isEqualTo(0);
        assertThat(analytics.getTotalPlannedMinutes()).isEqualTo(0);
        assertThat(analytics.getTotalCompletedMinutes()).isEqualTo(0);
        assertThat(analytics.getProductivityScore()).isEqualTo(0.0);
        assertThat(analytics.getCategoryBreakdown()).isEmpty();
    }

    @Test
    @DisplayName("All CANCELLED tasks: Should be excluded from planned minutes and return 0.0 score without error")
    void testAllCancelledTasksExcludedFromScore() {
        LocalDate date = LocalDate.of(2026, 8, 22);
        Instant dayStart = date.atStartOfDay(ZoneOffset.UTC).toInstant();

        Task cancelled1 = Task.builder()
            .id(1L).user(user).category(category).title("Gym Session")
            .startDateTime(dayStart.plusSeconds(3600))
            .endDateTime(dayStart.plusSeconds(7200))
            .status(TaskStatus.CANCELLED).build();

        Task cancelled2 = Task.builder()
            .id(2L).user(user).category(category).title("Reading")
            .startDateTime(dayStart.plusSeconds(10800))
            .endDateTime(dayStart.plusSeconds(14400))
            .status(TaskStatus.CANCELLED).build();

        when(taskRepository.findTasksInDateRange(eq(1L), any(Instant.class), any(Instant.class)))
            .thenReturn(List.of(cancelled1, cancelled2));

        DayAnalyticsResponse analytics = analyticsService.getAnalyticsForDate(1L, date, "UTC");

        assertThat(analytics.getTotalTasks()).isEqualTo(2);
        assertThat(analytics.getCancelledTasks()).isEqualTo(2);
        assertThat(analytics.getCompletedTasks()).isEqualTo(0);
        assertThat(analytics.getTotalPlannedMinutes()).isEqualTo(0);
        assertThat(analytics.getTotalCompletedMinutes()).isEqualTo(0);
        assertThat(analytics.getProductivityScore()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("All COMPLETED tasks: Should hit max productivity score (100.0)")
    void testAllCompletedTasksHitMaxScore() {
        LocalDate date = LocalDate.of(2026, 8, 22);
        Instant dayStart = date.atStartOfDay(ZoneOffset.UTC).toInstant();

        Task completed1 = Task.builder()
            .id(1L).user(user).category(category).title("Morning Workout")
            .startDateTime(dayStart.plusSeconds(3600))
            .endDateTime(dayStart.plusSeconds(7200)) // 60 min
            .status(TaskStatus.COMPLETED).build();

        Task completed2 = Task.builder()
            .id(2L).user(user).category(category).title("Code Review")
            .startDateTime(dayStart.plusSeconds(10800))
            .endDateTime(dayStart.plusSeconds(18000)) // 120 min
            .status(TaskStatus.COMPLETED).build();

        when(taskRepository.findTasksInDateRange(eq(1L), any(Instant.class), any(Instant.class)))
            .thenReturn(List.of(completed1, completed2));

        DayAnalyticsResponse analytics = analyticsService.getAnalyticsForDate(1L, date, "UTC");

        assertThat(analytics.getTotalTasks()).isEqualTo(2);
        assertThat(analytics.getCompletedTasks()).isEqualTo(2);
        assertThat(analytics.getTotalPlannedMinutes()).isEqualTo(180);
        assertThat(analytics.getTotalCompletedMinutes()).isEqualTo(180);
        assertThat(analytics.getProductivityScore()).isEqualTo(100.0);
    }
}
