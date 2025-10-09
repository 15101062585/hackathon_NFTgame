package com.erc20.indexer.controller;

import com.erc20.indexer.entity.Token;
import com.erc20.indexer.entity.TokenTransfer;
import com.erc20.indexer.service.EventIndexingService;
import com.erc20.indexer.service.UserTransferService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.erc20.indexer.entity.ApiResponse; // 假设 ApiResponse 类在该包路径下，可按需调整
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferController {

    @Autowired
    private UserTransferService userTransferService;


    /**
     * 获取用户所有转账记录
     */
    @GetMapping("/{address}/transfers")
    public ApiResponse<?> getUserTransfers(@PathVariable String address) {
        return userTransferService.getUserTransfers(address);
    }

    /**
     * 分页获取用户转账记录
     */
    @GetMapping("/{address}/transfers/page")
    public ApiResponse<?> getUserTransfersWithPagination(
            @PathVariable String address,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userTransferService.getUserTransfersWithPagination(address, page, size);
    }

    /**
     * 获取用户转账统计
     */
    @GetMapping("/{address}/stats")
    public ApiResponse<?> getUserTransferStats(@PathVariable String address) {
        return userTransferService.getUserTransferStats(address);
    }

    /**
     * 根据交易哈希查询特定转账
     */
    @GetMapping("/{address}/transfer/{txHash}")
    public ApiResponse<?> getTransferByHash(
            @PathVariable String address,
            @PathVariable String txHash) {
        return userTransferService.getTransferByHash(txHash, address);
    }

    /**
     * 分页获取用户收到的转账
     */
    @GetMapping("/{address}/transfers/incoming/page")
    public ApiResponse<?> getIncomingTransfersWithPagination(
            @PathVariable String address,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userTransferService.getIncomingTransfersWithPagination(address, page, size);
    }

    /**
     * 分页获取用户发送的转账
     */
    @GetMapping("/{address}/transfers/outgoing/page")
    public ApiResponse<?> getOutgoingTransfersWithPagination(
            @PathVariable String address,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userTransferService.getOutgoingTransfersWithPagination(address, page, size);
    }

    /**
     * 获取用户收到的转账（全部）
     */
    @GetMapping("/{address}/transfers/incoming")
    public ApiResponse<?> getIncomingTransfers(@PathVariable String address) {
        try {
            // 这里可以调用非分页版本的方法
            return ApiResponse.success("请使用分页接口 /{address}/transfers/incoming/page");
        } catch (Exception e) {
            return ApiResponse.error("查询失败: " + e.getMessage());
        }
    }

    /**
     * 获取用户发送的转账（全部）
     */
    @GetMapping("/{address}/transfers/outgoing")
    public ApiResponse<?> getOutgoingTransfers(@PathVariable String address) {
        try {
            // 这里可以调用非分页版本的方法
            return ApiResponse.success("请使用分页接口 /{address}/transfers/outgoing/page");
        } catch (Exception e) {
            return ApiResponse.error("查询失败: " + e.getMessage());
        }
    }
}