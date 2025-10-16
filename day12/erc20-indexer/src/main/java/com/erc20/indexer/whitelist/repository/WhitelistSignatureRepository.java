package com.erc20.indexer.whitelist.repository;

import com.erc20.indexer.whitelist.entity.WhitelistSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;

@Repository
public interface WhitelistSignatureRepository extends JpaRepository<WhitelistSignature, Long> {
    
    // 根据用户地址和nonce查找
    Optional<WhitelistSignature> findByUserAddressAndNonce(String userAddress, BigInteger nonce);
    
    // 查找用户有效的白名单签名
    @Query("SELECT w FROM WhitelistSignature w WHERE w.userAddress = :userAddress " +
           "AND w.deadline > :currentTime AND w.isUsed = false")
    List<WhitelistSignature> findValidSignaturesByUser(
        @Param("userAddress") String userAddress, 
        @Param("currentTime") BigInteger currentTime
    );
    
    // 查找特定NFT的有效白名单
    @Query("SELECT w FROM WhitelistSignature w WHERE w.nftId = :nftId " +
           "AND w.deadline > :currentTime AND w.isUsed = false")
    List<WhitelistSignature> findValidSignaturesByNftId(
        @Param("nftId") BigInteger nftId, 
        @Param("currentTime") BigInteger currentTime
    );
    
    // 检查nonce是否已存在
    boolean existsByNonce(BigInteger nonce);
    
    // 统计用户的白名单数量
    long countByUserAddress(String userAddress);
    
    // 根据等级查找
    List<WhitelistSignature> findByTierLevel(String tierLevel);

    // 查找用户所有未使用的白名单
    List<WhitelistSignature> findByUserAddressAndIsUsedFalse(String userAddress);
    
    // 查找特定NFT的有效白名单
    List<WhitelistSignature> findByUserAddressAndNftIdAndIsUsedFalseAndDeadlineGreaterThanEqual(
        String userAddress, 
        BigInteger nftId, 
        BigInteger deadline
    );
    
   
    
    // 按用户和NFT查找
    List<WhitelistSignature> findByUserAddressAndNftId(String userAddress, BigInteger nftId);
}
