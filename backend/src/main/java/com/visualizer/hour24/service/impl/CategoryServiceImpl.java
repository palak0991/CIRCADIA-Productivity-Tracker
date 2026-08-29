package com.visualizer.hour24.service.impl;

import com.visualizer.hour24.dto.request.CategoryRequest;
import com.visualizer.hour24.dto.response.CategoryResponse;
import com.visualizer.hour24.entity.Category;
import com.visualizer.hour24.entity.User;
import com.visualizer.hour24.exception.BadRequestException;
import com.visualizer.hour24.exception.ResourceNotFoundException;
import com.visualizer.hour24.mapper.CategoryMapper;
import com.visualizer.hour24.repository.CategoryRepository;
import com.visualizer.hour24.repository.UserRepository;
import com.visualizer.hour24.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final CategoryMapper categoryMapper;

    @Override
    public CategoryResponse createCategory(Long userId, CategoryRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (categoryRepository.existsByNameAndUserId(request.getName().trim(), userId)) {
            throw new BadRequestException("Category with name '" + request.getName() + "' already exists.");
        }

        Category category = categoryMapper.toEntity(request, user);
        Category saved = categoryRepository.save(category);
        return categoryMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategoriesByUserId(Long userId) {
        return categoryRepository.findAllByUserId(userId).stream()
            .map(categoryMapper::toResponse)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long userId, Long categoryId) {
        Category category = categoryRepository.findByIdAndUserId(categoryId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
        return categoryMapper.toResponse(category);
    }

    @Override
    public CategoryResponse updateCategory(Long userId, Long categoryId, CategoryRequest request) {
        Category category = categoryRepository.findByIdAndUserId(categoryId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));

        if (!category.getName().equalsIgnoreCase(request.getName().trim()) &&
            categoryRepository.existsByNameAndUserId(request.getName().trim(), userId)) {
            throw new BadRequestException("Category with name '" + request.getName() + "' already exists.");
        }

        category.setName(request.getName().trim());
        category.setColor(request.getColor().toUpperCase());
        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Override
    public void deleteCategory(Long userId, Long categoryId) {
        Category category = categoryRepository.findByIdAndUserId(categoryId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
        
        if (category.isDefault()) {
            throw new BadRequestException("Default categories cannot be deleted.");
        }
        categoryRepository.delete(category);
    }

    @Override
    public void seedDefaultCategories(User user) {
        List<Category> defaults = List.of(
            Category.builder().user(user).name("Study").color("#3B82F6").isDefault(true).build(),
            Category.builder().user(user).name("Work").color("#8B5CF6").isDefault(true).build(),
            Category.builder().user(user).name("Exercise").color("#10B981").isDefault(true).build(),
            Category.builder().user(user).name("Personal").color("#F59E0B").isDefault(true).build(),
            Category.builder().user(user).name("Sleep").color("#6366F1").isDefault(true).build(),
            Category.builder().user(user).name("Entertainment").color("#EC4899").isDefault(true).build()
        );
        categoryRepository.saveAll(defaults);
    }
}
