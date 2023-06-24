CREATE TABLE tips (
    owner VARCHAR COLLATE NOCASE NOT NULL,
    chain_id INTEGER NOT NULL,
    tip VARCHAR NOT NULL,
    PRIMARY KEY (owner, chain_id)
);
