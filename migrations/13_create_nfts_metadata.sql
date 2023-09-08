CREATE TABLE erc721_collections (
  contract VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  symbol VARCHAR NOT NULL,
  PRIMARY KEY (contract, chain_id)
);

CREATE TABLE erc721_tokens (
  contract VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  token_id VARCHAR NOT NULL,
  owner VARCHAR NOT NULL,
  uri VARCHAR,
  metadata VARCHAR,
  PRIMARY KEY (contract, chain_id, token_id)
);

DROP TABLE nft_tokens;
