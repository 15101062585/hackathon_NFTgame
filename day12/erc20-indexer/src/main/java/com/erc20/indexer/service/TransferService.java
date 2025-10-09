package com.erc20.indexer.service;

import com.erc20.indexer.entity.Token;
import com.erc20.indexer.entity.TokenTransfer;
import com.erc20.indexer.repository.TokenRepository;
import com.erc20.indexer.repository.TokenTransferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TransferService {
    
    private final TokenRepository tokenRepository;

    private final TokenTransferRepository transferRepository;

    
    public Page<TokenTransfer> getTransfersByAddress(String address, Pageable pageable) {
        return transferRepository.findByFromAddressOrToAddress(address.toLowerCase(), pageable);
    }
    
    public Page<TokenTransfer> getTransfersByTokenAndAddress(String contractAddress, String address, Pageable pageable) {
        return transferRepository.findByTokenContractAddressAndAddress(
            contractAddress.toLowerCase(), 
            address.toLowerCase(), 
            pageable
        );
    }
    
    public Page<TokenTransfer> getTransfersByToken(String contractAddress, Pageable pageable) {
        return transferRepository.findByTokenContractAddress(contractAddress.toLowerCase(), pageable);
    }
    
    public List<Token> getAllTokens() {
        return tokenRepository.findAll();
    }
    
    public void indexTokenTransfers(String contractAddress, Long fromBlock, Long toBlock) {
        // 这个方法现在在 EventIndexingService 中实现
    }
}