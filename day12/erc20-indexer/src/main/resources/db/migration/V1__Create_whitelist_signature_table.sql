CREATE TABLE whitelist_signature (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    nft_id NUMERIC(78,0) DEFAULT 0,
    max_price NUMERIC(78,0) NOT NULL,
    deadline NUMERIC(78,0) NOT NULL,
    nonce NUMERIC(78,0) NOT NULL,
    signature VARCHAR(132) NOT NULL,
    signer_address VARCHAR(42) NOT NULL,
    tier_level VARCHAR(20) DEFAULT 'BRONZE',
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    
    CONSTRAINT uk_user_nonce UNIQUE (user_address, nonce)
);

CREATE INDEX idx_whitelist_user ON whitelist_signature(user_address);
CREATE INDEX idx_whitelist_nft ON whitelist_signature(nft_id);
CREATE INDEX idx_whitelist_deadline ON whitelist_signature(deadline);
CREATE INDEX idx_whitelist_tier ON whitelist_signature(tier_level);
CREATE INDEX idx_whitelist_used ON whitelist_signature(is_used);
