package com.visualizer.hour24.controller;

import com.visualizer.hour24.dto.request.TaskRequest;
import com.visualizer.hour24.dto.request.TaskStatusUpdateRequest;
import com.visualizer.hour24.dto.response.TaskResponse;
import com.visualizer.hour24.service.TaskService;
import com.visualizer.hour24.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final SecurityUtils securityUtils;

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request,
                                                   @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        TaskResponse response = taskService.createTask(userId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasks(
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "timezone", required = false, defaultValue = "UTC") String timezone,
            @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();

        if (date != null) {
            List<TaskResponse> tasksForDate = taskService.getTasksForDate(userId, date, timezone);
            return ResponseEntity.ok(tasksForDate);
        }

        List<TaskResponse> allTasks = taskService.getTasksByUserId(userId);
        return ResponseEntity.ok(allTasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable("id") Long id,
                                                    @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        TaskResponse task = taskService.getTaskById(userId, id);
        return ResponseEntity.ok(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable("id") Long id,
                                                    @Valid @RequestBody TaskRequest request,
                                                    @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        TaskResponse updated = taskService.updateTask(userId, id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateTaskStatus(@PathVariable("id") Long id,
                                                          @Valid @RequestBody TaskStatusUpdateRequest request,
                                                          @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        TaskResponse updated = taskService.updateTaskStatus(userId, id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/actual-time")
    public ResponseEntity<TaskResponse> updateActualTime(@PathVariable("id") Long id,
                                                         @Valid @RequestBody com.visualizer.hour24.dto.request.ActualTimeActionRequest request,
                                                         @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        TaskResponse updated = taskService.updateActualTime(userId, id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable("id") Long id,
                                            @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        taskService.deleteTask(userId, id);
        return ResponseEntity.noContent().build();
    }
}
