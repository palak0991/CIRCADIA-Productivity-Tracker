package com.visualizer.hour24.controller;

import com.visualizer.hour24.dto.response.NLPParseResponse;
import com.visualizer.hour24.service.PythonAnalyticsService;
import com.visualizer.hour24.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/nlp")
@RequiredArgsConstructor
public class NLPController {

    private final PythonAnalyticsService pythonAnalyticsService;
    private final SecurityUtils securityUtils;

    @PostMapping("/parse-task")
    public ResponseEntity<NLPParseResponse> parseTask(@RequestBody Map<String, String> requestBody) {
        Long userId = securityUtils.getCurrentUserId();
        String text = requestBody.getOrDefault("text", "");
        String timezone = requestBody.getOrDefault("timezone", "UTC");

        NLPParseResponse draft = pythonAnalyticsService.parseTaskNaturalLanguage(userId, text, timezone);
        return ResponseEntity.ok(draft);
    }
}
