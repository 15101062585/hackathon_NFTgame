package com.erc20.indexer.service;

import com.erc20.indexer.entity.Token;
import com.erc20.indexer.entity.TokenTransfer;
import com.erc20.indexer.repository.TokenRepository;
import com.erc20.indexer.repository.TokenTransferRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.methods.response.EthBlock;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.Transaction;
import com.erc20.indexer.service.TokenService;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class EventIndexingService {

    private static final Logger log = LoggerFactory.getLogger(EventIndexingService.class);
    
    private final Web3j web3j;
    private final TokenRepository tokenRepository;
    private final TokenTransferRepository transferRepository;
    private final TokenService tokenService;
    
    @Value("${web3j.enabled:true}")
    private boolean web3jEnabled;
    
    @Value("${indexer.contract-address}")
    private String contractAddress;
    
    @Value("${indexer.poll-interval}")
    private long POLL_INTERVAL;

    @Value("${indexer.time-window}")
    private long TIME_WINDOW;

    // 时间窗口轮询相关字段
    private volatile long lastPollTime = 0;
    private volatile BigInteger lastPollBlock = BigInteger.ZERO;
    private ScheduledExecutorService scheduler;
    private volatile boolean isRunning = true;
    private boolean isInitialized = false;
    
    private final ConcurrentHashMap<String, Boolean> processingTransactions = new ConcurrentHashMap<>();

    // 定义 Transfer 事件
    private static final Event TRANSFER_EVENT = new Event(
        "Transfer",
        Arrays.asList(
            new TypeReference<Address>(true) {}, // from (indexed)
            new TypeReference<Address>(true) {}, // to (indexed)
            new TypeReference<Uint256>() {}     // value
        )
    );
    
    public EventIndexingService(Web3j web3j, 
                              TokenRepository tokenRepository,
                              TokenTransferRepository transferRepository, 
                              TokenService tokenService) {
        this.web3j = web3j;
        this.tokenRepository = tokenRepository;
        this.transferRepository = transferRepository;
        this.tokenService = tokenService;
    }
    
    @PostConstruct
    public void init() {
        if (web3jEnabled) {
            log.info("🌐 启动时间窗口区块链事件监听");
            testBlockchainConnection();
            startTimeWindowPolling(); // 使用时间窗口轮询
        } else {
            log.warn("🔌 区块链连接已禁用");
        }
    }
    
    @PreDestroy
    public void cleanup() {
        isRunning = false;
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        log.info("🔚 区块链监听已停止");
    }
    
    private void testBlockchainConnection() {
        try {
            log.info("🔍 测试区块链连接...");
            String clientVersion = web3j.web3ClientVersion().send().getWeb3ClientVersion();
            BigInteger blockNumber = web3j.ethBlockNumber().send().getBlockNumber();
            
            log.info("✅ 区块链连接成功!");
            log.info("客户端版本: {}", clientVersion);
            log.info("当前区块高度: {}", blockNumber);
            
            isInitialized = true;
            
        } catch (Exception e) {
            log.error("❌ 区块链连接测试失败: {}", e.getMessage());
            throw new RuntimeException("区块链连接失败，请检查网络配置", e);
        }
    }
    
    /**
     * 启动时间窗口轮询
     */
    private void startTimeWindowPolling() {
        log.info("⏰ 启动时间窗口轮询，间隔: {}秒, 窗口: {}分钟", 
                POLL_INTERVAL / 1000, TIME_WINDOW / 1000 / 60);
        
        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(this::timeWindowPoll, 0, POLL_INTERVAL, TimeUnit.MILLISECONDS);
    }
    
    /**
     * 时间窗口轮询方法
     */
    @Async
    public void timeWindowPoll() {
        if (!isInitialized || !web3jEnabled || !isRunning) {
            return;
        }
        
        try {
            long currentTime = System.currentTimeMillis();
            
            // 如果是第一次轮询，初始化时间窗口
            if (lastPollTime == 0) {
                initializeTimeWindow();
                lastPollTime = currentTime;
                return;
            }
            
            // 计算时间窗口（最近2分钟）
            long windowStartTime = currentTime - TIME_WINDOW;
            
            // 找到时间窗口对应的区块范围
            BlockRange blockRange = findBlocksByTimeWindow(windowStartTime, currentTime);
            
            if (blockRange.fromBlock.compareTo(blockRange.toBlock) >= 0) {
                log.debug("⏭️ 没有新区块需要处理");
                lastPollTime = currentTime;
                return;
            }
            
            log.info("🕐 时间窗口查询: {} - {} (区块 {} - {})", 
                    formatTime(windowStartTime), formatTime(currentTime),
                    blockRange.fromBlock, blockRange.toBlock);
            
            // 处理这个时间窗口内的区块
            processBlockRange(blockRange.fromBlock, blockRange.toBlock);
            
            lastPollTime = currentTime;
            lastPollBlock = blockRange.toBlock;
            
        } catch (Exception e) {
            log.error("⏰ 时间窗口轮询失败: {}", e.getMessage());
        }
    }
    
    /**
     * 初始化时间窗口
     */
    private void initializeTimeWindow() {
        try {
            // 从数据库获取最后处理的时间
            Long lastTimestamp = transferRepository.findMaxTimestamp();
            if (lastTimestamp != null && lastTimestamp > 0) {
                // 从最后处理的时间开始，加1秒避免重复
                long startTime = lastTimestamp * 1000 + 1000;
                long currentTime = System.currentTimeMillis();
                
                // 确保时间窗口不超过当前时间
                startTime = Math.min(startTime, currentTime);
                
                lastPollTime = startTime;
                log.info("📚 从数据库恢复时间窗口，最后时间: {}", formatTime(startTime));
            } else {
                // 第一次启动，从当前时间往前推时间窗口
                lastPollTime = System.currentTimeMillis() - TIME_WINDOW;
                log.info("🆕 首次启动时间窗口，从 {} 开始", formatTime(lastPollTime));
            }
            
        } catch (Exception e) {
            log.error("初始化时间窗口失败: {}", e.getMessage());
            // 默认从10分钟前开始
            lastPollTime = System.currentTimeMillis() - (10 * 60 * 1000);
        }
    }
    
    /**
     * 根据时间窗口查找对应的区块范围
     */
    private BlockRange findBlocksByTimeWindow(long fromTime, long toTime) {
        try {
            // 将时间转换为秒（区块链时间戳单位）
            long fromTimestamp = fromTime / 1000;
            long toTimestamp = toTime / 1000;
            
            // 获取最新区块
            BigInteger latestBlockNum = web3j.ethBlockNumber().send().getBlockNumber();
            EthBlock.Block latestBlock = web3j.ethGetBlockByNumber(
                DefaultBlockParameter.valueOf(latestBlockNum), false).send().getBlock();
            
            if (latestBlock == null) {
                log.error("获取最新区块失败");
                return new BlockRange(BigInteger.ZERO, BigInteger.ZERO);
            }
            
            long latestBlockTime = latestBlock.getTimestamp().longValue();
            
            // 如果目标时间晚于最新区块时间，使用最新区块
            if (toTimestamp > latestBlockTime) {
                toTimestamp = latestBlockTime;
            }
            
            // 查找起始区块
            BigInteger fromBlock = findBlockByTimestamp(fromTimestamp, BigInteger.ONE, latestBlockNum);
            BigInteger toBlock = findBlockByTimestamp(toTimestamp, fromBlock, latestBlockNum);
            
            log.debug("时间窗口映射: {}s-{}s -> 区块 {}-{}", fromTimestamp, toTimestamp, fromBlock, toBlock);
            
            return new BlockRange(fromBlock, toBlock);
            
        } catch (Exception e) {
            log.error("查找时间窗口区块失败: {}", e.getMessage());
            // 失败时返回空范围
            return new BlockRange(BigInteger.ZERO, BigInteger.ZERO);
        }
    }
    
    /**
     * 二分查找找到指定时间戳对应的区块
     */
    private BigInteger findBlockByTimestamp(long targetTimestamp, BigInteger low, BigInteger high) {
        try {
            // 简化实现：从最新区块往前查找
            BigInteger current = high;
            int maxSteps = 100; // 最多查找100步
            
            for (int i = 0; i < maxSteps && current.compareTo(low) >= 0; i++) {
                EthBlock.Block block = web3j.ethGetBlockByNumber(
                    DefaultBlockParameter.valueOf(current), false).send().getBlock();
                
                if (block != null) {
                    long blockTime = block.getTimestamp().longValue();
                    
                    if (blockTime <= targetTimestamp) {
                        // 找到第一个时间戳小于等于目标时间的区块
                        log.debug("找到区块 {} 时间 {} <= 目标时间 {}", current, blockTime, targetTimestamp);
                        return current;
                    }
                }
                
                current = current.subtract(BigInteger.ONE);
            }
            
            // 如果没找到，返回最低区块
            log.debug("未找到合适区块，返回最低区块: {}", low);
            return low;
            
        } catch (Exception e) {
            log.error("二分查找区块失败: {}", e.getMessage());
            return low;
        }
    }
    
    /**
     * 优化的区块范围处理（避免大范围查询）
     */
    private void processBlockRange(BigInteger fromBlock, BigInteger toBlock) {
        if (fromBlock.compareTo(toBlock) >= 0) {
            log.debug("⏭️ 区块范围无效: {} - {}", fromBlock, toBlock);
            return;
        }
        
        try {
            long blockCount = toBlock.subtract(fromBlock).longValue();
            
            // 如果区块范围太大，分成小批次处理
            if (blockCount > 100) {
                log.info("📦 大范围区块分割处理: {} 个区块", blockCount);
                processLargeBlockRange(fromBlock, toBlock);
            } else {
                processSingleBlockRange(fromBlock, toBlock);
            }
            
        } catch (Exception e) {
            log.error("处理区块范围失败: {} - {}: {}", fromBlock, toBlock, e.getMessage());
        }
    }
    
    /**
     * 处理大范围区块（分割成小批次）
     */
    private void processLargeBlockRange(BigInteger fromBlock, BigInteger toBlock) {
        BigInteger batchSize = BigInteger.valueOf(50);
        BigInteger current = fromBlock;
        int batchCount = 0;
        
        while (current.compareTo(toBlock) < 0) {
            BigInteger batchEnd = current.add(batchSize).min(toBlock);
            
            log.debug("处理批次 {}: {} - {}", ++batchCount, current, batchEnd);
            processSingleBlockRange(current, batchEnd);
            
            current = batchEnd.add(BigInteger.ONE);
            
            // 小延迟避免过载
            if (current.compareTo(toBlock) < 0) {
                try {
                    Thread.sleep(200);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        
        log.info("✅ 大范围处理完成: {} 个批次", batchCount);
    }
    
    /**
     * 处理单个区块范围
     */
    private void processSingleBlockRange(BigInteger fromBlock, BigInteger toBlock) {
        try {
            org.web3j.protocol.core.methods.request.EthFilter filter = 
                new org.web3j.protocol.core.methods.request.EthFilter(
                    DefaultBlockParameter.valueOf(fromBlock),
                    DefaultBlockParameter.valueOf(toBlock),
                    List.of(contractAddress)
                );
            filter.addSingleTopic(EventEncoder.encode(TRANSFER_EVENT));
            
            EthLog ethLog = web3j.ethGetLogs(filter).send();
            List<EthLog.LogResult> logResults = ethLog.getLogs();
            
            if (logResults != null && !logResults.isEmpty()) {
                log.info("📥 在区块 {}-{} 中找到 {} 个转账事件", fromBlock, toBlock, logResults.size());
                
                int processed = 0;
                for (EthLog.LogResult logResult : logResults) {
                    try {
                        if (logResult instanceof EthLog.LogObject) {
                            EthLog.LogObject logObject = (EthLog.LogObject) logResult;
                            processTransferLog(logObject.get());
                            processed++;
                        }
                    } catch (Exception e) {
                        log.error("处理转账事件失败: {}", e.getMessage());
                    }
                }
                
                log.info("✅ 成功处理 {}/{} 个转账事件", processed, logResults.size());
            } else {
                log.debug("区块 {}-{} 中没有找到转账事件", fromBlock, toBlock);
            }
            
        } catch (Exception e) {
            log.error("处理区块范围 {} - {} 失败: {}", fromBlock, toBlock, e.getMessage());
        }
    }
    
    @Transactional
    public void processTransferLog(Log ethLog) {
        try {
            String contractAddress = ethLog.getAddress();
            String transactionHash = ethLog.getTransactionHash();
            Integer logIndex = ethLog.getLogIndex().intValue();
            
            // 检查是否已经处理过这个日志
            if (transferRepository.countByTransactionHashAndLogIndex(transactionHash, logIndex) > 0) {
                log.debug("转账记录已存在，跳过: {} - logIndex: {}", transactionHash, logIndex);
                return;
            }
            
            // 1. 查找或创建 Token
            Token token = tokenRepository.findByContractAddress(contractAddress)
                .orElseGet(() -> createTokenFromBlockchain(contractAddress, ethLog.getBlockNumber()));
            
            if (token == null) {
                log.error("无法创建或获取 Token 信息: {}", contractAddress);
                return;
            }
            
            // 2. 解析事件参数
            String from = "0x" + ethLog.getTopics().get(1).substring(26);
            String to = "0x" + ethLog.getTopics().get(2).substring(26);
            
            String data = ethLog.getData();
            BigInteger value = new BigInteger(data.substring(2), 16);
            
            // 3. 获取区块时间戳
            EthBlock.Block block = web3j.ethGetBlockByHash(ethLog.getBlockHash(), false).send().getBlock();
            BigInteger timestamp = block.getTimestamp();
            
            // 4. 创建并保存 Transfer 记录
            TokenTransfer transfer = new TokenTransfer();
            transfer.setToken(token);
            transfer.setFromAddress(from.toLowerCase());
            transfer.setToAddress(to.toLowerCase());
            transfer.setValue(new BigDecimal(value));
            transfer.setTransactionHash(transactionHash);
            transfer.setBlockNumber(ethLog.getBlockNumber().longValue());
            transfer.setTransactionIndex(ethLog.getTransactionIndex().intValue());
            transfer.setLogIndex(logIndex);
            transfer.setTimestamp(timestamp.longValue());
            transferRepository.save(transfer);
            
            log.info("📥 已索引转账: {} {} 从 {} 到 {} 区块: {}", 
                    formatValue(value, token.getDecimals()), 
                    token.getSymbol(), 
                    shortenAddress(from), 
                    shortenAddress(to),
                    ethLog.getBlockNumber());
                    
        } catch (Exception e) {
            log.error("解析 Transfer 日志失败: {}", e.getMessage());
        }
    }
    
    public Token createTokenFromBlockchain(String contractAddress, BigInteger deploymentBlock) {
        try {
            log.info("🆕 发现新Token合约: {}", contractAddress);
            
            // 从区块链获取真实的代币信息
            TokenService.TokenInfo tokenInfo = tokenService.getTokenInfoFromBlockchain(contractAddress);
            
            // 创建 Token 对象
            Token token = new Token();
            token.setContractAddress(contractAddress.toLowerCase());
            token.setName(tokenInfo.getName());
            token.setSymbol(tokenInfo.getSymbol());
            token.setDecimals(tokenInfo.getDecimals());
            token.setCreatedBlock(deploymentBlock.longValue());
            
            // 转换总供应量（考虑小数位）
            BigDecimal totalSupply = convertToDecimal(tokenInfo.getTotalSupply(), tokenInfo.getDecimals());
            token.setTotalSupply(totalSupply);
            
            Token savedToken = tokenRepository.save(token);
            log.info("✅ 创建Token记录: {} ({}) - 总供应量: {}", 
                    tokenInfo.getName(), tokenInfo.getSymbol(), totalSupply);
            
            return savedToken;
            
        } catch (Exception e) {
            log.error("❌ 创建 Token 记录失败 {}: {}", contractAddress, e.getMessage());
            return createFallbackToken(contractAddress, deploymentBlock);
        }
    }
    
    private String formatValue(BigInteger value, int decimals) {
        BigDecimal decimalValue = new BigDecimal(value);
        BigDecimal divisor = BigDecimal.TEN.pow(decimals);
        return decimalValue.divide(divisor).toPlainString();
    }
    
    private String shortenAddress(String address) {
        return address.length() > 10 ? 
            address.substring(0, 6) + "..." + address.substring(address.length() - 4) : 
            address;
    }

    private BigDecimal convertToDecimal(BigInteger value, int decimals) {
        if (value == null || value.equals(BigInteger.ZERO)) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal divisor = BigDecimal.TEN.pow(decimals);
        BigDecimal rawValue = new BigDecimal(value);
        
        return rawValue.divide(divisor);
    }
    
    private Token createFallbackToken(String contractAddress, BigInteger deploymentBlock) {
        try {
            Token token = new Token();
            token.setContractAddress(contractAddress.toLowerCase());
            token.setName("Unknown Token");
            token.setSymbol("UNKNOWN");
            token.setDecimals(18);
            token.setCreatedBlock(deploymentBlock.longValue());
            token.setTotalSupply(BigDecimal.ZERO);
            
            return tokenRepository.save(token);
            
        } catch (Exception e) {
            log.error("❌ 连备用Token记录也创建失败: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * 获取当前索引状态
     */
    public String getIndexingStatus() {
        return String.format("最后轮询: %s, 最后区块: %s, 代币数量: %d, 转账记录: %d", 
                formatTime(lastPollTime), 
                lastPollBlock,
                tokenRepository.count(), 
                transferRepository.count());
    }
    
    /**
     * 手动触发历史数据索引（保留原有功能）
     */
    public void indexHistoricalTransfers(BigInteger fromBlock, BigInteger toBlock) {
        processBlockRange(fromBlock, toBlock);
    }
    
    /**
     * 格式化时间显示
     */
    private String formatTime(long timestamp) {
        return new SimpleDateFormat("MM-dd HH:mm:ss").format(new java.util.Date(timestamp));
    }
    
    /**
     * 区块范围内部类
     */
    private static class BlockRange {
        final BigInteger fromBlock;
        final BigInteger toBlock;
        
        BlockRange(BigInteger fromBlock, BigInteger toBlock) {
            this.fromBlock = fromBlock;
            this.toBlock = toBlock;
        }
    }
}