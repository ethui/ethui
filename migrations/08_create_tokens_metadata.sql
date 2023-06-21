CREATE TABLE tokens_metadata (
  contract VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  decimals INTEGER NOT NULL,
  symbol VARCHAR NOT NULL,
  PRIMARY KEY (contract, chain_id)
);
