package com.visualizer.hour24.exception;

import com.visualizer.hour24.dto.response.TaskResponse;
import lombok.Getter;

import java.util.List;

@Getter
public class ConflictException extends RuntimeException {

    private final List<TaskResponse> conflictingTasks;

    public ConflictException(String message, List<TaskResponse> conflictingTasks) {
        super(message);
        this.conflictingTasks = conflictingTasks;
    }
}
