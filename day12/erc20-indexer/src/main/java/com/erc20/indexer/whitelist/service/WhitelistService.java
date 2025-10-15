package com.erc20.indexer.whitelist.service;

import com.erc20.indexer.whitelist.dto.WhitelistRequest;
import com.erc20.indexer.whitelist.dto.WhitelistResponse;
import com.erc20.indexer.whitelist.entity.WhitelistSignature;
import com.erc20.indexer.whitelist.repository.WhitelistSignatureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Hash;
import org.web3j.utils.Numeric;
import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WhitelistService {

    private final WhitelistSignatureRepository whitelistRepository;
    private final Web3jService web3jService;
    private final SecureRandom secureRandom;

    // 合约配置 - 确保与部署的合约完全一致
    private static final String CONTRACT_ADDRESS = "0x8b5B47164323d2B276dBe0f8026768A84798A9eb";
    private static final long CHAIN_ID = 11155111L; // Sepolia testnet

    @Autowired
    public WhitelistService(WhitelistSignatureRepository whitelistRepository,
            Web3jService web3jService) {
        this.whitelistRepository = whitelistRepository;
        this.web3jService = web3jService;
        this.secureRandom = new SecureRandom();
        System.out.println("✅ WhitelistService 初始化完成");
    }

    // 添加nonce使用记录（防止重放攻击）
    public void recordNonceUsage(BigInteger nonce) {
        // 可以简单记录到缓存或单独的nonce表
        // 这里示例使用一个简单的存储
        WhitelistSignature usageRecord = new WhitelistSignature();
        usageRecord.setNonce(nonce);
        usageRecord.setIsUsed(true);
        usageRecord.setCreatedAt(new java.util.Date());
        whitelistRepository.save(usageRecord);

        System.out.println("📝 记录Nonce使用: " + nonce);
    }

    /**
     * 最简单的nonce生成 - 直接用时间戳 + 随机数
     */
    private BigInteger generateUniqueNonce() {
        long timestamp = System.currentTimeMillis();
        int random = secureRandom.nextInt(1000000);
        return BigInteger.valueOf(timestamp).multiply(BigInteger.valueOf(1000000)).add(BigInteger.valueOf(random));
    }

    public WhitelistResponse generateWhitelistSignature(WhitelistRequest request) {
        // 生成唯一nonce
        BigInteger nonce = generateUniqueNonce();

        // 创建临时实体（不保存到数据库）
        WhitelistSignature tempEntity = new WhitelistSignature();
        tempEntity.setUserAddress(request.getUserAddress().toLowerCase());
        tempEntity.setNftId(request.getNftId());
        tempEntity.setMaxPrice(request.getMaxPrice() != null ? request.getMaxPrice()
                : new BigInteger("200000000000000000"));
        tempEntity.setDeadline(request.getDeadline() != null ? request.getDeadline()
                : BigInteger.valueOf(System.currentTimeMillis() / 1000 + 3600));
        tempEntity.setNonce(nonce.toString());
        tempEntity.setSignerAddress(web3jService.getSignerAddress().toLowerCase());
        tempEntity.setTierLevel(request.getTierLevel());
        tempEntity.setIsUsed(false);

        // 生成签名
        String signature = generateEIP712SignatureFixed(tempEntity);

        // 直接返回，不保存到数据库
        WhitelistResponse response = new WhitelistResponse();
        response.setUserAddress(tempEntity.getUserAddress());
        response.setNftId(tempEntity.getNftId());
        response.setMaxPrice(tempEntity.getMaxPrice());
        response.setDeadline(tempEntity.getDeadline());
        response.setNonce(tempEntity.getNonce());
        response.setSignature(signature);
        response.setSignerAddress(tempEntity.getSignerAddress());
        response.setTierLevel(tempEntity.getTierLevel());
        response.setIsUsed(false);

        return response;
    }

    /**
     * 修复版 EIP-712 签名生成 - 完全匹配合约计算逻辑
     */
    private String generateEIP712SignatureFixed(WhitelistSignature entity) {
        try {
            System.out.println("=== 🔧 修复版 EIP-712 签名生成 ===");
            System.out.println("参数: user=" + entity.getUserAddress() +
                    ", nftId=" + entity.getNftId() +
                    ", maxPrice=" + entity.getMaxPrice() +
                    ", deadline=" + entity.getDeadline() +
                    ", nonce=" + entity.getNonce());

            // 1. 计算 WHITELIST_TYPEHASH
            String whitelistTypeString = "Whitelist(address user,uint256 nftId,uint256 maxPrice,uint256 deadline,uint256 nonce)";
            byte[] whitelistTypeHash = keccak256(whitelistTypeString.getBytes(StandardCharsets.UTF_8));
            System.out.println("WHITELIST_TYPEHASH: " + Numeric.toHexString(whitelistTypeHash));

            // 2. 计算 DOMAIN_SEPARATOR - 完全匹配合约
            byte[] domainSeparator = calculateDomainSeparatorExact();
            System.out.println("DOMAIN_SEPARATOR: " + Numeric.toHexString(domainSeparator));

            // 3. 计算结构体哈希 - 完全匹配合约
            byte[] structHash = calculateStructHashExact(whitelistTypeHash, entity);
            System.out.println("STRUCT_HASH: " + Numeric.toHexString(structHash));

            // 4. 计算完整摘要 - 完全匹配合约
            byte[] digest = calculateDigestExact(domainSeparator, structHash);
            System.out.println("DIGEST: " + Numeric.toHexString(digest));

            // 5. 生成签名
            org.web3j.crypto.Sign.SignatureData signatureData = org.web3j.crypto.Sign.signMessage(
                    digest, web3jService.getCredentials().getEcKeyPair(), false);

            byte[] signatureBytes = new byte[65];
            System.arraycopy(signatureData.getR(), 0, signatureBytes, 0, 32);
            System.arraycopy(signatureData.getS(), 0, signatureBytes, 32, 32);
            signatureBytes[64] = signatureData.getV()[0];

            String finalSignature = Numeric.toHexString(signatureBytes);
            System.out.println("最终签名: " + finalSignature);
            System.out.println("签名者地址: " + web3jService.getSignerAddress());
            System.out.println("=== ✅ 签名生成完成 ===");

            return finalSignature;

        } catch (Exception e) {
            System.err.println("❌ EIP-712 签名失败: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("EIP-712 签名失败: " + e.getMessage(), e);
        }
    }

    /**
     * 完全匹配合约的 DOMAIN_SEPARATOR 计算
     * 对应合约中的：
     * keccak256(abi.encode(
     * keccak256("EIP712Domain(string name,string version,uint256 chainId,address
     * verifyingContract)"),
     * keccak256("NFTMarket"),
     * keccak256("1"),
     * block.chainid,
     * address(this)
     * ))
     */
    private byte[] calculateDomainSeparatorExact() throws Exception {
        // 1. EIP712Domain type hash
        String domainTypeString = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
        byte[] domainTypeHash = keccak256(domainTypeString.getBytes(StandardCharsets.UTF_8));

        // 2. name hash
        byte[] nameHash = keccak256("NFTMarket".getBytes(StandardCharsets.UTF_8));

        // 3. version hash
        byte[] versionHash = keccak256("1".getBytes(StandardCharsets.UTF_8));

        // 4. chainId (uint256)
        byte[] chainIdBytes = toUint256Bytes(BigInteger.valueOf(CHAIN_ID));

        // 5. contractAddress (address) - 注意：address在abi.encode中会填充到32字节
        byte[] addressBytes = toAddressBytes(CONTRACT_ADDRESS);

        // 6. 模拟 abi.encode - 关键步骤！
        ByteArrayOutputStream encodeStream = new ByteArrayOutputStream();

        // 编码顺序必须与合约完全一致：
        encodeStream.write(domainTypeHash); // bytes32
        encodeStream.write(nameHash); // bytes32
        encodeStream.write(versionHash); // bytes32
        encodeStream.write(chainIdBytes); // uint256 (32 bytes)
        encodeStream.write(addressBytes); // address (左填充12字节0到32字节)

        byte[] encodedData = encodeStream.toByteArray();

        // 7. 计算keccak256哈希
        return keccak256(encodedData);
    }

    /**
     * 完全匹配合约的结构体哈希计算
     * 对应合约中的：
     * keccak256(abi.encode(
     * WHITELIST_TYPEHASH,
     * _user,
     * _nftId,
     * _maxPrice,
     * _deadline,
     * _nonce
     * ))
     */
    private byte[] calculateStructHashExact(byte[] whitelistTypeHash, WhitelistSignature entity) throws Exception {
        ByteArrayOutputStream encodeStream = new ByteArrayOutputStream();

        // 编码顺序必须与合约完全一致：
        encodeStream.write(whitelistTypeHash); // bytes32
        encodeStream.write(toAddressBytes(entity.getUserAddress())); // address (左填充)
        encodeStream.write(toUint256Bytes(entity.getNftId())); // uint256
        encodeStream.write(toUint256Bytes(entity.getMaxPrice())); // uint256
        encodeStream.write(toUint256Bytes(entity.getDeadline())); // uint256
        // 使用BigInteger进行编码
        BigInteger nonceValue = new BigInteger(entity.getNonce());
        encodeStream.write(toUint256Bytes(nonceValue)); // uint256

        byte[] encodedData = encodeStream.toByteArray();
        
        return keccak256(encodedData);
    }

    /**
     * 完全匹配合约的摘要计算
     * 对应合约中的：
     * keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash))
     */
    private byte[] calculateDigestExact(byte[] domainSeparator, byte[] structHash) throws Exception {
        ByteArrayOutputStream digestStream = new ByteArrayOutputStream();

        digestStream.write(new byte[] { 0x19, 0x01 }); // "\x19\x01"
        digestStream.write(domainSeparator); // bytes32
        digestStream.write(structHash); // bytes32

        return keccak256(digestStream.toByteArray());
    }

    /**
     * uint256 编码 (32字节大端序)
     */
    private byte[] toUint256Bytes(BigInteger value) {
        byte[] bytes = value.toByteArray();
        byte[] result = new byte[32];

        if (bytes.length > 32) {
            // 如果字节数超过32，取最后32字节
            System.arraycopy(bytes, bytes.length - 32, result, 0, 32);
        } else {
            // 如果字节数不足32，在左侧填充0
            System.arraycopy(bytes, 0, result, 32 - bytes.length, bytes.length);
        }
        return result;
    }

    /**
     * address 编码 (左填充12字节0到32字节)
     */
    private byte[] toAddressBytes(String address) {
        String cleanAddr = address.startsWith("0x") ? address.substring(2) : address;
        cleanAddr = cleanAddr.toLowerCase();

        byte[] result = new byte[32];
        byte[] addrBytes = Numeric.hexStringToByteArray(cleanAddr);

        // address在左侧填充12字节的0 (12 + 20 = 32)
        System.arraycopy(addrBytes, 0, result, 12, addrBytes.length);
        return result;
    }

    /**
     * keccak256 哈希
     */
    private byte[] keccak256(byte[] input) {
        return Hash.sha3(input);
    }

    // 标记签名已使用
    public void markSignatureAsUsed(Long signatureId) {
        whitelistRepository.findById(signatureId).ifPresent(signature -> {
            signature.setIsUsed(true);
            whitelistRepository.save(signature);
            System.out.println("✅ 标记签名已使用，ID: " + signatureId);
        });
    }

    // 标记签名已使用（通过nonce）
    public void markSignatureAsUsedByNonce(BigInteger nonce) {
        whitelistRepository.findByNonce(nonce).ifPresent(signature -> {
            signature.setIsUsed(true);
            whitelistRepository.save(signature);
            System.out.println("✅ 标记签名已使用，Nonce: " + nonce);
        });
    }

    /**
     * 验证签名格式是否正确
     */
    public boolean isValidSignatureFormat(String signature) {
        if (signature == null || !signature.startsWith("0x")) {
            return false;
        }

        // 移除0x前缀后应该是128个字符 (64字节)
        String cleanSignature = signature.substring(2);
        if (cleanSignature.length() != 128) {
            return false;
        }

        // 检查是否只包含十六进制字符
        return cleanSignature.matches("[0-9a-fA-F]+");
    }

    // 修复查询方法 - 只查询特定用户的未使用签名
    public List<WhitelistResponse> getUserWhitelists(String userAddress) {
        return whitelistRepository.findByUserAddressAndIsUsedFalse(userAddress.toLowerCase())
                .stream()
                .map(this::buildWhitelistResponse)
                .collect(Collectors.toList());
    }

    // 添加新的查询方法 - 按用户和NFT查询有效签名
    public WhitelistResponse getValidWhitelist(String userAddress, BigInteger nftId) {
        return whitelistRepository
                .findByUserAddressAndNftIdAndIsUsedFalseAndDeadlineGreaterThanEqual(
                        userAddress.toLowerCase(),
                        nftId,
                        BigInteger.valueOf(System.currentTimeMillis() / 1000))
                .stream()
                .findFirst()
                .map(this::buildWhitelistResponse)
                .orElse(null);
    }

    private WhitelistResponse buildWhitelistResponse(WhitelistSignature entity) {
        WhitelistResponse response = new WhitelistResponse();
        response.setId(entity.getId());
        response.setUserAddress(entity.getUserAddress());
        response.setNftId(entity.getNftId());
        response.setMaxPrice(entity.getMaxPrice());
        response.setDeadline(entity.getDeadline());
        response.setNonce(entity.getNonce());
        response.setSignature(entity.getSignature());
        response.setSignerAddress(entity.getSignerAddress());
        response.setTierLevel(entity.getTierLevel());
        response.setIsUsed(entity.getIsUsed());
        response.setCreatedAt(entity.getCreatedAt());
        return response;
    }

    /**
     * 调试方法 - 用于验证签名计算是否正确
     */
    public void debugSignature(WhitelistRequest request) {
        try {
            System.out.println("=== 🐛 签名调试模式 ===");

            // 创建临时实体用于调试
            WhitelistSignature debugEntity = new WhitelistSignature();
            debugEntity.setUserAddress(request.getUserAddress().toLowerCase());
            debugEntity.setNftId(request.getNftId());
            debugEntity.setMaxPrice(request.getMaxPrice() != null ? request.getMaxPrice()
                    : new BigInteger("200000000000000000"));
            debugEntity.setDeadline(request.getDeadline() != null ? request.getDeadline()
                    : BigInteger.valueOf(System.currentTimeMillis() / 1000 + 3600));
            debugEntity.setNonce(BigInteger.valueOf(123456789L)); // 固定nonce便于调试

            // 生成签名但不保存
            generateEIP712SignatureFixed(debugEntity);

        } catch (Exception e) {
            System.err.println("❌ 调试失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
}