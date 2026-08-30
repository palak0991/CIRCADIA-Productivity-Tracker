package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.request.ActualTimeActionRequest;
import com.visualizer.hour24.dto.request.TaskRequest;
import com.visualizer.hour24.dto.request.TaskStatusUpdateRequest;
import com.visualizer.hour24.dto.response.TaskResponse;

import java.time.LocalDate;
import java.util.List;

public interface TaskService {
    TaskResponse createTask(Long userId, TaskRequest request);
    List<TaskResponse> getTasksByUserId(Long userId);
    List<TaskResponse> getTasksForDate(Long userId, LocalDate date, String timezoneStr);
    TaskResponse getTaskById(Long userId, Long taskId);
    TaskResponse updateTask(Long userId, Long taskId, TaskRequest request);
    TaskResponse updateTaskStatus(Long userId, Long taskId, TaskStatusUpdateRequest request);
    TaskResponse updateActualTime(Long userId, Long taskId, ActualTimeActionRequest request);
    void deleteTask(Long userId, Long taskId);
}
