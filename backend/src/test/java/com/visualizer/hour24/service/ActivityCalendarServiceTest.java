package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.response.ActivityCalendarResponse;
import com.visualizer.hour24.dto.response.ActivityDayDto;
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
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityCalendarServiceTest {

    @Mock
    private TaskRepository taskRepository;

    private AnalyticsServiceImpl analyticsService;
    private User user;
    private Category category;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsServiceImpl(taskRepository);
        user = User.builder().id(1L).username("testuser").email("test@example.com").build();
        category = Category.builder().id(1L).name("Coding").color("#22C55E").user(user).build();
    }

    @Test
    @DisplayName("Should return 365 empty days and 0 streaks when user has no completed tasks")
    void testEmptyActivityCalendar() {
        when(taskRepository.findCompletedTasksInDateRange(eq(1L), any(Instant.class), any(Instant.class)))
                .thenReturn(Collections.emptyList());

        ActivityCalendarResponse response = analyticsService.getActivityCalendar(1L, 365, "UTC");

        assertThat(response).isNotNull();
        assertThat(response.getDailyContributions()).hasSize(365);
        assertThat(response.getTotalActiveDays()).isZero();
        assertThat(response.getCurrentStreak()).isZero();
        assertThat(response.getLongestStreak()).isZero();
        assertThat(response.getTotalTasksCompleted()).isZero();
        assertThat(response.getTotalWorkMinutes()).isZero();

        for (ActivityDayDto day : response.getDailyContributions()) {
            assertThat(day.getLevel()).isZero();
            assertThat(day.getCount()).isZero();
            assertThat(day.getWorkMinutes()).isZero();
            assertThat(day.getTasks()).isEmpty();
        }
    }

    @Test
    @DisplayName("Should calculate correct work minutes, levels, and streaks for completed tasks")
    void testActivityCalendarWithCompletedTasks() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Instant todayNoon = today.atTime(12, 0).toInstant(ZoneOffset.UTC);
        Instant yesterdayNoon = today.minusDays(1).atTime(12, 0).toInstant(ZoneOffset.UTC);

        // Task 1 today: 120 minutes
        Task task1 = Task.builder()
                .id(101L)
                .user(user)
                .category(category)
                .title("LeetCode Daily Challenge")
                .status(TaskStatus.COMPLETED)
                .startDateTime(todayNoon.minusSeconds(7200))
                .endDateTime(todayNoon)
                .actualStartDateTime(todayNoon.minusSeconds(7200))
                .actualEndDateTime(todayNoon)
                .build();

        // Task 2 yesterday: 60 minutes
        Task task2 = Task.builder()
                .id(102L)
                .user(user)
                .category(category)
                .title("System Design Review")
                .status(TaskStatus.COMPLETED)
                .startDateTime(yesterdayNoon.minusSeconds(3600))
                .endDateTime(yesterdayNoon)
                .actualStartDateTime(yesterdayNoon.minusSeconds(3600))
                .actualEndDateTime(yesterdayNoon)
                .build();

        when(taskRepository.findCompletedTasksInDateRange(eq(1L), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(task2, task1));

        ActivityCalendarResponse response = analyticsService.getActivityCalendar(1L, 365, "UTC");

        assertThat(response.getTotalActiveDays()).isEqualTo(2);
        assertThat(response.getCurrentStreak()).isEqualTo(2);
        assertThat(response.getLongestStreak()).isEqualTo(2);
        assertThat(response.getTotalTasksCompleted()).isEqualTo(2);
        assertThat(response.getTotalWorkMinutes()).isEqualTo(180);

        ActivityDayDto todayDto = response.getDailyContributions().get(response.getDailyContributions().size() - 1);
        assertThat(todayDto.getDate()).isEqualTo(today);
        assertThat(todayDto.getCount()).isEqualTo(1);
        assertThat(todayDto.getWorkMinutes()).isEqualTo(120);
        assertThat(todayDto.getLevel()).isEqualTo(3); // 120 min > 90 min -> level 3
        assertThat(todayDto.getTasks()).hasSize(1);
        assertThat(todayDto.getTasks().get(0).getTitle()).isEqualTo("LeetCode Daily Challenge");
    }
}
