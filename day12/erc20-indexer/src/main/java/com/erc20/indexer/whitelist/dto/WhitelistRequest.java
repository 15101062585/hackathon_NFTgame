package com.erc20.indexer.whitelist.dto;

import lombok.Data;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigInteger;

@Data
public class WhitelistRequest {
    @NotBlank(message = "用户地址不能为空")
    private String userAddress;
    
    private BigInteger nftId = BigInteger.ZERO; // 默认0表示所有NFT
    
    @NotNull(message = "最高价格不能为空")
    private BigInteger maxPrice;
    
    
    private BigInteger deadline; // 过期时间戳
    
    private String tierLevel = "BRONZE"; // 默认等级
}

@Data
class BatchWhitelistRequest {
    @NotNull(message = "用户地址列表不能为空")
    private java.util.List<String> userAddresses;
    
    private BigInteger nftId = BigInteger.ZERO;
    
    @NotNull(message = "最高价格不能为空")
    private BigInteger maxPrice;
    
    @NotNull(message = "过期时间不能为空")
    private BigInteger deadline;
    
    private String tierLevel = "BRONZE";
}
