package com.erc20.indexer.whitelist.entity;

import lombok.Data;
import javax.persistence.*;
import java.math.BigInteger;
import java.time.LocalDateTime;

@Entity
@Table(name = "whitelist_signature")
@Data
public class WhitelistSignature {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_address", nullable = false, length = 42)
    private String userAddress;
    
    @Column(name = "nft_id")
    private BigInteger nftId; // 0表示所有NFT
    
    @Column(name = "max_price")
    private BigInteger maxPrice; // 最高购买价格(wei)
    
    @Column(name = "deadline", nullable = false)
    private BigInteger deadline; // 签名过期时间戳
    
    @Column(name = "nonce", nullable = false)
    private String nonce; // 防止重放攻击
    
    @Column(name = "signature", nullable = false, length = 132)
    private String signature; // EIP-712签名
    
    @Column(name = "signer_address", nullable = false, length = 42)
    private String signerAddress; // 签名者地址
    
    @Column(name = "tier_level", length = 20)
    private String tierLevel; // 白名单等级: BRONZE, SILVER, GOLD
    
    @Column(name = "is_used", nullable = false)
    private Boolean isUsed = false; // 是否已使用
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
