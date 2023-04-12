CREATE TABLE contracts (
  address VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  PRIMARY KEY (address, chain_id)
);
