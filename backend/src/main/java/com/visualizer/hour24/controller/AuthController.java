package com.visualizer.hour24.controller;

import com.visualizer.hour24.dto.request.LoginRequest;
import com.visualizer.hour24.dto.request.RegisterRequest;
import com.visualizer.hour24.dto.response.AuthResponse;
import com.visualizer.hour24.dto.response.UserResponse;
import com.visualizer.hour24.service.AuthService;
import com.visualizer.hour24.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final SecurityUtils securityUtils;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        Long userId = securityUtils.getCurrentUserId();
        UserResponse response = authService.getCurrentUserProfile(userId);
        return ResponseEntity.ok(response);
    }
}
