package com.visualizer.hour24.util;

import com.visualizer.hour24.exception.UnauthorizedAccessException;
import com.visualizer.hour24.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    /**
     * Resolves the current authenticated user ID from Spring Security SecurityContextHolder.
     */
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        throw new UnauthorizedAccessException("User is not authenticated");
    }
}
