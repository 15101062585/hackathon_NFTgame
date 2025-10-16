package com.erc20.indexer.whitelist.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigInteger;

@Data
@Configuration
@ConfigurationProperties(prefix = "web3j")
public class Web3jConfig {
    private String privateKey;
    private String contractAddress;
    private BigInteger chainId;
    private String rpcUrl;
}
