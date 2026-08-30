package com.visualizer.hour24.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryAnalyticsDto {
    private Long categoryId;
    private String categoryName;
    private String color;
    private long plannedMinutes;
    private long completedMinutes;
    private long actualMinutes;
    private int taskCount;
}
