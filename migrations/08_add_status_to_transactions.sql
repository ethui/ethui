ALTER TABLE transactions
ADD status INTEGER;

UPDATE transactions SET status = 1;