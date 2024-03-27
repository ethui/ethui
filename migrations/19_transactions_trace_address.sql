CREATE TABLE new_transactions (
  hash VARCHAR COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  -- new field
  trace_address VARCHAR,
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
  incomplete BOOLEAN DEFAULT false,
  PRIMARY KEY (hash, chain_id, trace_address)
);

INSERT INTO new_transactions (hash, chain_id, from_address, to_address, block_number, position, value, data, status, incomplete, gas_limit, gas_used, max_fee_per_gas, max_priority_fee_per_gas)
  SELECT hash, chain_id, from_address, to_address, block_number, position, value, data, status, incomplete, gas_limit, gas_used, max_fee_per_gas, max_priority_fee_per_gas
    FROM transactions;

DROP TABLE transactions;
ALTER TABLE new_transactions RENAME TO transactions;
