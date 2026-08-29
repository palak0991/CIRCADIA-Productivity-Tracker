package com.visualizer.hour24.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visualizer.hour24.dto.request.TaskRequest;
import com.visualizer.hour24.dto.response.CategoryResponse;
import com.visualizer.hour24.dto.response.TaskResponse;
import com.visualizer.hour24.enums.TaskStatus;
import com.visualizer.hour24.security.AuthEntryPointJwt;
import com.visualizer.hour24.security.CustomUserDetailsService;
import com.visualizer.hour24.security.JwtTokenProvider;
import com.visualizer.hour24.service.TaskService;
import com.visualizer.hour24.util.SecurityUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc(addFilters = false)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TaskService taskService;

    @MockBean
    private SecurityUtils securityUtils;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean
    private AuthEntryPointJwt authEntryPointJwt;

    @Test
    @DisplayName("POST /api/tasks - Should create a task and return 201 Created")
    void testCreateTaskEndpoint() throws Exception {
        Instant now = Instant.now();
        Instant end = now.plusSeconds(7200);

        TaskRequest request = TaskRequest.builder()
            .title("DSA Practice")
            .description("Trees & Graphs")
            .categoryId(10L)
            .startDateTime(now)
            .endDateTime(end)
            .status(TaskStatus.PLANNED)
            .build();

        CategoryResponse catResponse = CategoryResponse.builder()
            .id(10L)
            .name("Study")
            .color("#3B82F6")
            .isDefault(true)
            .build();

        TaskResponse response = TaskResponse.builder()
            .id(100L)
            .title("DSA Practice")
            .description("Trees & Graphs")
            .category(catResponse)
            .startDateTime(now)
            .endDateTime(end)
            .status(TaskStatus.PLANNED)
            .build();

        when(securityUtils.getCurrentUserId()).thenReturn(1L);
        when(taskService.createTask(eq(1L), any(TaskRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(100))
            .andExpect(jsonPath("$.title").value("DSA Practice"))
            .andExpect(jsonPath("$.status").value("PLANNED"));
    }

    @Test
    @DisplayName("GET /api/tasks?date=2026-08-19 - Should return tasks for specified date")
    void testGetTasksForDateEndpoint() throws Exception {
        CategoryResponse catResponse = CategoryResponse.builder()
            .id(10L)
            .name("Study")
            .color("#3B82F6")
            .isDefault(true)
            .build();

        TaskResponse response = TaskResponse.builder()
            .id(100L)
            .title("DSA Practice")
            .category(catResponse)
            .startDateTime(Instant.now())
            .endDateTime(Instant.now().plusSeconds(3600))
            .status(TaskStatus.PLANNED)
            .build();

        when(securityUtils.getCurrentUserId()).thenReturn(1L);
        when(taskService.getTasksForDate(eq(1L), eq(LocalDate.of(2026, 8, 19)), eq("UTC")))
            .thenReturn(List.of(response));

        mockMvc.perform(get("/api/tasks")
                .param("date", "2026-08-19")
                .param("timezone", "UTC"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(100))
            .andExpect(jsonPath("$[0].title").value("DSA Practice"));
    }
}
