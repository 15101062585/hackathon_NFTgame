package com.erc20.indexer.whitelist.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;

import java.math.BigInteger;
import javax.annotation.PostConstruct;

@Slf4j
@Service
public class Web3jService {
    
    // 测试私钥
    @Value("${web3j.privateKey}")
    private String privateKey;
    
    @Value("${web3j.contractAddress}")
    private String contractAddress;
    
    @Value("${web3j.rpcUrl")
    private String rpcUrl;
    
    private Credentials credentials;
    
    // 空构造函数
    public Web3jService() {
        log.info("🔄 Web3jService 实例化完成");
    }
    
    /**
     * 在依赖注入完成后初始化
     */
    @PostConstruct
    public void init() {
        try {
            log.info("🔧 开始初始化 Web3jService...");
            log.info("📡 RPC URL: {}", rpcUrl);
            log.info("🔑 私钥配置: {}", privateKey != null ? "已配置" : "未配置");
            log.info("📝 合约地址: {}", contractAddress);
            
            // 验证必要配置
            if (rpcUrl == null || rpcUrl.trim().isEmpty()) {
                throw new IllegalArgumentException("RPC URL 不能为空");
            }
            
            // 初始化凭证（如果有私钥）
            if (privateKey != null && !privateKey.trim().isEmpty()) {
                String cleanPrivateKey = cleanPrivateKey(privateKey);
                this.credentials = Credentials.create(cleanPrivateKey);
                log.info("✅ 钱包凭证初始化成功");
                log.info("📧 签名者地址: {}", getSignerAddress());
            } else {
                log.warn("⚠️ 未配置私钥，将以只读模式运行");
                this.credentials = null;
            }
            
            log.info("✅ Web3jService 初始化成功");
            
        } catch (Exception e) {
            log.error("❌ Web3jService 初始化失败: {}", e.getMessage());
            log.warn("使用模拟模式继续运行");
            this.credentials = null;
        }
    }
    
    /**
     * 清理私钥格式
     */
    private String cleanPrivateKey(String privateKey) {
        if (privateKey == null) return null;
        
        String cleaned = privateKey.trim();
        
        // 去除 0x 前缀（如果存在）
        if (cleaned.startsWith("0x")) {
            cleaned = cleaned.substring(2);
        }
        
        log.info("🔐 私钥长度: {} 字符", cleaned.length());
        
        if (cleaned.length() != 64) {
            log.warn("⚠️ 私钥长度异常，应为64字符十六进制");
        }
        
        return cleaned;
    }
    
    /**
     * 从私钥获取真实的签名者地址
     */
    public String getSignerAddress() {
        if (credentials != null) {
            return credentials.getAddress();
        } else {
            // 模拟模式
            log.warn("使用模拟地址 - 请配置私钥以使用真实地址");
            return "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        }
    }
    
    /**
     * 获取私钥
     */
    public String getPrivateKey() {
        return privateKey;
    }
    
    /**
     * 获取链ID
     */
    public BigInteger getChainId() {
        return BigInteger.valueOf(11155111); // Sepolia 测试链
    }
    
    /**
     * 获取合约地址
     */
    public String getContractAddress() {
        return contractAddress;
    }
    
    /**
     * 获取 RPC URL
     */
    public String getRpcUrl() {
        return rpcUrl;
    }
    
    /**
     * 验证地址有效性
     */
    public boolean isValidAddress(String address) {
        if (address == null || address.trim().isEmpty()) {
            return false;
        }
        return address.matches("^0x[a-fA-F0-9]{40}$");
    }
    
    /**
     * 获取凭证（用于签名）
     */
    public Credentials getCredentials() {
        if (credentials == null) {
            throw new IllegalStateException("凭证未初始化，请检查私钥配置");
        }
        return credentials;
    }
    
    /**
     * 检查是否已配置凭证
     */
    public boolean hasCredentials() {
        return credentials != null;
    }
    
    /**
     * 从私钥生成地址（工具方法）
     */
    public static String getAddressFromPrivateKey(String privateKey) {
        try {
            if (privateKey == null || privateKey.trim().isEmpty()) {
                throw new IllegalArgumentException("私钥不能为空");
            }
            String cleanPrivateKey = privateKey.trim();
            if (cleanPrivateKey.startsWith("0x")) {
                cleanPrivateKey = cleanPrivateKey.substring(2);
            }
            Credentials creds = Credentials.create(cleanPrivateKey);
            return creds.getAddress();
        } catch (Exception e) {
            log.error("从私钥生成地址失败: {}", e.getMessage());
            return null;
        }
    }
}