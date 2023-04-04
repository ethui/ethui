CREATE TABLE block_listeners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  last_known_block INTEGER NOT NULL
);
