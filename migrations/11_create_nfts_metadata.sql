CREATE TABLE nfts_metadata (
  contract VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  token_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  symbol VARCHAR NOT NULL,
  url VARCHAR NOT NULL,
  PRIMARY KEY (contract, chain_id, token_id)
);
