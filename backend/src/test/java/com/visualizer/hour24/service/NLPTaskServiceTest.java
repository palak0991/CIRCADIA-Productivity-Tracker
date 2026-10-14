package com.visualizer.hour24.service;

import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.exception.BadRequestException;
import com.visualizer.hour24.repository.CategoryRepository;
import com.visualizer.hour24.repository.TaskRepository;
import com.visualizer.hour24.service.impl.PythonAnalyticsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NLPTaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private CategoryRepository categoryRepository;

    private PythonAnalyticsServiceImpl pythonAnalyticsService;

    private User user;
    private Category category;

    @BeforeEach
    void setUp() {
        pythonAnalyticsService = new PythonAnalyticsServiceImpl(
                taskRepository,
                categoryRepository,
                "http://localhost:59999",
                500
        );

        user = User.builder().id(77L).username("sarah").email("sarah@example.com").build();
        category = Category.builder().id(12L).user(user).name("Study").color("#3B82F6").build();
    }

    @Test
    @DisplayName("Should query user categories and safely handle unreachable NLP microservice")
    void testNLPParseUserCategoryEnrichment() {
        Long targetUserId = 77L;
        when(categoryRepository.findAllByUserId(eq(targetUserId))).thenReturn(List.of(category));

        assertThatThrownBy(() -> pythonAnalyticsService.parseTaskNaturalLanguage(
                targetUserId,
                "Study DBMS for two hours tomorrow morning",
                "Asia/Kolkata"
        ))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("NLP parsing service temporarily unavailable");

        verify(categoryRepository).findAllByUserId(eq(targetUserId));
    }
}
