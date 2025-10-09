package com.erc20.indexer.service;

import com.erc20.indexer.entity.TokenTransfer;
import com.erc20.indexer.entity.UserTransferDTO;
import com.erc20.indexer.repository.TokenTransferRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

import com.erc20.indexer.entity.ApiResponse; 
import com.erc20.indexer.entity.UserTransferStatsDTO;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Optional;  // 添加缺失的导入语句
import java.util.Comparator; // 添加缺失的导入语句

@Service
@Slf4j
public class UserTransferService {
    
    @Autowired
    private TokenTransferRepository transferRepository;
    
    /**
     * 获取用户的所有转账记录
     */
    public ApiResponse<List<UserTransferDTO>> getUserTransfers(String userAddress) {
        try {
            log.info("查询用户 {} 的转账记录", userAddress);
            
            List<TokenTransfer> transfers = transferRepository.findByUserAddress(userAddress.toLowerCase());
            
            List<UserTransferDTO> transferDTOs = transfers.stream()
                    .map(transfer -> new UserTransferDTO(transfer, userAddress.toLowerCase()))
                    .collect(Collectors.toList());
            
            String message = String.format("找到 %d 条转账记录", transferDTOs.size());
            return ApiResponse.success(message, transferDTOs);
            
        } catch (Exception e) {
            log.error("查询用户转账记录失败: {}", e.getMessage());
            return ApiResponse.error("查询失败: " + e.getMessage());
        }
    }
    
    /**
     * 分页查询用户转账记录 - 修复版本
     */
    public ApiResponse<Map<String, Object>> getUserTransfersWithPagination(
            String userAddress, int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
            Page<TokenTransfer> transferPage = transferRepository.findByUserAddressWithPagination(
                    userAddress.toLowerCase(), pageable);
            
            List<UserTransferDTO> transferDTOs = transferPage.getContent().stream()
                    .map(transfer -> new UserTransferDTO(transfer, userAddress.toLowerCase()))
                    .collect(Collectors.toList());
            
            Map<String, Object> result = new HashMap<>();
            result.put("transfers", transferDTOs);
            result.put("currentPage", transferPage.getNumber());
            result.put("totalPages", transferPage.getTotalPages());
            result.put("totalItems", transferPage.getTotalElements());
            result.put("pageSize", size);
            result.put("hasNext", transferPage.hasNext());
            result.put("hasPrevious", transferPage.hasPrevious());
            
            return ApiResponse.success("查询成功", result);
            
        } catch (Exception e) {
            log.error("分页查询用户转账记录失败: {}", e.getMessage());
            return ApiResponse.error("查询失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取用户转账统计
     */
    public ApiResponse<UserTransferStatsDTO> getUserTransferStats(String userAddress) {
        try {
            userAddress = userAddress.toLowerCase();
            
            // 获取用户所有转账记录
            List<TokenTransfer> transfers = transferRepository.findByUserAddress(userAddress);
            
            UserTransferStatsDTO stats = calculateTransferStats(transfers, userAddress);
            
            return ApiResponse.success("统计查询成功", stats);
            
        } catch (Exception e) {
            log.error("查询用户转账统计失败: {}", e.getMessage());
            return ApiResponse.error("统计查询失败: " + e.getMessage());
        }
    }
    
    /**
     * 根据交易哈希查询特定转账记录
     */
    public ApiResponse<UserTransferDTO> getTransferByHash(String transactionHash, String userAddress) {
        try {
            Optional<TokenTransfer> transferOpt = transferRepository.findByTransactionHash(transactionHash);
            
            if (transferOpt.isPresent()) {
                TokenTransfer transfer = transferOpt.get();
                // 验证该转账记录是否属于该用户
                if (isUserInvolvedInTransfer(transfer, userAddress)) {
                    UserTransferDTO dto = new UserTransferDTO(transfer, userAddress.toLowerCase());
                    return ApiResponse.success("查询成功", dto);
                } else {
                    return ApiResponse.error("该转账记录不属于指定用户");
                }
            } else {
                return ApiResponse.error("未找到对应的转账记录");
            }
            
        } catch (Exception e) {
            log.error("查询转账记录失败: {}", e.getMessage());
            return ApiResponse.error("查询失败: " + e.getMessage());
        }
    }
    
    /**
     * 分页查询用户收到的转账
     */
    public ApiResponse<Map<String, Object>> getIncomingTransfersWithPagination(
            String userAddress, int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
            Page<TokenTransfer> transferPage = transferRepository.findIncomingTransfersWithPagination(
                    userAddress.toLowerCase(), pageable);
            
            List<UserTransferDTO> transferDTOs = transferPage.getContent().stream()
                    .map(transfer -> new UserTransferDTO(transfer, userAddress.toLowerCase()))
                    .collect(Collectors.toList());
            
            Map<String, Object> result = new HashMap<>();
            result.put("transfers", transferDTOs);
            result.put("currentPage", transferPage.getNumber());
            result.put("totalPages", transferPage.getTotalPages());
            result.put("totalItems", transferPage.getTotalElements());
            result.put("pageSize", size);
            result.put("hasNext", transferPage.hasNext());
            result.put("hasPrevious", transferPage.hasPrevious());
            
            return ApiResponse.success("查询成功", result);
            
        } catch (Exception e) {
            log.error("分页查询用户收到的转账失败: {}", e.getMessage());
            return ApiResponse.error("查询失败: " + e.getMessage());
        }
    }
    
    /**
     * 分页查询用户发送的转账
     */
    public ApiResponse<Map<String, Object>> getOutgoingTransfersWithPagination(
            String userAddress, int page, int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
            Page<TokenTransfer> transferPage = transferRepository.findOutgoingTransfersWithPagination(
                    userAddress.toLowerCase(), pageable);
            
            List<UserTransferDTO> transferDTOs = transferPage.getContent().stream()
                    .map(transfer -> new UserTransferDTO(transfer, userAddress.toLowerCase()))
                    .collect(Collectors.toList());
            
            Map<String, Object> result = new HashMap<>();
            result.put("transfers", transferDTOs);
            result.put("currentPage", transferPage.getNumber());
            result.put("totalPages", transferPage.getTotalPages());
            result.put("totalItems", transferPage.getTotalElements());
            result.put("pageSize", size);
            result.put("hasNext", transferPage.hasNext());
            result.put("hasPrevious", transferPage.hasPrevious());
            
            return ApiResponse.success("查询成功", result);
            
        } catch (Exception e) {
            log.error("分页查询用户发送的转账失败: {}", e.getMessage());
            return ApiResponse.error("查询失败: " + e.getMessage());
        }
    }
    
