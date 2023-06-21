CREATE TABLE native_balances (
  owner VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  balance TEXT NOT NULL,
  PRIMARY KEY (owner, chain_id)
);