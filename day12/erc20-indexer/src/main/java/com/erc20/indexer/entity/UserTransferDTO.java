package com.erc20.indexer.entity;

import java.math.BigDecimal;
import java.util.Date;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserTransferDTO {
    private Long id;
    private String fromAddress;
    private String toAddress;
    private BigDecimal value;
    private String formattedValue;
    private String transactionHash;
    private Long blockNumber;
    private Long timestamp;
    private Date transferTime;
    private String direction; // "in" 或 "out"
    private TokenInfoDTO token;
    
    // 从 TokenTransfer 实体转换
    public UserTransferDTO(TokenTransfer transfer, String userAddress) {
        this.id = transfer.getId();
        this.fromAddress = transfer.getFromAddress();
        this.toAddress = transfer.getToAddress();
        this.value = transfer.getValue();
        this.transactionHash = transfer.getTransactionHash();
        this.blockNumber = transfer.getBlockNumber();
        this.timestamp = transfer.getTimestamp();
        this.transferTime = new Date(transfer.getTimestamp() * 1000);
        
        // 判断转账方向
        if (userAddress.equalsIgnoreCase(transfer.getFromAddress())) {
            this.direction = "out";
        } else if (userAddress.equalsIgnoreCase(transfer.getToAddress())) {
            this.direction = "in";
        } else {
            this.direction = "unknown";
        }
        
        // 设置代币信息
        if (transfer.getToken() != null) {
            this.token = new TokenInfoDTO(transfer.getToken());
            // 格式化金额显示
            this.formattedValue = formatTokenValue(transfer.getValue(), transfer.getToken().getDecimals());
        }
    }
    
    private String formatTokenValue(BigDecimal value, Integer decimals) {
        if (decimals == null) decimals = 18;
        BigDecimal divisor = BigDecimal.TEN.pow(decimals);
        BigDecimal formatted = value.divide(divisor);
        return formatted.stripTrailingZeros().toPlainString();
    }
}