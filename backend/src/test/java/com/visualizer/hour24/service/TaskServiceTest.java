package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.request.ActualTimeActionRequest;
import com.visualizer.hour24.dto.request.TaskRequest;
import com.visualizer.hour24.dto.response.TaskResponse;
import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.enums.TaskStatus;
import com.visualizer.hour24.exception.BadRequestException;
import com.visualizer.hour24.mapper.CategoryMapper;
import com.visualizer.hour24.mapper.TaskMapper;
import com.visualizer.hour24.repository.CategoryRepository;
import com.visualizer.hour24.repository.TaskRepository;
import com.visualizer.hour24.repository.UserRepository;
import com.visualizer.hour24.service.impl.TaskServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CategoryRepository categoryRepository;

    private TaskServiceImpl taskService;

    private User sampleUser;
    private Category sampleCategory;

    @BeforeEach
    void setUp() {
        CategoryMapper categoryMapper = new CategoryMapper();
        TaskMapper taskMapper = new TaskMapper(categoryMapper);
        taskService = new TaskServiceImpl(taskRepository, userRepository, categoryRepository, taskMapper);

        sampleUser = User.builder().id(1L).username("testuser").email("test@example.com").build();
        sampleCategory = Category.builder().id(10L).user(sampleUser).name("Study").color("#3B82F6").build();
    }

    @Test
    @DisplayName("Should throw BadRequestException if endDateTime is before or equal to startDateTime")
    void testInvalidTaskTimesValidation() {
        Instant now = Instant.now();
        Instant earlier = now.minusSeconds(3600);

        TaskRequest invalidRequest = TaskRequest.builder()
            .title("Invalid Task")
            .categoryId(10L)
            .startDateTime(now)
            .endDateTime(earlier)
            .status(TaskStatus.PLANNED)
            .build();

        assertThatThrownBy(() -> taskService.createTask(1L, invalidRequest))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Task end time must be strictly after start time");
    }

    @Test
    @DisplayName("Should update actualStartDateTime and set status to IN_PROGRESS on START action")
    void testUpdateActualTimeStart() {
        Instant plannedStart = Instant.parse("2026-08-29T10:00:00Z");
        Instant plannedEnd = Instant.parse("2026-08-29T11:00:00Z");
        Instant actualStart = Instant.parse("2026-08-29T10:05:00Z");

        Task existingTask = Task.builder()
            .id(100L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Algorithms")
            .startDateTime(plannedStart)
            .endDateTime(plannedEnd)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(existingTask));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ActualTimeActionRequest request = ActualTimeActionRequest.builder()
            .action(ActualTimeActionRequest.ActionType.START)
            .customTimestamp(actualStart)
            .build();

        TaskResponse response = taskService.updateActualTime(1L, 100L, request);

        assertThat(response.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
        assertThat(response.getActualStartDateTime()).isEqualTo(actualStart);
        assertThat(response.getPlannedDurationMinutes()).isEqualTo(60L);
    }

    @Test
    @DisplayName("Should update actualEndDateTime and set status to COMPLETED on COMPLETE action")
    void testUpdateActualTimeComplete() {
        Instant plannedStart = Instant.parse("2026-08-29T10:00:00Z");
        Instant plannedEnd = Instant.parse("2026-08-29T11:00:00Z");
        Instant actualStart = Instant.parse("2026-08-29T10:00:00Z");
        Instant actualEnd = Instant.parse("2026-08-29T11:15:00Z"); // 75 min

        Task inProgressTask = Task.builder()
            .id(100L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Algorithms")
            .startDateTime(plannedStart)
            .endDateTime(plannedEnd)
            .actualStartDateTime(actualStart)
            .status(TaskStatus.IN_PROGRESS)
            .build();

        when(taskRepository.findByIdAndUserId(100L, 1L)).thenReturn(Optional.of(inProgressTask));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ActualTimeActionRequest request = ActualTimeActionRequest.builder()
            .action(ActualTimeActionRequest.ActionType.COMPLETE)
            .customTimestamp(actualEnd)
            .build();

        TaskResponse response = taskService.updateActualTime(1L, 100L, request);

        assertThat(response.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        assertThat(response.getActualEndDateTime()).isEqualTo(actualEnd);
        assertThat(response.getPlannedDurationMinutes()).isEqualTo(60L);
        assertThat(response.getActualDurationMinutes()).isEqualTo(75L);
    }
}
