package com.erc20.indexer.test;

import lombok.extern.slf4j.Slf4j;

/**
 * Lombok @Slf4j 注解测试类
 * 用于验证Trae开发工具中Lombok日志功能是否正常工作
 */
@Slf4j
public class LombokLogTest {
    
    public static void main(String[] args) {
        LombokLogTest test = new LombokLogTest();
        test.testLogMethods();
    }
    
    public void testLogMethods() {
        // 测试不同级别的日志方法
        log.trace("这是一条TRACE级别的日志");
        log.debug("这是一条DEBUG级别的日志");
        log.info("这是一条INFO级别的日志");
        log.warn("这是一条WARN级别的日志");
        log.error("这是一条ERROR级别的日志");
        
        // 测试带参数的日志
        log.info("带参数的日志：{} + {} = {}", 1, 2, 3);
        
        // 测试异常日志
        try {
            throw new RuntimeException("测试异常日志");
        } catch (Exception e) {
            log.error("捕获到异常", e);
        }
    }
}