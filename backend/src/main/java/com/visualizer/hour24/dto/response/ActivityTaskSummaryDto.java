package com.visualizer.hour24.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityTaskSummaryDto {
    private Long id;
    private String title;
    private String categoryName;
    private String categoryColor;
    private Long durationMinutes;
}
