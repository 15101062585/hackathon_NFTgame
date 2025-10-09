package com.erc20.indexer.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Configuration
public class MultiRpcWeb3jConfig {
    
    @Value("${web3j.rpc-url}")
    private String[] providerUrls;
    
    @Bean
    @Primary
    public Web3j web3j() {
        List<String> providers = Arrays.asList(providerUrls);
        log.info("🔄 配置多RPC提供商: {}", providers);
        
        // 尝试每个提供商，直到找到一个可用的
        for (String providerUrl : providers) {
            try {
                log.info("尝试连接: {}", providerUrl);
                Web3j web3j = createWeb3j(providerUrl);
                
                // 测试连接
                String clientVersion = web3j.web3ClientVersion().send().getWeb3ClientVersion();
                log.info("✅ 成功连接到: {}", providerUrl);
                log.info("客户端版本: {}", clientVersion);
                
                return web3j;
                
            } catch (Exception e) {
                log.warn("❌ 连接失败 {}: {}", providerUrl, e.getMessage());
                continue;
            }
        }
        
        throw new RuntimeException("所有RPC提供商都连接失败，请检查网络连接");
    }
    
    private Web3j createWeb3j(String providerUrl) {
        okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .retryOnConnectionFailure(true)
                .build();
        
        HttpService httpService = new HttpService(providerUrl, client);
        return Web3j.build(httpService);
    }
}