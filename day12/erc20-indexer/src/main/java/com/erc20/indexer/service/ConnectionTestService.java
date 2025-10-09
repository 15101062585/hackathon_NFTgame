package com.erc20.indexer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.EthBlockNumber;
import org.web3j.protocol.core.methods.response.Web3ClientVersion;

import java.util.concurrent.TimeUnit;


@Service
public class ConnectionTestService {
    
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(ConnectionTestService.class);
    
    private final Web3j web3j;
    
    public ConnectionTestService(Web3j web3j) {
        this.web3j = web3j;
    }
    
    public void comprehensiveConnectionTest() {
        log.info("🔍 开始全面网络连接测试...");
        
        testMultipleEndpoints();
    }
    
    private void testMultipleEndpoints() {
        String[] testEndpoints = {
            "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // Infura 公开demo key
            "https://eth-mainnet.public.blastapi.io",
            "https://rpc.ankr.com/eth",
            "https://cloudflare-eth.com",
            "https://ethereum.publicnode.com",
            "https://1rpc.io/eth"
        };
        
        for (String endpoint : testEndpoints) {
            testSingleEndpoint(endpoint);
        }
    }
    
    private void testSingleEndpoint(String endpoint) {
        log.info("🧪 测试端点: {}", endpoint);
        
        try {
            // 创建临时Web3j实例进行测试
            org.web3j.protocol.http.HttpService httpService = new org.web3j.protocol.http.HttpService(endpoint);
            Web3j testWeb3j = Web3j.build(httpService);
            
            // 设置超时
            testWeb3j.ethBlockNumber().sendAsync().get(10, TimeUnit.SECONDS);
            
            Web3ClientVersion clientVersion = testWeb3j.web3ClientVersion().send();
            EthBlockNumber blockNumber = testWeb3j.ethBlockNumber().send();
            
            log.info("✅ {} - 连接成功!", endpoint);
            log.info("   客户端版本: {}", clientVersion.getWeb3ClientVersion());
            log.info("   当前区块: {}", blockNumber.getBlockNumber());
            
            testWeb3j.shutdown();
            
        } catch (Exception e) {
            log.error("❌ {} - 连接失败: {}", endpoint, e.getMessage());
            
            // 详细错误分析
            if (e.getMessage().contains("connect timed out")) {
                log.error("   💡 原因: 连接超时 - 网络延迟或防火墙阻止");
            } else if (e.getMessage().contains("Connection refused")) {
                log.error("   💡 原因: 连接被拒绝 - 端点不可用");
            } else if (e.getMessage().contains("certificate")) {
                log.error("   💡 原因: SSL证书问题");
            } else if (e.getMessage().contains("Unable to resolve host")) {
                log.error("   💡 原因: DNS解析失败");
            }
        }
    }
}