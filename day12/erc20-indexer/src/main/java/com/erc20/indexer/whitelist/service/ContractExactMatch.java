package com.erc20.indexer.whitelist.service;

import org.web3j.crypto.Hash;
import org.web3j.utils.Numeric;
import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;

public class ContractExactMatch {

    public static void main(String[] args) {
        System.out.println("=== 🔍 完全匹配合约的EIP-712验证 ===");
        
        try {
            // 硬编码测试参数
            String userAddress = "0x72012975cbe2ABE27F244cF9315ACf5073467884";
            BigInteger nftId = BigInteger.valueOf(4);
            BigInteger maxPrice = new BigInteger("200000000000000000");
            BigInteger deadline = BigInteger.valueOf(1730000000L);
            BigInteger nonce = BigInteger.valueOf(123456789L);
            
            // 这些必须与合约部署时完全一致！
            String contractAddress = "0x8b5B47164323d2B276dBe0f8026768A84798A9eb";
            long chainId = 11155111L; // Sepolia
            
            System.out.println("🎯 测试参数:");
            System.out.println("userAddress: " + userAddress);
            System.out.println("nftId: " + nftId);
            System.out.println("maxPrice: " + maxPrice);
            System.out.println("deadline: " + deadline);
            System.out.println("nonce: " + nonce);
            System.out.println("contractAddress: " + contractAddress);
            System.out.println("chainId: " + chainId);
            
            // 1. 计算 WHITELIST_TYPEHASH - 完全匹配合约
            System.out.println("\n1. 📝 计算 WHITELIST_TYPEHASH:");
            String whitelistTypeString = "Whitelist(address user,uint256 nftId,uint256 maxPrice,uint256 deadline,uint256 nonce)";
            byte[] whitelistTypeHash = keccak256(whitelistTypeString.getBytes(StandardCharsets.UTF_8));
            System.out.println("WHITELIST_TYPEHASH: " + Numeric.toHexString(whitelistTypeHash));
            
            // 2. 计算 DOMAIN_SEPARATOR - 完全匹配合约的 _initializeDomainSeparator()
            System.out.println("\n2. 🏷️ 计算 DOMAIN_SEPARATOR:");
            byte[] domainSeparator = calculateDomainSeparatorExact(contractAddress, chainId);
            System.out.println("DOMAIN_SEPARATOR: " + Numeric.toHexString(domainSeparator));
            
            // 3. 计算结构体哈希 - 完全匹配合约的 keccak256(abi.encode(...))
            System.out.println("\n3. 🏛️ 计算结构体哈希:");
            byte[] structHash = calculateStructHashExact(whitelistTypeHash, userAddress, nftId, maxPrice, deadline, nonce);
            System.out.println("STRUCT_HASH: " + Numeric.toHexString(structHash));
            
            // 4. 计算完整摘要 - 完全匹配合约的 keccak256(abi.encodePacked(...))
            System.out.println("\n4. 🔑 计算完整摘要:");
            byte[] digest = calculateDigestExact(domainSeparator, structHash);
            System.out.println("DIGEST: " + Numeric.toHexString(digest));
            
            System.out.println("\n=== ✅ 验证结果 ===");
            System.out.println("DOMAIN_SEPARATOR: " + Numeric.toHexString(domainSeparator));
            System.out.println("WHITELIST_TYPEHASH: " + Numeric.toHexString(whitelistTypeHash));
            
            System.out.println("STRUCT_HASH: " + Numeric.toHexString(structHash));
            System.out.println("DIGEST: " + Numeric.toHexString(digest));
            
            // 5. 生成签名（如果需要测试完整流程）
            System.out.println("\n5. ✍️ 生成签名:");
            // 这里需要你的私钥来生成实际签名
            // String signature = generateSignature(digest, privateKey);
            
        } catch (Exception e) {
            System.err.println("❌ 验证失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * 完全匹配合约的 DOMAIN_SEPARATOR 计算
     * 对应合约中的：
     * keccak256(abi.encode(
     *     keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
     *     keccak256("NFTMarket"),
     *     keccak256("1"), 
     *     block.chainid,
     *     address(this)
     * ))
     */
    private static byte[] calculateDomainSeparatorExact(String contractAddress, long chainId) throws Exception {
        System.out.println("🔧 DOMAIN_SEPARATOR 计算详情:");
        
        // 1. EIP712Domain type hash
        String domainTypeString = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";
        byte[] domainTypeHash = keccak256(domainTypeString.getBytes(StandardCharsets.UTF_8));
        System.out.println(" - domainTypeHash: " + Numeric.toHexString(domainTypeHash));
        
        // 2. name hash
        byte[] nameHash = keccak256("NFTMarket".getBytes(StandardCharsets.UTF_8));
        System.out.println(" - nameHash: " + Numeric.toHexString(nameHash));
        
        // 3. version hash
        byte[] versionHash = keccak256("1".getBytes(StandardCharsets.UTF_8));
        System.out.println(" - versionHash: " + Numeric.toHexString(versionHash));
        
        // 4. chainId (uint256)
        byte[] chainIdBytes = toUint256Bytes(BigInteger.valueOf(chainId));
        System.out.println(" - chainIdBytes: " + Numeric.toHexString(chainIdBytes));
        
        // 5. contractAddress (address) - 注意：address在abi.encode中会填充到32字节
        byte[] addressBytes = toAddressBytes(contractAddress);
        System.out.println(" - addressBytes: " + Numeric.toHexString(addressBytes));
        
        // 6. 模拟 abi.encode - 这是关键！
        // 在Solidity中，abi.encode会对每个参数进行编码
        ByteArrayOutputStream encodeStream = new ByteArrayOutputStream();
        
        // 编码顺序必须与合约完全一致：
        encodeStream.write(domainTypeHash);  // bytes32
        encodeStream.write(nameHash);        // bytes32
        encodeStream.write(versionHash);     // bytes32
        encodeStream.write(chainIdBytes);    // uint256 (32 bytes)
        encodeStream.write(addressBytes);    // address (左填充12字节0到32字节)
        
        byte[] encodedData = encodeStream.toByteArray();
        System.out.println(" - 编码数据长度: " + encodedData.length + " 字节");
        System.out.println(" - 编码数据: " + Numeric.toHexString(encodedData));
        
        // 7. 计算keccak256哈希
        byte[] domainSeparator = keccak256(encodedData);
        return domainSeparator;
    }
    
    /**
     * 完全匹配合约的结构体哈希计算
     * 对应合约中的：
     * keccak256(abi.encode(
     *     WHITELIST_TYPEHASH,
     *     _user,
     *     _nftId, 
     *     _maxPrice,
     *     _deadline,
     *     _nonce
     * ))
     */
    private static byte[] calculateStructHashExact(byte[] whitelistTypeHash, String userAddress,
                                                  BigInteger nftId, BigInteger maxPrice,
                                                  BigInteger deadline, BigInteger nonce) throws Exception {
        System.out.println("🔧 STRUCT_HASH 计算详情:");
        
        ByteArrayOutputStream encodeStream = new ByteArrayOutputStream();
        
        // 编码顺序必须与合约完全一致：
        encodeStream.write(whitelistTypeHash);           // bytes32
        encodeStream.write(toAddressBytes(userAddress)); // address (左填充)
        encodeStream.write(toUint256Bytes(nftId));       // uint256
        encodeStream.write(toUint256Bytes(maxPrice));    // uint256
        encodeStream.write(toUint256Bytes(deadline));    // uint256
        encodeStream.write(toUint256Bytes(nonce));       // uint256
        
        byte[] encodedData = encodeStream.toByteArray();
        System.out.println(" - 编码数据长度: " + encodedData.length + " 字节");
        
        return keccak256(encodedData);
    }
    
    /**
     * 完全匹配合约的摘要计算
     * 对应合约中的：
     * keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash))
     */
    private static byte[] calculateDigestExact(byte[] domainSeparator, byte[] structHash) throws Exception {
        ByteArrayOutputStream digestStream = new ByteArrayOutputStream();
        
        digestStream.write(new byte[] {0x19, 0x01});  // "\x19\x01"
        digestStream.write(domainSeparator);          // bytes32
        digestStream.write(structHash);               // bytes32
        
        return keccak256(digestStream.toByteArray());
    }
    
    /**
     * uint256 编码 (32字节大端序)
     */
    private static byte[] toUint256Bytes(BigInteger value) {
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
    private static byte[] toAddressBytes(String address) {
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
    private static byte[] keccak256(byte[] input) {
        return Hash.sha3(input);
    }
}