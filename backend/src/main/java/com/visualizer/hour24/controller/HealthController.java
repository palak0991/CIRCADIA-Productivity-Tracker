package com.visualizer.hour24.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealthStatus() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "24 Hour Visualizer API",
            "version", "0.0.1-SNAPSHOT",
            "timestamp", Instant.now().toString()
        ));
    }
}
