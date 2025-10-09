package com.erc20.indexer.entity;

import lombok.Data;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "tokens")
@Data

public class Token {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "contract_address", unique = true, nullable = false, length = 42)
    private String contractAddress;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false, length = 50)
    private String symbol;
    
    @Column(nullable = false)
    private Integer decimals = 18;
    
    @Column(name = "total_supply", precision = 36, scale = 18)
    private BigDecimal totalSupply;
    
    @Column(name = "created_block")
    private Long createdBlock;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}