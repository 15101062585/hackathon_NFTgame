package com.erc20.indexer.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;



@RestController

public class TestController {
    
    @GetMapping("/api/test")
    public String test() {
        return "ERC20 Indexer is running!";
    }
    
    @GetMapping("/api/health")
    public String health() {
        return "OK";
    }
}