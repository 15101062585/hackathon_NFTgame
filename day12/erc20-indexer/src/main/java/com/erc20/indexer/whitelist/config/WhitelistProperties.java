package com.erc20.indexer.whitelist.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "whitelist")
public class WhitelistProperties {
    private Long defaultExpiry = 604800L; // 7天
}
