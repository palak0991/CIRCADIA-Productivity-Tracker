package com.visualizer.hour24.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NLPParseResponse {

    private String originalText;
    private String title;
    private String description;
    private String date;
    private String startTime;
    private String endTime;
    private Integer durationMinutes;
    private Long categoryId;
    private String categoryName;
    private String startDateTime;
    private String endDateTime;
    private List<String> missingFields;
    private boolean needsConfirmation;
    private List<String> clarificationQuestions;
    private Map<String, String> confidence;
    private boolean inconsistentDuration;
}
