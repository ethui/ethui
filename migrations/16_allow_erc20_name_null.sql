CREATE TABLE new_tokens_metadata (
  contract VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  decimals INTEGER,
  name VARCHAR,
  symbol VARCHAR,
  PRIMARY KEY (contract, chain_id)
);

INSERT INTO new_tokens_metadata (contract, chain_id, decimals, name, symbol)
  SELECT contract, chain_id, decimals, name, symbol
    FROM tokens_metadata;

DROP TABLE tokens_metadata;
ALTER TABLE new_tokens_metadata RENAME TO tokens_metadata;
