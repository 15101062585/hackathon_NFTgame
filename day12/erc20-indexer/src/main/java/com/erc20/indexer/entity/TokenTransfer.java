package com.erc20.indexer.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;




@Entity
@Table(name = "token_transfers")

public class TokenTransfer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "token_id", nullable = false)
    private Token token;
    
    @Column(name = "from_address", nullable = false, length = 42)
    private String fromAddress;
    
    @Column(name = "to_address", nullable = false, length = 42)
    private String toAddress;
    
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal value;
    
    @Column(name = "transaction_hash", nullable = false, length = 66)
    private String transactionHash;
    
    @Column(name = "block_number", nullable = false)
    private Long blockNumber;
    
    @Column(name = "transaction_index", nullable = false)
    private Integer transactionIndex;
    
    @Column(name = "log_index", nullable = false)
    private Integer logIndex;
    
    @Column(nullable = false)
    private Long timestamp;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * 获取ID
     * @return ID
     */
    public Long getId() {
        return id;
    }

    /**
     * 设置ID
     * @param id ID值
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * 获取Token对象
     * @return Token对象
     */
    public Token getToken() {
        return token;
    }

    /**
     * 设置Token对象
     * @param token Token对象
     */
    public void setToken(Token token) {
        this.token = token;
    }

    /**
     * 获取转出地址
     * @return 转出地址
     */
    public String getFromAddress() {
        return fromAddress;
    }

    /**
     * 设置转出地址
     * @param fromAddress 转出地址值
     */
    public void setFromAddress(String fromAddress) {
        this.fromAddress = fromAddress;
    }

    /**
     * 获取转入地址
     * @return 转入地址
     */
    public String getToAddress() {
        return toAddress;
    }

    /**
     * 设置转入地址
     * @param toAddress 转入地址值
     */
    public void setToAddress(String toAddress) {
        this.toAddress = toAddress;
    }

    /**
     * 获取转账金额
     * @return 转账金额
     */
    public BigDecimal getValue() {
        return value;
    }

    /**
     * 设置转账金额
     * @param value 转账金额值
     */
    public void setValue(BigDecimal value) {
        this.value = value;
    }

    /**
     * 获取交易哈希
     * @return 交易哈希
     */
    public String getTransactionHash() {
        return transactionHash;
    }

    /**
     * 设置交易哈希
     * @param transactionHash 交易哈希值
     */
    public void setTransactionHash(String transactionHash) {
        this.transactionHash = transactionHash;
    }

    /**
     * 获取区块号
     * @return 区块号
     */
    public Long getBlockNumber() {
        return blockNumber;
    }

    /**
     * 设置区块号
     * @param blockNumber 区块号值
     */
    public void setBlockNumber(Long blockNumber) {
        this.blockNumber = blockNumber;
    }

    /**
     * 获取交易索引
     * @return 交易索引
     */
    public Integer getTransactionIndex() {
        return transactionIndex;
    }

    /**
     * 设置交易索引
     * @param transactionIndex 交易索引值
     */
    public void setTransactionIndex(Integer transactionIndex) {
        this.transactionIndex = transactionIndex;
    }

    /**
     * 获取日志索引
     * @return 日志索引
     */
    public Integer getLogIndex() {
        return logIndex;
    }

    /**
     * 设置日志索引
     * @param logIndex 日志索引值
     */
    public void setLogIndex(Integer logIndex) {
        this.logIndex = logIndex;
    }

    /**
     * 获取时间戳
     * @return 时间戳
     */
    public Long getTimestamp() {
        return timestamp;
    }

    /**
     * 设置时间戳
     * @param timestamp 时间戳值
     */
    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }

    /**
     * 获取创建时间
     * @return 创建时间
     */
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * 设置创建时间
     * @param createdAt 创建时间值
     */
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

}