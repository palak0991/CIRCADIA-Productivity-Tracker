package com.visualizer.hour24.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationInMs", 86400000L);
    }

    @Test
    @DisplayName("Should generate, parse, and validate JWT token successfully")
    void testJwtTokenGenerationAndValidation() {
        Long userId = 42L;
        String username = "alex";

        String token = jwtTokenProvider.generateTokenFromUserId(userId, username);
        assertThat(token).isNotBlank();

        boolean isValid = jwtTokenProvider.validateToken(token);
        assertThat(isValid).isTrue();

        Long parsedUserId = jwtTokenProvider.getUserIdFromJWT(token);
        assertThat(parsedUserId).isEqualTo(userId);
    }

    @Test
    @DisplayName("Should return false for invalid or tampered JWT token")
    void testInvalidJwtToken() {
        String invalidToken = "eyJhbGciOiJIUzI1NiJ9.invalidpayload.tamperedSignature";
        boolean isValid = jwtTokenProvider.validateToken(invalidToken);
        assertThat(isValid).isFalse();
    }
}
