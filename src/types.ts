export interface Feed {
	id: number;
	url: string;
	tags: string | null;
	last_modified: string | null;
	e_tag: string | null;
	user_id: number;
}

export interface FeedDBRow {
	id: number;
	url: string;
	tags: string | null;
	last_modified: string | null;
	e_tag: string | null;
	user_id: number;
}

export interface User {
	id: number;
	username: string;
	access_token: string;
}

export interface ProcessedEntry {
	id: number;
	entry_url: string;
	feed_id: number;
	inserted_at: string; // ISO 8601 formatted date-time string
}
