package com.visualizer.hour24.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonAnalyticsTaskPayload {
    private Long id;
    private String title;
    private Long categoryId;
    private String categoryName;
    private String categoryColor;
    private String status;
    private Instant startDateTime;
    private Instant endDateTime;
    private Instant actualStartDateTime;
    private Instant actualEndDateTime;
    private Long plannedDurationMinutes;
    private Long actualDurationMinutes;
}
