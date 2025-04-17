CREATE TABLE new_contracts (
  address VARCHAR NOT NULL COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  dedup_id INTEGER,
  abi TEXT,
  name VARCHAR,
  proxy_for VARCHAR COLLATE NOCASE,
  proxied_by VARCHAR COLLATE NOCASE,
  code TEXT,
  PRIMARY KEY (address, chain_id, dedup_id)
);

DROP TABLE contracts;
ALTER TABLE new_contracts RENAME TO contracts;
