package com.erc20.indexer.whitelist.controller;

import com.erc20.indexer.whitelist.dto.WhitelistRequest;
import com.erc20.indexer.whitelist.dto.WhitelistResponse;
import com.erc20.indexer.whitelist.service.Web3jService;
import com.erc20.indexer.whitelist.service.WhitelistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/whitelist")
public class WhitelistController {
    
    private final WhitelistService whitelistService;
    
    @Autowired
    public WhitelistController(WhitelistService whitelistService) {
        this.whitelistService = whitelistService;
    }
    @Autowired
    private Web3jService web3jService;


    /**
     * 核心接口：获取部署合约所需的签名者地址
     * GET /api/address/signer
     */
    @GetMapping("/signer")
    public Map<String, Object> getSignerAddress() {
        Map<String, Object> result = new HashMap<>();
        
        String signerAddress = web3jService.getSignerAddress();
        BigInteger chainId = web3jService.getChainId();
        
        result.put("success", true);
        result.put("signerAddress", signerAddress);
        result.put("chainId", chainId);
        result.put("network", getNetworkName(chainId));
        result.put("message", "部署 NFTMarket 合约时，请将 whitelistSigner 参数设置为这个地址");
        
        return result;
    }

    /**
     * 验证地址格式
     * GET /api/address/validate/{address}
     */
    @GetMapping("/validate/{address}")
    public Map<String, Object> validateAddress(@PathVariable String address) {
        Map<String, Object> result = new HashMap<>();
        
        boolean isValid = web3jService.isValidAddress(address);
        
        result.put("success", true);
        result.put("address", address);
        result.put("isValid", isValid);
        result.put("message", isValid ? "地址格式正确" : "地址格式错误");
        
        return result;
    }

    private String getNetworkName(BigInteger chainId) {
        switch (chainId.intValue()) {
            case 1: return "Ethereum Mainnet";
            case 5: return "Goerli Testnet";
            case 11155111: return "Sepolia Testnet";
            case 31337: return "Hardhat Local";
            default: return "Unknown Network";
        }
    }
    
    @PostMapping("/generate")
    public Map<String, Object> generateWhitelist(@RequestBody WhitelistRequest request) {
        try {
            WhitelistResponse response = whitelistService.generateWhitelistSignature(request);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "白名单签名生成成功");
            result.put("data", response);
            return result;
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "生成失败: " + e.getMessage());
            return error;
        }
    }
    
    @GetMapping("/user/{userAddress}")
    public Map<String, Object> getUserWhitelists(@PathVariable String userAddress) {
        try {
            List<WhitelistResponse> whitelists = whitelistService.getUserWhitelists(userAddress);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "获取用户白名单成功");
            result.put("data", whitelists.isEmpty() ? null : whitelists.get(0));
            result.put("count", whitelists.size());
            return result;
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "获取失败: " + e.getMessage());
            return error;
        }
    }
}