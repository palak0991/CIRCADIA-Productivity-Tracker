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
public class NLPParseRequest {

    private String text;
    private Instant referenceTime;
    private String timezone;
    private List<CategoryOptionDto> availableCategories;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryOptionDto {
        private Long id;
        private String name;
        private String color;
    }
}
