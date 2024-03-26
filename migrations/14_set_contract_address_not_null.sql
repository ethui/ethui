CREATE TABLE new_contracts (
  address VARCHAR NOT NULL COLLATE NOCASE,
  chain_id INTEGER NOT NULL,
  abi TEXT,
  name VARCHAR,
  PRIMARY KEY (address, chain_id)
);

INSERT INTO new_contracts (address, chain_id, abi, name)
  SELECT address, chain_id, abi, name
    FROM contracts
    WHERE address IS NOT NULL;

DROP TABLE contracts;
ALTER TABLE new_contracts RENAME TO contracts;
