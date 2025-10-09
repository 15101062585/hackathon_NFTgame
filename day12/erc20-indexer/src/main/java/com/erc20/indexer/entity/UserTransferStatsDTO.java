package com.erc20.indexer.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserTransferStatsDTO {
    private String userAddress;
    private Long totalTransfers;
    private Long incomingTransfers;
    private Long outgoingTransfers;
    private BigDecimal totalReceived;
    private BigDecimal totalSent;
    private String firstTransferTime;
    private String lastTransferTime;
    
    // 代币统计
    private List<TokenStatsDTO> tokenStats;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TokenStatsDTO {
        private String tokenSymbol;
        private String tokenAddress;
        private Long transferCount;
        private BigDecimal totalReceived;
        private BigDecimal totalSent;
    }
}
