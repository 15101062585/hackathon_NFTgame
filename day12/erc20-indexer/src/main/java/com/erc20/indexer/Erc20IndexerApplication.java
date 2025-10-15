package com.erc20.indexer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync

public class Erc20IndexerApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(Erc20IndexerApplication.class, args);
    }
}