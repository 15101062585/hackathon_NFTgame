package com.erc20.indexer.whitelist.dto;

import lombok.Data;
import java.math.BigInteger;
import java.time.LocalDateTime;

@Data
public class WhitelistResponse {
    private Long id;
    private String userAddress;
    private BigInteger nftId;
    private BigInteger maxPrice;
    private BigInteger deadline;
    private String nonce;
    private String signature;
    private String signerAddress;
    private String tierLevel;
    private Boolean isUsed;
    private LocalDateTime createdAt;
    
    // EIP-712 签名数据（用于前端）
    private EIP712Data eip712Data;
    
    @Data
    public static class EIP712Data {
        private Domain domain;
        private Message message;
        private String primaryType = "Whitelist";
    }
    
    @Data
    public static class Domain {
        private String name;
        private String version;
        private BigInteger chainId;
        private String verifyingContract;
    }
    
    @Data
    public static class Message {
        private String user;
        private BigInteger nftId;
        private BigInteger maxPrice;
        private BigInteger deadline;
        private String nonce;
    }
}
