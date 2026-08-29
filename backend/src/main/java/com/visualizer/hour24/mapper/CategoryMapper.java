package com.visualizer.hour24.mapper;

import com.visualizer.hour24.dto.request.CategoryRequest;
import com.visualizer.hour24.dto.response.CategoryResponse;
import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.User;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public Category toEntity(CategoryRequest request, User user) {
        return Category.builder()
            .user(user)
            .name(request.getName().trim())
            .color(request.getColor().toUpperCase())
            .isDefault(false)
            .build();
    }

    public CategoryResponse toResponse(Category category) {
        return CategoryResponse.builder()
            .id(category.getId())
            .name(category.getName())
            .color(category.getColor())
            .isDefault(category.isDefault())
            .build();
    }
}
