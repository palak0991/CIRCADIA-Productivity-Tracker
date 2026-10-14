package com.visualizer.hour24.service;

import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.enums.TaskStatus;
import com.visualizer.hour24.exception.BadRequestException;
import com.visualizer.hour24.repository.CategoryRepository;
import com.visualizer.hour24.repository.TaskRepository;
import com.visualizer.hour24.service.impl.PythonAnalyticsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PythonAnalyticsServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private CategoryRepository categoryRepository;

    private PythonAnalyticsServiceImpl pythonAnalyticsService;

    private User user;
    private Category category;

    @BeforeEach
    void setUp() {
        // Points to mock/unreachable url to test graceful exception handling
        pythonAnalyticsService = new PythonAnalyticsServiceImpl(taskRepository, categoryRepository, "http://localhost:59999", 500);

        user = User.builder().id(99L).username("testuser").email("test@example.com").build();
        category = Category.builder().id(5L).user(user).name("Focus").color("#EC4899").build();
    }

    @Test
    @DisplayName("Should query tasks exclusively for the authenticated user ID")
    void testQueryTasksForAuthenticatedUser() {
        Long targetUserId = 99L;
        LocalDate startDate = LocalDate.of(2026, 10, 1);
        LocalDate endDate = LocalDate.of(2026, 10, 7);

        Task task = Task.builder()
                .id(1L)
                .user(user)
                .category(category)
                .title("Deep Work")
                .status(TaskStatus.COMPLETED)
                .startDateTime(Instant.parse("2026-10-02T10:00:00Z"))
                .endDateTime(Instant.parse("2026-10-02T11:00:00Z"))
                .actualStartDateTime(Instant.parse("2026-10-02T10:00:00Z"))
                .actualEndDateTime(Instant.parse("2026-10-02T11:15:00Z"))
                .build();

        when(taskRepository.findTasksInDateRange(eq(targetUserId), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(task));

        // When the python endpoint is unreachable, it should throw BadRequestException with clear service advice
        assertThatThrownBy(() -> pythonAnalyticsService.calculateProductivityAnalytics(targetUserId, startDate, endDate, "UTC"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Analytics service temporarily unavailable");

        // Verify taskRepository was called strictly with targetUserId
        verify(taskRepository).findTasksInDateRange(eq(targetUserId), any(Instant.class), any(Instant.class));
    }
}
