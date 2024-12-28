CREATE TABLE IF NOT EXISTS users
(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feeds
(
	id                INTEGER PRIMARY KEY AUTOINCREMENT,
	url               TEXT    NOT NULL,
	tags              TEXT,
	last_modified     TEXT,
	e_tag             TEXT,
	user_id           INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_feeds_user ON feeds (user_id);

CREATE TABLE IF NOT EXISTS processed_entries (
	 id INTEGER PRIMARY KEY AUTOINCREMENT,
	 entry_url TEXT NOT NULL,
	 feed_id INTEGER NOT NULL,
	 inserted_at TEXT NOT NULL,
	 FOREIGN KEY (feed_id) REFERENCES feeds (id)
);

CREATE INDEX IF NOT EXISTS idx_processed_entries_feed_entry ON processed_entries (feed_id, entry_url);


-- CREATE TABLE IF NOT EXISTS entries
-- (
-- 	id                INTEGER PRIMARY KEY AUTOINCREMENT,
-- 	title             TEXT    NOT NULL,
-- 	url               TEXT    NOT NULL,
-- 	summary           TEXT,
-- 	content           TEXT,
-- 	published         TEXT,
-- 	feed_id           INTEGER NOT NULL,
-- 	FOREIGN KEY (feed_id) REFERENCES feeds (id)
-- );
