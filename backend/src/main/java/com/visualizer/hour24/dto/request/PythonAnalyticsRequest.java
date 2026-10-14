package com.visualizer.hour24.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonAnalyticsRequest {
    private Long userId;
    private String timezone;
    private String startDate;
    private String endDate;
    private List<PythonAnalyticsTaskPayload> tasks;
    private Instant referenceTime;
    @Builder.Default
    private boolean includeHeatmapImage = true;
}
