import { UserSyncer } from './UserSyncer';
import { IPocketClientFactory, IPocketClient } from '../pocket/PocketClient';
import { User } from '../types';
import { UserStorage } from './UserStorage';
import { IFeedProcessor } from '../feed/FeedProcessor';
import { Feed } from '../types';

describe('UserSyncer', () => {
	let pocketClientFactoryMock: jest.Mocked<IPocketClientFactory>;
	let userStorageMock: jest.Mocked<UserStorage>;
	let feedProcessorMock: jest.Mocked<IFeedProcessor>;
	let pocketClientMock: jest.Mocked<IPocketClient>;
	let userSyncer: UserSyncer;

	beforeEach(() => {
		// Mocked instances of dependencies
		pocketClientMock = {
			addItem: jest.fn(),
			// ... other methods if any
		} as jest.Mocked<IPocketClient>;

		pocketClientFactoryMock = {
			createPocketClient: jest.fn().mockReturnValue(pocketClientMock),
		} as jest.Mocked<IPocketClientFactory>;

		userStorageMock = {
			getAllUsers: jest.fn(),
			getFeedsForUser: jest.fn(),
			// ... other methods if any
		} as jest.Mocked<UserStorage>;

		feedProcessorMock = {
			process: jest.fn(),
		} as jest.Mocked<IFeedProcessor>;

		// Instantiate UserSyncer with mocked dependencies
		userSyncer = new UserSyncer(pocketClientFactoryMock, userStorageMock, feedProcessorMock);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('syncAllUsers', () => {
		it('should sync feeds for all users', async () => {
			const users: User[] = [
				{ id: 1, username: 'user1', access_token: 'token1' },
				{ id: 2, username: 'user2', access_token: 'token2' },
			];

			userStorageMock.getAllUsers.mockResolvedValue(users);
			jest.spyOn(userSyncer, 'syncFeedsForUser').mockResolvedValue();

			console.log = jest.fn();

			await userSyncer.syncAllUsers();

			expect(userStorageMock.getAllUsers).toHaveBeenCalled();
			expect(console.log).toHaveBeenCalledWith(`Found ${users.length} users`);
			expect(userSyncer.syncFeedsForUser).toHaveBeenCalledTimes(users.length);
			expect(userSyncer.syncFeedsForUser).toHaveBeenCalledWith(users[0]);
			expect(userSyncer.syncFeedsForUser).toHaveBeenCalledWith(users[1]);
		});

		it('should handle errors when syncing feeds for a user', async () => {
			const users: User[] = [
				{ id: 1, username: 'user1', access_token: 'token1' },
			];
			const error = new Error('Failed to sync feeds');

			userStorageMock.getAllUsers.mockResolvedValue(users);

			jest.spyOn(userSyncer, 'syncFeedsForUser').mockRejectedValue(error);

			console.error = jest.fn();

			await userSyncer.syncAllUsers();

			expect(console.error).toHaveBeenCalledWith(`Error syncing feeds for user ${users[0].username}:`, error);
		});
	});

	describe('syncFeedsForUser', () => {
		it('should skip user if not authenticated', async () => {
			const user: User = { id: 1, username: 'user1', access_token: '' };

			console.log = jest.fn();

			await userSyncer.syncFeedsForUser(user);

			expect(console.log).toHaveBeenCalledWith(`User ${user.username} is not authenticated with Pocket.`);
			expect(pocketClientFactoryMock.createPocketClient).not.toHaveBeenCalled();
		});

		it('should sync feeds for authenticated user', async () => {
			const user: User = { id: 1, username: 'user1', access_token: 'token1' };
			const feeds: Feed[] = [
				{ id: 101, url: 'http://example.com/feed1', user_id: 1 } as Feed,
				{ id: 102, url: 'http://example.com/feed2', user_id: 1 } as Feed,
			];

			userStorageMock.getFeedsForUser.mockResolvedValue(feeds);
			feedProcessorMock.process.mockResolvedValue();

			await userSyncer.syncFeedsForUser(user);

			expect(pocketClientFactoryMock.createPocketClient).toHaveBeenCalledWith(user.access_token);
			expect(userStorageMock.getFeedsForUser).toHaveBeenCalledWith(user.id);
			expect(feedProcessorMock.process).toHaveBeenCalledTimes(feeds.length);
			expect(feedProcessorMock.process).toHaveBeenCalledWith(feeds[0], pocketClientMock);
			expect(feedProcessorMock.process).toHaveBeenCalledWith(feeds[1], pocketClientMock);
		});

		it('should handle errors when processing individual feeds', async () => {
			const user: User = { id: 1, username: 'user1', access_token: 'token1' };
			const feeds: Feed[] = [
				{ id: 101, url: 'http://example.com/feed1', user_id: 1 } as Feed,
			];
			const error = new Error('Failed to process feed');

			userStorageMock.getFeedsForUser.mockResolvedValue(feeds);
			feedProcessorMock.process.mockRejectedValue(error);

			console.error = jest.fn();

			await userSyncer.syncFeedsForUser(user);

			expect(console.error).toHaveBeenCalledWith(`Error processing feed ${feeds[0].url}:`, error);
		});
	});
});
