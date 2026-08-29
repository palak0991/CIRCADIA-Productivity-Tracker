package com.visualizer.hour24.mapper;

import com.visualizer.hour24.dto.request.TaskRequest;
import com.visualizer.hour24.dto.response.TaskResponse;
import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.enums.TaskStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TaskMapper {

    private final CategoryMapper categoryMapper;

    public Task toEntity(TaskRequest request, User user, Category category) {
        return Task.builder()
            .user(user)
            .category(category)
            .title(request.getTitle().trim())
            .description(request.getDescription() != null ? request.getDescription().trim() : null)
            .startDateTime(request.getStartDateTime())
            .endDateTime(request.getEndDateTime())
            .status(request.getStatus() != null ? request.getStatus() : TaskStatus.PLANNED)
            .build();
    }

    public TaskResponse toResponse(Task task) {
        return TaskResponse.builder()
            .id(task.getId())
            .title(task.getTitle())
            .description(task.getDescription())
            .category(categoryMapper.toResponse(task.getCategory()))
            .startDateTime(task.getStartDateTime())
            .endDateTime(task.getEndDateTime())
            .actualStartDateTime(task.getActualStartDateTime())
            .actualEndDateTime(task.getActualEndDateTime())
            .status(task.getStatus())
            .createdAt(task.getCreatedAt())
            .updatedAt(task.getUpdatedAt())
            .build();
    }
}
