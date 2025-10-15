-- 如果表已存在，先删除
DROP TABLE IF EXISTS token_transfers;
DROP TABLE IF EXISTS tokens;

-- 创建 tokens 表
CREATE TABLE IF NOT EXISTS tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_address VARCHAR(42) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    decimals INT NOT NULL DEFAULT 18,
    total_supply DECIMAL(36,18),
    created_block BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contract_address (contract_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建 token_transfers 表
CREATE TABLE IF NOT EXISTS token_transfers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_id BIGINT NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value DECIMAL(36,18) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_index INT NOT NULL,
    log_index INT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id),
    INDEX idx_token_id (token_id),
    INDEX idx_from_address (from_address),
    INDEX idx_to_address (to_address),
    INDEX idx_block_number (block_number),
    INDEX idx_tx_hash (transaction_hash),
    UNIQUE KEY uk_transfer_log (transaction_hash, log_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;