import { IPocketClientFactory } from '../pocket/PocketClient';
import { User } from '../types';
import { UserStorage } from './UserStorage';
import { IFeedProcessor } from '../feed/FeedProcessor';

export class UserSyncer {
	private readonly pocketClientFactory: IPocketClientFactory;
	private readonly userStorage: UserStorage;
	private readonly feedProcessor: IFeedProcessor;

	constructor(pocketClientFactory: IPocketClientFactory, userStorage: UserStorage, feedProcessor: IFeedProcessor) {
		this.pocketClientFactory = pocketClientFactory;
		this.userStorage = userStorage;
		this.feedProcessor = feedProcessor;
	}

	// Sync feeds for all users
	async syncAllUsers(): Promise<void> {
		const users = await this.userStorage.getAllUsers();
		console.log(`Found ${users.length} users`);

		for (const user of users) {
			try {
				await this.syncFeedsForUser(user);
			} catch (error) {
				console.error(`Error syncing feeds for user ${user.username}:`, error);
			}
		}
	}

	// Sync feeds for a specific user
	async syncFeedsForUser(user: User): Promise<void> {
		if (!user.access_token) {
			console.log(`User ${user.username} is not authenticated with Pocket.`);
			return;
		}

		const pocket = this.pocketClientFactory.createPocketClient(user.access_token);
		const feeds = await this.userStorage.getFeedsForUser(user.id);

		for (const feed of feeds) {
			try {
				await this.feedProcessor.process(feed, pocket);
			} catch (error) {
				console.error(`Error processing feed ${feed.url}:`, error);
			}
		}
	}
}
