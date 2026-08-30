package com.visualizer.hour24.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActualTimeActionRequest {

    public enum ActionType {
        START,
        COMPLETE,
        RESET
    }

    @NotNull(message = "Action type is required (START, COMPLETE, RESET)")
    private ActionType action;

    // Optional custom timestamp (defaults to Instant.now() if null)
    private Instant customTimestamp;
}
