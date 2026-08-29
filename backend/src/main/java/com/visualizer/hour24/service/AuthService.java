package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.request.LoginRequest;
import com.visualizer.hour24.dto.request.RegisterRequest;
import com.visualizer.hour24.dto.response.AuthResponse;
import com.visualizer.hour24.dto.response.UserResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    UserResponse getCurrentUserProfile(Long userId);
}
