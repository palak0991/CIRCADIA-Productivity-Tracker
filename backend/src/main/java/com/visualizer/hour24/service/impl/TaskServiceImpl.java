package com.visualizer.hour24.service.impl;

import com.visualizer.hour24.dto.request.TaskRequest;
import com.visualizer.hour24.dto.request.TaskStatusUpdateRequest;
import com.visualizer.hour24.dto.response.TaskResponse;
import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.enums.TaskStatus;
import com.visualizer.hour24.exception.BadRequestException;
import com.visualizer.hour24.exception.ResourceNotFoundException;
import com.visualizer.hour24.mapper.TaskMapper;
import com.visualizer.hour24.repository.CategoryRepository;
import com.visualizer.hour24.repository.TaskRepository;
import com.visualizer.hour24.repository.UserRepository;
import com.visualizer.hour24.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TaskMapper taskMapper;

    @Override
    public TaskResponse createTask(Long userId, TaskRequest request) {
        validateTaskTimes(request.getStartDateTime(), request.getEndDateTime());

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Category category = categoryRepository.findByIdAndUserId(request.getCategoryId(), userId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found or does not belong to user with id: " + request.getCategoryId()));

        Task task = taskMapper.toEntity(request, user, category);
        Task saved = taskRepository.save(task);
        return taskMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByUserId(Long userId) {
        return taskRepository.findAllByUserId(userId).stream()
            .map(taskMapper::toResponse)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksForDate(Long userId, LocalDate date, String timezoneStr) {
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(timezoneStr != null ? timezoneStr : "UTC");
        } catch (DateTimeException e) {
            zoneId = ZoneId.of("UTC");
        }

        // Compute exact 24-hour day bounds [dayStart, dayEnd) in UTC for the target calendar date
        ZonedDateTime startOfDay = date.atStartOfDay(zoneId);
        ZonedDateTime endOfDay = date.plusDays(1).atStartOfDay(zoneId);

        Instant rangeStart = startOfDay.toInstant();
        Instant rangeEnd = endOfDay.toInstant();

        // Query interval overlap: start_date_time < rangeEnd AND end_date_time > rangeStart
        List<Task> overlappingTasks = taskRepository.findTasksInDateRange(userId, rangeStart, rangeEnd);

        return overlappingTasks.stream()
            .map(taskMapper::toResponse)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long userId, Long taskId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        return taskMapper.toResponse(task);
    }

    @Override
    public TaskResponse updateTask(Long userId, Long taskId, TaskRequest request) {
        validateTaskTimes(request.getStartDateTime(), request.getEndDateTime());

        Task task = taskRepository.findByIdAndUserId(taskId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        Category category = categoryRepository.findByIdAndUserId(request.getCategoryId(), userId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found or does not belong to user with id: " + request.getCategoryId()));

        task.setTitle(request.getTitle().trim());
        task.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        task.setCategory(category);
        task.setStartDateTime(request.getStartDateTime());
        task.setEndDateTime(request.getEndDateTime());

        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }

        return taskMapper.toResponse(taskRepository.save(task));
    }

    @Override
    public TaskResponse updateTaskStatus(Long userId, Long taskId, TaskStatusUpdateRequest request) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        task.setStatus(request.getStatus());

        if (request.getActualStartDateTime() != null) {
            task.setActualStartDateTime(request.getActualStartDateTime());
        }
        if (request.getActualEndDateTime() != null) {
            task.setActualEndDateTime(request.getActualEndDateTime());
        }

        // Auto-set actual timestamps if status changed to COMPLETED/IN_PROGRESS and actual times are omitted
        if (request.getStatus() == TaskStatus.IN_PROGRESS && task.getActualStartDateTime() == null) {
            task.setActualStartDateTime(Instant.now());
        } else if (request.getStatus() == TaskStatus.COMPLETED) {
            if (task.getActualStartDateTime() == null) {
                task.setActualStartDateTime(task.getStartDateTime());
            }
            if (task.getActualEndDateTime() == null) {
                task.setActualEndDateTime(Instant.now());
            }
        }

        return taskMapper.toResponse(taskRepository.save(task));
    }

    @Override
    public void deleteTask(Long userId, Long taskId) {
        Task task = taskRepository.findByIdAndUserId(taskId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        taskRepository.delete(task);
    }

    private void validateTaskTimes(Instant startDateTime, Instant endDateTime) {
        if (startDateTime == null || endDateTime == null) {
            throw new BadRequestException("Start date time and end date time are required.");
        }
        if (!endDateTime.isAfter(startDateTime)) {
            throw new BadRequestException("Task end time must be strictly after start time.");
        }
    }
}
