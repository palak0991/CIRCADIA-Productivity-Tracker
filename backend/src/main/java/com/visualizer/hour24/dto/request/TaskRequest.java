package com.visualizer.hour24.dto.request;

import com.visualizer.hour24.enums.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskRequest {

    @NotBlank(message = "Task title is required")
    @Size(max = 100, message = "Task title cannot exceed 100 characters")
    private String title;

    @Size(max = 2000, message = "Task description cannot exceed 2000 characters")
    private String description;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotNull(message = "Start date and time is required")
    private Instant startDateTime;

    @NotNull(message = "End date and time is required")
    private Instant endDateTime;

    private TaskStatus status;

    @Builder.Default
    private Boolean overrideConflict = false;
}
