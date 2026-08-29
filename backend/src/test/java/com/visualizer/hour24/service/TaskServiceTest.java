package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.request.TaskRequest;
import com.visualizer.hour24.entity.Category;
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

import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
            .endDateTime(earlier) // End time before start time
            .status(TaskStatus.PLANNED)
            .build();

        assertThatThrownBy(() -> taskService.createTask(1L, invalidRequest))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Task end time must be strictly after start time");
    }
}
