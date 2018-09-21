DROP TABLE IF EXISTS issuers CASCADE;
CREATE TABLE issuers (
  id SERIAL NOT NULL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE DEFAULT ''
);

DROP TABLE IF EXISTS payment_networks CASCADE;
CREATE TABLE payment_networks (
  id SERIAL NOT NULL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE DEFAULT ''
);

DROP TABLE IF EXISTS cards CASCADE;
CREATE TABLE cards (
  id SERIAL NOT NULL PRIMARY KEY,
  issuer_id INT NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
  payment_network_id INT REFERENCES payment_networks(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);

DROP TABLE IF EXISTS old_reviews;
CREATE TABLE old_reviews (
  id SERIAL NOT NULL PRIMARY KEY,
  review_id_hash TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL,
  card_id INT REFERENCES cards(id) ON DELETE CASCADE
);


INSERT INTO issuers(name)
VALUES
('Bank of America'),
('Capital One'),
('Chase'),
('Wells Fargo'),
('Citi'),
('American Express'),
('Discover'),
('Barclays');

INSERT INTO payment_networks(name)
VALUES
('Visa'),
('Mastercard'),
('Discover'),
('American Express');