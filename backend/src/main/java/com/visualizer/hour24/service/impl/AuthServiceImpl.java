package com.visualizer.hour24.service.impl;

import com.visualizer.hour24.dto.request.LoginRequest;
import com.visualizer.hour24.dto.request.RegisterRequest;
import com.visualizer.hour24.dto.response.AuthResponse;
import com.visualizer.hour24.dto.response.UserResponse;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.exception.BadRequestException;
import com.visualizer.hour24.exception.ResourceNotFoundException;
import com.visualizer.hour24.repository.UserRepository;
import com.visualizer.hour24.security.JwtTokenProvider;
import com.visualizer.hour24.security.UserPrincipal;
import com.visualizer.hour24.service.AuthService;
import com.visualizer.hour24.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final CategoryService categoryService;

    @Override
    public AuthResponse register(RegisterRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("Username '" + username + "' is already taken.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email '" + email + "' is already registered.");
        }

        User user = User.builder()
            .username(username)
            .email(email)
            .passwordHash(passwordEncoder.encode(request.getPassword()))
            .timezone(request.getTimezone() != null ? request.getTimezone() : "UTC")
            .enabled(true)
            .build();

        User savedUser = userRepository.save(user);

        // Auto-seed standard default categories for new user
        categoryService.seedDefaultCategories(savedUser);

        String token = tokenProvider.generateTokenFromUserId(savedUser.getId(), savedUser.getUsername());

        return AuthResponse.builder()
            .token(token)
            .user(mapToUserResponse(savedUser))
            .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getUsernameOrEmail().trim(),
                request.getPassword()
            )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return AuthResponse.builder()
            .token(token)
            .user(mapToUserResponse(user))
            .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUserProfile(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        return mapToUserResponse(user);
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .timezone(user.getTimezone())
            .createdAt(user.getCreatedAt())
            .build();
    }
}
