CREATE TABLE erc1155_collections (
  contract VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  name VARCHAR NOT NULL,
  symbol VARCHAR NOT NULL,
  PRIMARY KEY (contract, chain_id)
);

CREATE TABLE erc1155_tokens (
  contract VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  token_id VARCHAR NOT NULL,
  owner VARCHAR NOT NULL,
  balance TEXT NOT NULL,
  uri VARCHAR,
  metadata VARCHAR,
  PRIMARY KEY (contract, chain_id, token_id)
);