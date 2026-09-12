package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.request.ActualTimeActionRequest;
import com.visualizer.hour24.dto.request.TaskRequest;
import com.visualizer.hour24.dto.response.TaskResponse;
import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.enums.TaskStatus;
import com.visualizer.hour24.exception.BadRequestException;
import com.visualizer.hour24.exception.ConflictException;
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
import java.util.List;
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
    @DisplayName("Exact overlap: Should throw ConflictException when new task time matches an existing task time range")
    void testExactOverlapThrowsConflictException() {
        Instant start = Instant.parse("2026-09-12T10:00:00Z");
        Instant end = Instant.parse("2026-09-12T11:00:00Z");

        Task existingTask = Task.builder()
            .id(101L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Existing Task")
            .startDateTime(start)
            .endDateTime(end)
            .status(TaskStatus.PLANNED)
            .build();

        TaskRequest newRequest = TaskRequest.builder()
            .title("New Exact Overlap Task")
            .categoryId(10L)
            .startDateTime(start)
            .endDateTime(end)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findOverlappingTasks(1L, start, end, null))
            .thenReturn(List.of(existingTask));

        assertThatThrownBy(() -> taskService.createTask(1L, newRequest))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Task time range conflicts with existing task(s)")
            .extracting(ex -> ((ConflictException) ex).getConflictingTasks())
            .satisfies(conflicting -> {
                List<TaskResponse> list = (List<TaskResponse>) conflicting;
                assertThat(list).hasSize(1);
                assertThat(list.get(0).getId()).isEqualTo(101L);
            });
    }

    @Test
    @DisplayName("Partial overlap: Should throw ConflictException when new task partially overlaps an existing task")
    void testPartialOverlapThrowsConflictException() {
        Instant existingStart = Instant.parse("2026-09-12T10:00:00Z");
        Instant existingEnd = Instant.parse("2026-09-12T12:00:00Z");

        Instant newStart = Instant.parse("2026-09-12T11:30:00Z");
        Instant newEnd = Instant.parse("2026-09-12T13:30:00Z");

        Task existingTask = Task.builder()
            .id(102L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Existing Block")
            .startDateTime(existingStart)
            .endDateTime(existingEnd)
            .status(TaskStatus.PLANNED)
            .build();

        TaskRequest newRequest = TaskRequest.builder()
            .title("Partially Overlapping Task")
            .categoryId(10L)
            .startDateTime(newStart)
            .endDateTime(newEnd)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findOverlappingTasks(1L, newStart, newEnd, null))
            .thenReturn(List.of(existingTask));

        assertThatThrownBy(() -> taskService.createTask(1L, newRequest))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Task time range conflicts with existing task(s)");
    }

    @Test
    @DisplayName("Adjacent tasks: Should NOT throw ConflictException when task starts exactly as existing task ends")
    void testAdjacentTasksDoNotConflict() {
        Instant start1 = Instant.parse("2026-09-12T10:00:00Z");
        Instant end1 = Instant.parse("2026-09-12T11:00:00Z");

        Instant start2 = Instant.parse("2026-09-12T11:00:00Z"); // starts exactly when task 1 ends
        Instant end2 = Instant.parse("2026-09-12T12:00:00Z");

        TaskRequest adjacentRequest = TaskRequest.builder()
            .title("Adjacent Task")
            .categoryId(10L)
            .startDateTime(start2)
            .endDateTime(end2)
            .status(TaskStatus.PLANNED)
            .build();

        // Overlap query returns empty list for adjacent time interval
        when(taskRepository.findOverlappingTasks(1L, start2, end2, null))
            .thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));
        when(categoryRepository.findByIdAndUserId(10L, 1L)).thenReturn(Optional.of(sampleCategory));

        Task savedTask = Task.builder()
            .id(103L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Adjacent Task")
            .startDateTime(start2)
            .endDateTime(end2)
            .status(TaskStatus.PLANNED)
            .build();
        when(taskRepository.save(any(Task.class))).thenReturn(savedTask);

        TaskResponse response = taskService.createTask(1L, adjacentRequest);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(103L);
        assertThat(response.getTitle()).isEqualTo("Adjacent Task");
    }

    @Test
    @DisplayName("Midnight crossing overlap: Should throw ConflictException when task overlaps a midnight-crossing task")
    void testMidnightCrossingTaskOverlapThrowsConflictException() {
        // Midnight-crossing task: 23:00 on Sept 12 to 07:00 on Sept 13
        Instant midnightStart = Instant.parse("2026-09-12T23:00:00Z");
        Instant midnightEnd = Instant.parse("2026-09-13T07:00:00Z");

        // Normal task on Sept 13 morning: 02:00 to 05:00 on Sept 13
        Instant nextDayStart = Instant.parse("2026-09-13T02:00:00Z");
        Instant nextDayEnd = Instant.parse("2026-09-13T05:00:00Z");

        Task midnightTask = Task.builder()
            .id(104L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Overnight Shift")
            .startDateTime(midnightStart)
            .endDateTime(midnightEnd)
            .status(TaskStatus.PLANNED)
            .build();

        TaskRequest newRequest = TaskRequest.builder()
            .title("Early Morning Task")
            .categoryId(10L)
            .startDateTime(nextDayStart)
            .endDateTime(nextDayEnd)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findOverlappingTasks(1L, nextDayStart, nextDayEnd, null))
            .thenReturn(List.of(midnightTask));

        assertThatThrownBy(() -> taskService.createTask(1L, newRequest))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Task time range conflicts with existing task(s)");
    }

    @Test
    @DisplayName("Update task overlap: Should throw ConflictException when updating a task to overlap with another task")
    void testUpdateTaskOverlapThrowsConflictException() {
        Instant start1 = Instant.parse("2026-09-12T09:00:00Z");
        Instant end1 = Instant.parse("2026-09-12T10:00:00Z");

        Instant start2 = Instant.parse("2026-09-12T10:00:00Z");
        Instant end2 = Instant.parse("2026-09-12T11:00:00Z");

        Task taskToUpdate = Task.builder()
            .id(105L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Task 1")
            .startDateTime(start1)
            .endDateTime(end1)
            .status(TaskStatus.PLANNED)
            .build();

        Task conflictingTask = Task.builder()
            .id(106L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Task 2")
            .startDateTime(start2)
            .endDateTime(end2)
            .status(TaskStatus.PLANNED)
            .build();

        // Updating task 105L to start at 09:30 and end at 10:30 (overlaps task 106L)
        Instant updatedStart = Instant.parse("2026-09-12T09:30:00Z");
        Instant updatedEnd = Instant.parse("2026-09-12T10:30:00Z");

        TaskRequest updateRequest = TaskRequest.builder()
            .title("Task 1 Extended")
            .categoryId(10L)
            .startDateTime(updatedStart)
            .endDateTime(updatedEnd)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findByIdAndUserId(105L, 1L)).thenReturn(Optional.of(taskToUpdate));
        when(taskRepository.findOverlappingTasks(1L, updatedStart, updatedEnd, 105L))
            .thenReturn(List.of(conflictingTask));

        assertThatThrownBy(() -> taskService.updateTask(1L, 105L, updateRequest))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Task time range conflicts with existing task(s)");
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

    @Test
    @DisplayName("Boundary overlap: Task 23:50 to 00:10 next day should conflict with Day 2 00:00 to 00:05 task")
    void testTaskStarting2350Ending0010Overlap() {
        Instant start2350 = Instant.parse("2026-09-12T23:50:00Z");
        Instant end0010 = Instant.parse("2026-09-13T00:10:00Z");

        Task midnightTask = Task.builder()
            .id(107L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Late Shift")
            .startDateTime(start2350)
            .endDateTime(end0010)
            .status(TaskStatus.PLANNED)
            .build();

        Instant day2NewStart = Instant.parse("2026-09-13T00:00:00Z");
        Instant day2NewEnd = Instant.parse("2026-09-13T00:05:00Z");

        TaskRequest newRequest = TaskRequest.builder()
            .title("Early Task Day 2")
            .categoryId(10L)
            .startDateTime(day2NewStart)
            .endDateTime(day2NewEnd)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findOverlappingTasks(1L, day2NewStart, day2NewEnd, null))
            .thenReturn(List.of(midnightTask));

        assertThatThrownBy(() -> taskService.createTask(1L, newRequest))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Task time range conflicts with existing task(s)");
    }

    @Test
    @DisplayName("Boundary overlap: Task starting exactly at 00:00 should conflict with overlapping 00:00 to 00:30 task")
    void testTaskStartingExactlyAtMidnightOverlap() {
        Instant start0000 = Instant.parse("2026-09-12T00:00:00Z");
        Instant end0100 = Instant.parse("2026-09-12T01:00:00Z");

        Task existingMidnightTask = Task.builder()
            .id(108L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Midnight Task")
            .startDateTime(start0000)
            .endDateTime(end0100)
            .status(TaskStatus.PLANNED)
            .build();

        Instant newStart = Instant.parse("2026-09-12T00:00:00Z");
        Instant newEnd = Instant.parse("2026-09-12T00:30:00Z");

        TaskRequest newRequest = TaskRequest.builder()
            .title("Overlapping Early Task")
            .categoryId(10L)
            .startDateTime(newStart)
            .endDateTime(newEnd)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findOverlappingTasks(1L, newStart, newEnd, null))
            .thenReturn(List.of(existingMidnightTask));

        assertThatThrownBy(() -> taskService.createTask(1L, newRequest))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Task time range conflicts with existing task(s)");
    }

    @Test
    @DisplayName("Boundary overlap: Task ending exactly at 23:59:59 should conflict with 23:30 to 23:59:59 task")
    void testTaskEndingExactlyAt235959Overlap() {
        Instant start2300 = Instant.parse("2026-09-12T23:00:00Z");
        Instant end235959 = Instant.parse("2026-09-12T23:59:59Z");

        Task existingTask = Task.builder()
            .id(109L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Night Wrap")
            .startDateTime(start2300)
            .endDateTime(end235959)
            .status(TaskStatus.PLANNED)
            .build();

        Instant newStart = Instant.parse("2026-09-12T23:30:00Z");
        Instant newEnd = Instant.parse("2026-09-12T23:59:59Z");

        TaskRequest newRequest = TaskRequest.builder()
            .title("Late Night Overlap")
            .categoryId(10L)
            .startDateTime(newStart)
            .endDateTime(newEnd)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findOverlappingTasks(1L, newStart, newEnd, null))
            .thenReturn(List.of(existingTask));

        assertThatThrownBy(() -> taskService.createTask(1L, newRequest))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Task time range conflicts with existing task(s)");
    }

    @Test
    @DisplayName("Boundary overlap: Querying/creating task on Day 2 overlapping Day 1 midnight-crossing task should conflict")
    void testQueryFromWrongSideOfMidnightOverlap() {
        Instant day1StartTask = Instant.parse("2026-09-12T22:00:00Z");
        Instant day2EndTask = Instant.parse("2026-09-13T04:00:00Z");

        Task overnightTask = Task.builder()
            .id(110L)
            .user(sampleUser)
            .category(sampleCategory)
            .title("Overnight Duty")
            .startDateTime(day1StartTask)
            .endDateTime(day2EndTask)
            .status(TaskStatus.PLANNED)
            .build();

        Instant day2NewStart = Instant.parse("2026-09-13T02:00:00Z");
        Instant day2NewEnd = Instant.parse("2026-09-13T03:00:00Z");

        TaskRequest newRequest = TaskRequest.builder()
            .title("Day 2 Early Task")
            .categoryId(10L)
            .startDateTime(day2NewStart)
            .endDateTime(day2NewEnd)
            .status(TaskStatus.PLANNED)
            .build();

        when(taskRepository.findOverlappingTasks(1L, day2NewStart, day2NewEnd, null))
            .thenReturn(List.of(overnightTask));

        assertThatThrownBy(() -> taskService.createTask(1L, newRequest))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("Task time range conflicts with existing task(s)");
    }
}

