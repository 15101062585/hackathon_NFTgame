package com.erc20.indexer.repository;

import com.erc20.indexer.entity.TokenTransfer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional; // 添加缺失的导入语句




@Repository
public interface TokenTransferRepository extends JpaRepository<TokenTransfer, Long> {
    /**
     * 查询用户参与的所有转账记录（作为发送方或接收方）
     */
    @Query("SELECT tt FROM TokenTransfer tt JOIN FETCH tt.token WHERE LOWER(tt.fromAddress) = LOWER(:userAddress) OR LOWER(tt.toAddress) = LOWER(:userAddress) ORDER BY tt.timestamp DESC")
    List<TokenTransfer> findByUserAddress(@Param("userAddress") String userAddress);
    
    /**
     * 分页查询用户转账记录 - 修复版本
     */
    @Query(value = "SELECT tt FROM TokenTransfer tt JOIN FETCH tt.token WHERE LOWER(tt.fromAddress) = LOWER(:userAddress) OR LOWER(tt.toAddress) = LOWER(:userAddress)",
           countQuery = "SELECT COUNT(tt) FROM TokenTransfer tt WHERE LOWER(tt.fromAddress) = LOWER(:userAddress) OR LOWER(tt.toAddress) = LOWER(:userAddress)")
    Page<TokenTransfer> findByUserAddressWithPagination(@Param("userAddress") String userAddress, Pageable pageable);
    
    /**
     * 根据交易哈希查询
     */
    Optional<TokenTransfer> findByTransactionHash(String transactionHash);
    
    /**
     * 查询用户作为接收方的记录
     */
    @Query("SELECT tt FROM TokenTransfer tt JOIN FETCH tt.token WHERE LOWER(tt.toAddress) = LOWER(:userAddress) ORDER BY tt.timestamp DESC")
    List<TokenTransfer> findIncomingTransfers(@Param("userAddress") String userAddress);
    
    /**
     * 查询用户作为发送方的记录
     */
    @Query("SELECT tt FROM TokenTransfer tt JOIN FETCH tt.token WHERE LOWER(tt.fromAddress) = LOWER(:userAddress) ORDER BY tt.timestamp DESC")
    List<TokenTransfer> findOutgoingTransfers(@Param("userAddress") String userAddress);
    
    /**
     * 分页查询用户收到的转账
     */
    @Query(value = "SELECT tt FROM TokenTransfer tt JOIN FETCH tt.token WHERE LOWER(tt.toAddress) = LOWER(:userAddress)",
           countQuery = "SELECT COUNT(tt) FROM TokenTransfer tt WHERE LOWER(tt.toAddress) = LOWER(:userAddress)")
    Page<TokenTransfer> findIncomingTransfersWithPagination(@Param("userAddress") String userAddress, Pageable pageable);
    
    /**
     * 分页查询用户发送的转账
     */
    @Query(value = "SELECT tt FROM TokenTransfer tt JOIN FETCH tt.token WHERE LOWER(tt.fromAddress) = LOWER(:userAddress)",
           countQuery = "SELECT COUNT(tt) FROM TokenTransfer tt WHERE LOWER(tt.fromAddress) = LOWER(:userAddress)")
    Page<TokenTransfer> findOutgoingTransfersWithPagination(@Param("userAddress") String userAddress, Pageable pageable);
}