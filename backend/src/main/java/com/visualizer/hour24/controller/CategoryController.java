package com.visualizer.hour24.controller;

import com.visualizer.hour24.dto.request.CategoryRequest;
import com.visualizer.hour24.dto.response.CategoryResponse;
import com.visualizer.hour24.service.CategoryService;
import com.visualizer.hour24.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final SecurityUtils securityUtils;

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request,
                                                           @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        CategoryResponse response = categoryService.createCategory(userId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getCategories(@RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        List<CategoryResponse> categories = categoryService.getCategoriesByUserId(userId);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable("id") Long id,
                                                            @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        CategoryResponse category = categoryService.getCategoryById(userId, id);
        return ResponseEntity.ok(category);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(@PathVariable("id") Long id,
                                                            @Valid @RequestBody CategoryRequest request,
                                                            @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        CategoryResponse updated = categoryService.updateCategory(userId, id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable("id") Long id,
                                                @RequestHeader(value = "X-User-Id", required = false) Long userIdHeader) {
        Long userId = userIdHeader != null ? userIdHeader : securityUtils.getCurrentUserId();
        categoryService.deleteCategory(userId, id);
        return ResponseEntity.noContent().build();
    }
}
