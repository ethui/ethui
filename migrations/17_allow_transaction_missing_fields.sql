CREATE TABLE new_transactions (
  hash VARCHAR PRIMARY KEY COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  from_address VARCHAR NOT NULL COLLATE NOCASE,
  to_address VARCHAR COLLATE NOCASE,
  block_number BIGINT,
  position INTEGER,
  value VARCHAR,
  data VARCHAR,
  status INTEGER,
  incomplete BOOLEAN DEFAULT false
);

INSERT INTO new_transactions (hash, chain_id, from_address, to_address, block_number, position, value, data, status)
  SELECT hash, chain_id, from_address, to_address, block_number, position, value, data, status
    FROM transactions;

DROP TABLE transactions;
ALTER TABLE new_transactions RENAME TO transactions;
