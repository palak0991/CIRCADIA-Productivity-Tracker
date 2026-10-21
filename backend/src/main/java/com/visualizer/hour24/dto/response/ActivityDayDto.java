package com.visualizer.hour24.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityDayDto {
    private LocalDate date;
    private long count;
    private long workMinutes;
    private int level; // 0 (none) to 4 (maximum activity)

    @Builder.Default
    private List<ActivityTaskSummaryDto> tasks = new ArrayList<>();
}