    /**
     * 计算转账统计信息
     */
    private UserTransferStatsDTO calculateTransferStats(List<TokenTransfer> transfers, String userAddress) {
        UserTransferStatsDTO stats = new UserTransferStatsDTO();
        stats.setUserAddress(userAddress);
        
        long incoming = 0;
        long outgoing = 0;
        BigDecimal totalReceived = BigDecimal.ZERO;
        BigDecimal totalSent = BigDecimal.ZERO;
        
        Map<String, UserTransferStatsDTO.TokenStatsDTO> tokenStatsMap = new HashMap<>();
        
        for (TokenTransfer transfer : transfers) {
            // 统计方向
            if (userAddress.equalsIgnoreCase(transfer.getToAddress())) {
                incoming++;
                totalReceived = totalReceived.add(transfer.getValue());
            } else if (userAddress.equalsIgnoreCase(transfer.getFromAddress())) {
                outgoing++;
                totalSent = totalSent.add(transfer.getValue());
            }
            
            // 按代币统计
            if (transfer.getToken() != null) {
                String tokenKey = transfer.getToken().getContractAddress();
                UserTransferStatsDTO.TokenStatsDTO tokenStats = tokenStatsMap.getOrDefault(tokenKey, 
                        new UserTransferStatsDTO.TokenStatsDTO());
                
                tokenStats.setTokenSymbol(transfer.getToken().getSymbol());
                tokenStats.setTokenAddress(transfer.getToken().getContractAddress());
                tokenStats.setTransferCount(tokenStats.getTransferCount() != null ? 
                        tokenStats.getTransferCount() + 1 : 1L);
                
                if (userAddress.equalsIgnoreCase(transfer.getToAddress())) {
                    tokenStats.setTotalReceived(
                            tokenStats.getTotalReceived() != null ? 
                            tokenStats.getTotalReceived().add(transfer.getValue()) : 
                            transfer.getValue()
                    );
                } else {
                    tokenStats.setTotalSent(
                            tokenStats.getTotalSent() != null ? 
                            tokenStats.getTotalSent().add(transfer.getValue()) : 
                            transfer.getValue()
                    );
                }
                
                tokenStatsMap.put(tokenKey, tokenStats);
            }
        }
        
        stats.setTotalTransfers((long) transfers.size());
        stats.setIncomingTransfers(incoming);
        stats.setOutgoingTransfers(outgoing);
        stats.setTotalReceived(totalReceived);
        stats.setTotalSent(totalSent);
        // 添加 java.util.ArrayList 导入后该问题已解决，此处使用全限定类名临时修复
        stats.setTokenStats(new java.util.ArrayList<>(tokenStatsMap.values()));
        
        // 设置首次和最后转账时间
        if (!transfers.isEmpty()) {
            transfers.sort(Comparator.comparing(TokenTransfer::getTimestamp));
            stats.setFirstTransferTime(formatTimestamp(transfers.get(0).getTimestamp()));
            stats.setLastTransferTime(formatTimestamp(transfers.get(transfers.size() - 1).getTimestamp()));
        }
        
        return stats;
    }
    
    private boolean isUserInvolvedInTransfer(TokenTransfer transfer, String userAddress) {
        return userAddress.equalsIgnoreCase(transfer.getFromAddress()) || 
               userAddress.equalsIgnoreCase(transfer.getToAddress());
    }
    
    private String formatTimestamp(Long timestamp) {
        if (timestamp == null) return "未知";
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(timestamp * 1000));
    }
}