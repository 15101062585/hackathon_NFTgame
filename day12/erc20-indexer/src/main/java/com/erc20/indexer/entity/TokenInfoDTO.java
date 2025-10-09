package com.erc20.indexer.entity;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenInfoDTO {
    private Long id;
    private String contractAddress;
    private String name;
    private String symbol;
    private Integer decimals;
    private BigDecimal totalSupply;
    private String formattedTotalSupply;
    
    public TokenInfoDTO(Token token) {
        this.id = token.getId();
        this.contractAddress = token.getContractAddress();
        this.name = token.getName();
        this.symbol = token.getSymbol();
        this.decimals = token.getDecimals();
        this.totalSupply = token.getTotalSupply();
        
        // 格式化总供应量
        if (totalSupply != null && decimals != null) {
            BigDecimal divisor = BigDecimal.TEN.pow(decimals);
            this.formattedTotalSupply = totalSupply.divide(divisor).stripTrailingZeros().toPlainString();
        }
    }
}
