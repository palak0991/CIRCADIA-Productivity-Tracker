package com.visualizer.hour24.dto.response;

import com.visualizer.hour24.enums.TaskStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskResponse {

    private Long id;
    private String title;
    private String description;
    private CategoryResponse category;
    private Instant startDateTime;
    private Instant endDateTime;
    private Instant actualStartDateTime;
    private Instant actualEndDateTime;
    private TaskStatus status;
    private Long plannedDurationMinutes;
    private Long actualDurationMinutes;
    private Boolean isOverrunning;
    private Instant createdAt;
    private Instant updatedAt;
}
