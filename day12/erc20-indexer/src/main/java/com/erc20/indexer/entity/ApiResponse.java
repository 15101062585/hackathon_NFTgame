package com.erc20.indexer.entity;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private Long timestamp;
    
    // 成功响应
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, "操作成功", data, System.currentTimeMillis());
    }
    
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, System.currentTimeMillis());
    }
    
    // 失败响应
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<T>(false, message, null, System.currentTimeMillis());
    }
    
    public static <T> ApiResponse<T> error(String message, T data) {
        return new ApiResponse<T>(false, message, data, System.currentTimeMillis());
    }
}