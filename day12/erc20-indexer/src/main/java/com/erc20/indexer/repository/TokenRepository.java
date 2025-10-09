package com.erc20.indexer.repository;

import com.erc20.indexer.entity.Token;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TokenRepository extends JpaRepository<Token, Long> {
    
    Optional<Token> findByContractAddress(String contractAddress);
    
    @Query("SELECT t FROM Token t WHERE t.contractAddress IN :addresses")
    List<Token> findByContractAddresses(@Param("addresses") List<String> addresses);
    
    boolean existsByContractAddress(String contractAddress);
}