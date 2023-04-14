CREATE TABLE balances (
  contract VARCHAR COLLATE NOCASE,
  owner VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  balance TEXT NOT NULL,
  PRIMARY KEY (contract, owner, chain_id)
);

CREATE TABLE nft_tokens (
  contract VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  token_id VARCHAR NOT NULL,
  owner VARCHAR COLLATE NOCASE,
  PRIMARY KEY (contract, token_id, chain_id)
)
