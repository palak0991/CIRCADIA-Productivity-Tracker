package com.visualizer.hour24.service;

import com.visualizer.hour24.dto.request.CategoryRequest;
import com.visualizer.hour24.dto.response.CategoryResponse;
import com.visualizer.hour24.entity.User;

import java.util.List;

public interface CategoryService {
    CategoryResponse createCategory(Long userId, CategoryRequest request);
    List<CategoryResponse> getCategoriesByUserId(Long userId);
    CategoryResponse getCategoryById(Long userId, Long categoryId);
    CategoryResponse updateCategory(Long userId, Long categoryId, CategoryRequest request);
    void deleteCategory(Long userId, Long categoryId);
    void seedDefaultCategories(User user);
}
