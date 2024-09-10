CREATE TABLE safe_contracts (
    contract VARCHAR COLLATE NOCASE,
    owner VARCHAR COLLATE NOCASE,
    chain_id INTEGER NOT NULL,
    signers TEXT NOT NULL,
    threshold INTEGER NOT NULL,
    nonce INTEGER,
    modules TEXT NOT NULL,
    master_copy VARCHAR COLLATE NOCASE,
    fallback_handler VARCHAR COLLATE NOCASE,
    guard VARCHAR COLLATE NOCASE,
    version VARCHAR,
    PRIMARY KEY (contract, owner, chain_id)
);

CREATE TABLE safe_pending_transactions (
    contract VARCHAR COLLATE NOCASE,
    owner VARCHAR COLLATE NOCASE,
    chain_id INTEGER NOT NULL,
    nonce INTEGER,
    confirmations TEXT,
    safe_tx_hash VARCHAR COLLATE NOCASE,
    "to" VARCHAR COLLATE NOCASE,
    data VARCHAR,
    PRIMARY KEY (contract, owner, chain_id, safe_tx_hash)
);
