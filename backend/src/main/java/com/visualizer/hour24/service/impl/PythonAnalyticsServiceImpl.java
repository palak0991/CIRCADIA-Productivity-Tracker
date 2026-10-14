package com.visualizer.hour24.service.impl;

import com.visualizer.hour24.dto.request.PythonAnalyticsRequest;
import com.visualizer.hour24.dto.request.PythonAnalyticsTaskPayload;
import com.visualizer.hour24.entity.Task;
import com.visualizer.hour24.enums.TaskStatus;
import com.visualizer.hour24.exception.BadRequestException;
import com.visualizer.hour24.repository.TaskRepository;
import com.visualizer.hour24.service.PythonAnalyticsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Slf4j
public class PythonAnalyticsServiceImpl implements PythonAnalyticsService {

    private final TaskRepository taskRepository;
    private final RestClient restClient;
    private final String pythonServiceUrl;

    public PythonAnalyticsServiceImpl(
            TaskRepository taskRepository,
            @Value("${app.analytics.python-service-url:http://localhost:8000}") String pythonServiceUrl,
            @Value("${app.analytics.timeout-ms:6000}") int timeoutMs) {
        this.taskRepository = taskRepository;
        this.pythonServiceUrl = pythonServiceUrl;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);

        this.restClient = RestClient.builder()
                .baseUrl(pythonServiceUrl)
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> calculateProductivityAnalytics(Long userId, LocalDate startDate, LocalDate endDate, String timezoneStr) {
        ZoneId zoneId;
        try {
            zoneId = ZoneId.of(timezoneStr != null ? timezoneStr : "UTC");
        } catch (DateTimeException e) {
            zoneId = ZoneId.of("UTC");
        }

        // Validate date order
        if (startDate.isAfter(endDate)) {
            LocalDate tmp = startDate;
            startDate = endDate;
            endDate = tmp;
        }

        // Compute UTC interval [rangeStart, rangeEnd)
        Instant rangeStart = startDate.atStartOfDay(zoneId).toInstant();
        Instant rangeEnd = endDate.plusDays(1).atStartOfDay(zoneId).toInstant();

        // 1. Fetch authorized tasks strictly for this user
        List<Task> tasks = taskRepository.findTasksInDateRange(userId, rangeStart, rangeEnd);

        // 2. Map to Python payload
        List<PythonAnalyticsTaskPayload> taskPayloads = tasks.stream()
                .map(this::mapToPayload)
                .toList();

        PythonAnalyticsRequest request = PythonAnalyticsRequest.builder()
                .userId(userId)
                .timezone(zoneId.getId())
                .startDate(startDate.toString())
                .endDate(endDate.toString())
                .tasks(taskPayloads)
                .referenceTime(Instant.now())
                .includeHeatmapImage(true)
                .build();

        // 3. Delegate to Python microservice
        try {
            log.info("Forwarding {} tasks to Python analytics microservice at {}", taskPayloads.size(), pythonServiceUrl);
            return restClient.post()
                    .uri("/api/v1/analytics/calculate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            log.error("Failed to communicate with Python analytics microservice at {}: {}", pythonServiceUrl, ex.getMessage());
            throw new BadRequestException("Analytics service temporarily unavailable. Please ensure the Python analytics service is running on " + pythonServiceUrl);
        }
    }

    private PythonAnalyticsTaskPayload mapToPayload(Task task) {
        Long plannedDuration = null;
        if (task.getStartDateTime() != null && task.getEndDateTime() != null) {
            plannedDuration = ChronoUnit.MINUTES.between(task.getStartDateTime(), task.getEndDateTime());
        }

        Long actualDuration = null;
        if (task.getActualStartDateTime() != null && task.getActualEndDateTime() != null) {
            actualDuration = ChronoUnit.MINUTES.between(task.getActualStartDateTime(), task.getActualEndDateTime());
        } else if (task.getStatus() == TaskStatus.IN_PROGRESS && task.getActualStartDateTime() != null) {
            actualDuration = ChronoUnit.MINUTES.between(task.getActualStartDateTime(), Instant.now());
        }

        return PythonAnalyticsTaskPayload.builder()
                .id(task.getId())
                .title(task.getTitle())
                .categoryId(task.getCategory() != null ? task.getCategory().getId() : null)
                .categoryName(task.getCategory() != null ? task.getCategory().getName() : "Uncategorized")
                .categoryColor(task.getCategory() != null ? task.getCategory().getColor() : "#EC4899")
                .status(task.getStatus() != null ? task.getStatus().name() : "PLANNED")
                .startDateTime(task.getStartDateTime())
                .endDateTime(task.getEndDateTime())
                .actualStartDateTime(task.getActualStartDateTime())
                .actualEndDateTime(task.getActualEndDateTime())
                .plannedDurationMinutes(plannedDuration)
                .actualDurationMinutes(actualDuration)
                .build();
    }
}
