package com.visualizer.hour24.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visualizer.hour24.dto.request.*;
import com.visualizer.hour24.enums.TaskStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class TaskFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Full integration flow: Register -> Login -> Create Category -> Create Task -> Complete Task -> Fetch Analytics")
    void testFullUserTaskLifecycleAndAnalytics() throws Exception {
        // 1. Register User
        RegisterRequest registerReq = RegisterRequest.builder()
            .username("flowuser")
            .email("flowuser@example.com")
            .password("password123")
            .build();

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.user.username").value("flowuser"));

        // 2. Login User
        LoginRequest loginReq = LoginRequest.builder()
            .usernameOrEmail("flowuser")
            .password("password123")
            .build();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
            .get("token").asText();
        String authHeader = "Bearer " + token;

        // 3. Create Category
        CategoryRequest catReq = CategoryRequest.builder()
            .name("Deep Focus")
            .color("#8B5CF6")
            .build();

        MvcResult catResult = mockMvc.perform(post("/api/categories")
                .header("Authorization", authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(catReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.name").value("Deep Focus"))
            .andReturn();

        Long categoryId = objectMapper.readTree(catResult.getResponse().getContentAsString())
            .get("id").asLong();

        // 4. Create Task
        LocalDate testDate = LocalDate.of(2026, 9, 12);
        Instant taskStart = testDate.atTime(10, 0).toInstant(ZoneOffset.UTC);
        Instant taskEnd = testDate.atTime(12, 0).toInstant(ZoneOffset.UTC);

        TaskRequest taskReq = TaskRequest.builder()
            .title("System Architecture Design")
            .description("Designing full-stack integration flow")
            .categoryId(categoryId)
            .startDateTime(taskStart)
            .endDateTime(taskEnd)
            .status(TaskStatus.PLANNED)
            .build();

        MvcResult taskResult = mockMvc.perform(post("/api/tasks")
                .header("Authorization", authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(taskReq)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").exists())
            .andExpect(jsonPath("$.title").value("System Architecture Design"))
            .andExpect(jsonPath("$.status").value("PLANNED"))
            .andReturn();

        Long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString())
            .get("id").asLong();

        // 5. Update Task Status to COMPLETED
        TaskStatusUpdateRequest statusReq = TaskStatusUpdateRequest.builder()
            .status(TaskStatus.COMPLETED)
            .actualStartDateTime(taskStart)
            .actualEndDateTime(taskEnd)
            .build();

        mockMvc.perform(patch("/api/tasks/" + taskId + "/status")
                .header("Authorization", authHeader)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(statusReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("COMPLETED"));

        // 6. Fetch Day Analytics
        MvcResult analyticsResult = mockMvc.perform(get("/api/analytics/day")
                .header("Authorization", authHeader)
                .param("date", "2026-09-12")
                .param("timezone", "UTC"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalTasks").value(1))
            .andExpect(jsonPath("$.completedTasks").value(1))
            .andExpect(jsonPath("$.totalPlannedMinutes").value(120))
            .andExpect(jsonPath("$.totalCompletedMinutes").value(120))
            .andExpect(jsonPath("$.productivityScore").value(100.0))
            .andReturn();

        assertThat(analyticsResult.getResponse().getContentAsString()).contains("Deep Focus");
    }
}
