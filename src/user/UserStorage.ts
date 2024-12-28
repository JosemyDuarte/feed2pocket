import { Feed, FeedDBRow, User } from '../types';

export interface UserStorage {
	getAllUsers(): Promise<User[]>;
	getFeedsForUser(userId: number): Promise<Feed[]>;
}

export class UserStorageD1 implements UserStorage {
	private db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
	}

	async getAllUsers(): Promise<User[]> {
		const { results } = await this.db.prepare('SELECT * FROM users').all<User>();
		return results || [];
	}

	async getFeedsForUser(userId: number): Promise<Feed[]> {
		const { results } = await this.db.prepare('SELECT * FROM feeds WHERE user_id = ?')
			.bind(userId)
			.all<FeedDBRow>();

		if (!results || results.length === 0) {
			return [];
		}

		return results.map(row => ({
			id: row.id,
			url: row.url,
			tags: row.tags,
			last_modified: row.last_modified,
			e_tag: row.e_tag,
			user_id: row.user_id
		}));
	}
}
