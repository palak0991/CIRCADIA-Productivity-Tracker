package com.visualizer.hour24.dto.request;

import com.visualizer.hour24.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskStatusUpdateRequest {

    @NotNull(message = "Task status is required")
    private TaskStatus status;

    private Instant actualStartDateTime;
    private Instant actualEndDateTime;
}
