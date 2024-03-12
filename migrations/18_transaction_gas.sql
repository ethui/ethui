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
  gas_limit VARCHAR,
  gas_used VARCHAR,
  max_fee_per_gas VARCHAR,
  max_priority_fee_per_gas VARCHAR,
  type INTEGER,
  nonce INTEGER,
  incomplete BOOLEAN DEFAULT false
);

INSERT INTO new_transactions (hash, chain_id, from_address, to_address, block_number, position, value, data, status, incomplete)
  SELECT hash, chain_id, from_address, to_address, block_number, position, value, data, status, incomplete
    FROM transactions;

-- mark all existing transactions as incomplete to force refetch
UPDATE new_transactions SET incomplete = true;

DROP TABLE transactions;
ALTER TABLE new_transactions RENAME TO transactions;
