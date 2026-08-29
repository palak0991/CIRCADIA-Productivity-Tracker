package com.visualizer.hour24.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.visualizer.hour24.dto.request.LoginRequest;
import com.visualizer.hour24.dto.request.RegisterRequest;
import com.visualizer.hour24.dto.response.AuthResponse;
import com.visualizer.hour24.dto.response.UserResponse;
import com.visualizer.hour24.security.AuthEntryPointJwt;
import com.visualizer.hour24.security.CustomUserDetailsService;
import com.visualizer.hour24.security.JwtTokenProvider;
import com.visualizer.hour24.service.AuthService;
import com.visualizer.hour24.util.SecurityUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private SecurityUtils securityUtils;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @MockBean
    private AuthEntryPointJwt authEntryPointJwt;

    @Test
    @DisplayName("POST /api/auth/register - Should register user and return token")
    void testRegisterEndpoint() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
            .username("alex")
            .email("alex@example.com")
            .password("password123")
            .build();

        UserResponse userResponse = UserResponse.builder()
            .id(1L)
            .username("alex")
            .email("alex@example.com")
            .build();

        AuthResponse authResponse = AuthResponse.builder()
            .token("mocked.jwt.token")
            .user(userResponse)
            .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").value("mocked.jwt.token"))
            .andExpect(jsonPath("$.user.username").value("alex"));
    }

    @Test
    @DisplayName("POST /api/auth/login - Should authenticate user and return token")
    void testLoginEndpoint() throws Exception {
        LoginRequest request = LoginRequest.builder()
            .usernameOrEmail("alex")
            .password("password123")
            .build();

        UserResponse userResponse = UserResponse.builder()
            .id(1L)
            .username("alex")
            .email("alex@example.com")
            .build();

        AuthResponse authResponse = AuthResponse.builder()
            .token("mocked.jwt.token")
            .user(userResponse)
            .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("mocked.jwt.token"))
            .andExpect(jsonPath("$.user.username").value("alex"));
    }
}
