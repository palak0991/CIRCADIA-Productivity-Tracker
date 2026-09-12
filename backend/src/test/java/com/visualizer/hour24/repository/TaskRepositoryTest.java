package com.visualizer.hour24.repository;

import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.enums.TaskStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class TaskRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TaskRepository taskRepository;

    private User user1;
    private User user2;
    private Category categoryWork;

    @BeforeEach
    void setUp() {
        user1 = entityManager.persist(User.builder()
            .username("alex")
            .email("alex@example.com")
            .passwordHash("hashedpass123")
            .build());

        user2 = entityManager.persist(User.builder()
            .username("jordan")
            .email("jordan@example.com")
            .passwordHash("hashedpass123")
            .build());

        categoryWork = entityManager.persist(Category.builder()
            .user(user1)
            .name("Work")
            .color("#8B5CF6")
            .build());

        entityManager.flush();
    }

    @Test
    @DisplayName("Should correctly retrieve midnight-crossing task for both days and isolate user data")
    void testMidnightCrossingTaskRetrievalAndUserIsolation() {
        // Create a task spanning across midnight: Aug 19, 11:00 PM (23:00) -> Aug 20, 7:00 AM (07:00) UTC
        Instant aug19_2300 = LocalDate.of(2026, 8, 19).atTime(23, 0).toInstant(ZoneOffset.UTC);
        Instant aug20_0700 = LocalDate.of(2026, 8, 20).atTime(7, 0).toInstant(ZoneOffset.UTC);

        Task midnightTask = taskRepository.save(Task.builder()
            .user(user1)
            .category(categoryWork)
            .title("Overnight Shift")
            .startDateTime(aug19_2300)
            .endDateTime(aug20_0700)
            .status(TaskStatus.PLANNED)
            .build());

        // Aug 19 interval bounds [2026-08-19 00:00:00, 2026-08-20 00:00:00)
        Instant aug19Start = LocalDate.of(2026, 8, 19).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant aug19End = LocalDate.of(2026, 8, 20).atStartOfDay(ZoneOffset.UTC).toInstant();

        // Aug 20 interval bounds [2026-08-20 00:00:00, 2026-08-21 00:00:00)
        Instant aug20Start = LocalDate.of(2026, 8, 20).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant aug20End = LocalDate.of(2026, 8, 21).atStartOfDay(ZoneOffset.UTC).toInstant();

        // 1. Verify task is returned when querying Aug 19
        List<Task> aug19Tasks = taskRepository.findTasksInDateRange(user1.getId(), aug19Start, aug19End);
        assertThat(aug19Tasks).hasSize(1);
        assertThat(aug19Tasks.get(0).getId()).isEqualTo(midnightTask.getId());

        // 2. Verify task is ALSO returned when querying Aug 20
        List<Task> aug20Tasks = taskRepository.findTasksInDateRange(user1.getId(), aug20Start, aug20End);
        assertThat(aug20Tasks).hasSize(1);
        assertThat(aug20Tasks.get(0).getId()).isEqualTo(midnightTask.getId());

        // 3. User Isolation Check: user2 querying Aug 19 / Aug 20 must return 0 tasks
        List<Task> user2Tasks = taskRepository.findTasksInDateRange(user2.getId(), aug19Start, aug19End);
        assertThat(user2Tasks).isEmpty();
    }

    @Test
    @DisplayName("Should retrieve task starting at 23:50 and ending at 00:10 the next day for both days")
    void testTaskStarting2350Ending0010NextDay() {
        Instant start2350 = Instant.parse("2026-09-12T23:50:00Z");
        Instant end0010 = Instant.parse("2026-09-13T00:10:00Z");

        Task task = taskRepository.save(Task.builder()
            .user(user1)
            .category(categoryWork)
            .title("Late Night Standup")
            .startDateTime(start2350)
            .endDateTime(end0010)
            .status(TaskStatus.PLANNED)
            .build());

        Instant day1Start = Instant.parse("2026-09-12T00:00:00Z");
        Instant day1End = Instant.parse("2026-09-13T00:00:00Z");

        Instant day2Start = Instant.parse("2026-09-13T00:00:00Z");
        Instant day2End = Instant.parse("2026-09-14T00:00:00Z");

        List<Task> day1Tasks = taskRepository.findTasksInDateRange(user1.getId(), day1Start, day1End);
        assertThat(day1Tasks).extracting(Task::getId).contains(task.getId());

        List<Task> day2Tasks = taskRepository.findTasksInDateRange(user1.getId(), day2Start, day2End);
        assertThat(day2Tasks).extracting(Task::getId).contains(task.getId());
    }

    @Test
    @DisplayName("Should retrieve task starting exactly at 00:00 for the target day, not previous day")
    void testTaskStartingExactlyAtMidnight() {
        Instant start0000 = Instant.parse("2026-09-12T00:00:00Z");
        Instant end0100 = Instant.parse("2026-09-12T01:00:00Z");

        Task task = taskRepository.save(Task.builder()
            .user(user1)
            .category(categoryWork)
            .title("Early Bird")
            .startDateTime(start0000)
            .endDateTime(end0100)
            .status(TaskStatus.PLANNED)
            .build());

        Instant prevDayStart = Instant.parse("2026-09-11T00:00:00Z");
        Instant prevDayEnd = Instant.parse("2026-09-12T00:00:00Z");

        Instant targetDayStart = Instant.parse("2026-09-12T00:00:00Z");
        Instant targetDayEnd = Instant.parse("2026-09-13T00:00:00Z");

        List<Task> prevDayTasks = taskRepository.findTasksInDateRange(user1.getId(), prevDayStart, prevDayEnd);
        assertThat(prevDayTasks).extracting(Task::getId).doesNotContain(task.getId());

        List<Task> targetDayTasks = taskRepository.findTasksInDateRange(user1.getId(), targetDayStart, targetDayEnd);
        assertThat(targetDayTasks).extracting(Task::getId).contains(task.getId());
    }

    @Test
    @DisplayName("Should retrieve task ending exactly at 23:59:59 for the target day, not next day")
    void testTaskEndingExactlyAt235959() {
        Instant start2300 = Instant.parse("2026-09-12T23:00:00Z");
        Instant end235959 = Instant.parse("2026-09-12T23:59:59Z");

        Task task = taskRepository.save(Task.builder()
            .user(user1)
            .category(categoryWork)
            .title("End Of Day Wrap")
            .startDateTime(start2300)
            .endDateTime(end235959)
            .status(TaskStatus.PLANNED)
            .build());

        Instant day1Start = Instant.parse("2026-09-12T00:00:00Z");
        Instant day1End = Instant.parse("2026-09-13T00:00:00Z");

        Instant day2Start = Instant.parse("2026-09-13T00:00:00Z");
        Instant day2End = Instant.parse("2026-09-14T00:00:00Z");

        List<Task> day1Tasks = taskRepository.findTasksInDateRange(user1.getId(), day1Start, day1End);
        assertThat(day1Tasks).extracting(Task::getId).contains(task.getId());

        List<Task> day2Tasks = taskRepository.findTasksInDateRange(user1.getId(), day2Start, day2End);
        assertThat(day2Tasks).extracting(Task::getId).doesNotContain(task.getId());
    }

    @Test
    @DisplayName("Querying from wrong side of midnight (Day 2) should return task started on Day 1")
    void testQueryFromWrongSideOfMidnight() {
        Instant day1StartTask = Instant.parse("2026-09-12T22:00:00Z");
        Instant day2EndTask = Instant.parse("2026-09-13T04:00:00Z");

        Task task = taskRepository.save(Task.builder()
            .user(user1)
            .category(categoryWork)
            .title("Night Shift")
            .startDateTime(day1StartTask)
            .endDateTime(day2EndTask)
            .status(TaskStatus.PLANNED)
            .build());

        // Querying Day 2 bounds [2026-09-13 00:00:00, 2026-09-14 00:00:00)
        Instant day2Start = Instant.parse("2026-09-13T00:00:00Z");
        Instant day2End = Instant.parse("2026-09-14T00:00:00Z");

        List<Task> day2Tasks = taskRepository.findTasksInDateRange(user1.getId(), day2Start, day2End);
        assertThat(day2Tasks).extracting(Task::getId).contains(task.getId());
    }
}
