import { User, Feed, FeedDBRow } from '../types';

export interface FeedStorage {
	getProcessedEntries(feedId: number, entryUrls: string[]): Promise<Set<string>>;
	addProcessedEntry(feedId: number, entryUrl: string): Promise<void>;
	updateFeedMetadata(feed: Feed): Promise<void>;
}

export class FeedStorageD1 implements FeedStorageD1 {
	private db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
	}

	async getProcessedEntries(feedId: number, entryUrls: string[]): Promise<Set<string>> {
		const MAX_VARIABLES = 999; // SQLite's default maximum number of variables in a prepared statement
		const MAX_ENTRY_URLS_PER_BATCH = MAX_VARIABLES - 1; // Subtract 1 for feedId
		const processedEntryUrls = new Set<string>();

		for (let i = 0; i < entryUrls.length; i += MAX_ENTRY_URLS_PER_BATCH) {
			const batchEntryUrls = entryUrls.slice(i, i + MAX_ENTRY_URLS_PER_BATCH);
			const placeholders = batchEntryUrls.map(() => '?').join(', ');

			const sql = `
				SELECT entry_url
				FROM processed_entries
				WHERE feed_id = ?
					AND entry_url IN (${placeholders})
			`;

			const params = [feedId, ...batchEntryUrls];

			const { results } = await this.db.prepare(sql)
				.bind(...params)
				.all<{ entry_url: string }>();

			if (results) {
				results.forEach(row => processedEntryUrls.add(row.entry_url));
			}
		}

		return processedEntryUrls;
	}


	async addProcessedEntry(feedId: number, entryUrl: string): Promise<void> {
		const insertedAt = new Date().toISOString();
		await this.db.prepare(`
			INSERT INTO processed_entries (entry_url, feed_id, inserted_at)
			VALUES (?, ?, ?)
		`)
			.bind(entryUrl, feedId, insertedAt)
			.run();
	}

	async updateFeedMetadata(feed: Feed): Promise<void> {
		await this.db.prepare(`
			UPDATE feeds
			SET last_modified = ?,
					e_tag         = ?
			WHERE id = ?
		`)
			.bind(feed.last_modified, feed.e_tag, feed.id)
			.run();
	}
}
