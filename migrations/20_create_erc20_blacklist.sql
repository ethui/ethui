CREATE TABLE erc20_blacklist (
  chain_id INTEGER NOT NULL,
  address VARCHAR NOT NULL COLLATE NOCASE,
  blacklisted BOOLEAN DEFAULT false,

  PRIMARY KEY (chain_id, address)
);
