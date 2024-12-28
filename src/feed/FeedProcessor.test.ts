import { FeedProcessor } from './FeedProcessor';
import { Feed } from '../types';
import { IPocketClient } from '../pocket/PocketClient';
import { FeedFetcher } from './FeedFetcher';
import { FeedStorage } from './FeedStorage';
import Parser from 'rss-parser';

jest.mock('./FeedFetcher');
jest.mock('./FeedStorage');

describe('FeedProcessor', () => {
	let feedFetcherMock: jest.Mocked<FeedFetcher>;
	let feedStorageMock: jest.Mocked<FeedStorage>;
	let pocketClientMock: jest.Mocked<IPocketClient>;
	let feedProcessor: FeedProcessor;

	beforeEach(() => {
		// Create mocked instances of FeedFetcher and FeedStorage
		feedFetcherMock = {
			fetch: jest.fn()
		};
		feedStorageMock = {
			getProcessedEntries: jest.fn(),
			addProcessedEntry: jest.fn(),
			updateFeedMetadata: jest.fn()
		};
		pocketClientMock = {
			addItem: jest.fn()
		} as jest.Mocked<IPocketClient>;

		feedProcessor = new FeedProcessor(feedStorageMock, feedFetcherMock);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const feed: Feed = {
		id: 1,
		url: 'http://example.com/feed',
		user_id: 1,
		tags: 'tag1,tag2',
		last_modified: null,
		e_tag: null
	};

	describe('process', () => {
		it('should process feed items successfully', async () => {
			const items: Parser.Item[] = [
				{ link: 'http://example.com/article1' },
				{ link: 'http://example.com/article2' },
				{ link: 'http://example.com/article3' }
			];
			const feedResponse = {
				items,
				lastModified: 'Mon, 01 Jan 2021 00:00:00 GMT',
				eTag: 'etag-123'
			};
			feedFetcherMock.fetch.mockResolvedValue(feedResponse);

			// Mock feedStorage.getProcessedEntries to return a set containing one processed URL
			feedStorageMock.getProcessedEntries.mockResolvedValue(new Set(['http://example.com/article2']));

			pocketClientMock.addItem.mockResolvedValue();

			feedStorageMock.addProcessedEntry.mockResolvedValue();

			feedStorageMock.updateFeedMetadata.mockResolvedValue();

			console.log = jest.fn();
			console.error = jest.fn();

			await feedProcessor.process(feed, pocketClientMock);

			// Assertions
			expect(feedFetcherMock.fetch).toHaveBeenCalledWith(feed);
			expect(feedStorageMock.getProcessedEntries).toHaveBeenCalledWith(feed.id, [
				'http://example.com/article1',
				'http://example.com/article2',
				'http://example.com/article3'
			]);
			expect(pocketClientMock.addItem).toHaveBeenCalledTimes(2); // Should skip the already processed item
			expect(pocketClientMock.addItem).toHaveBeenCalledWith('http://example.com/article1', ['tag1', 'tag2']);
			expect(pocketClientMock.addItem).toHaveBeenCalledWith('http://example.com/article3', ['tag1', 'tag2']);
			expect(feedStorageMock.addProcessedEntry).toHaveBeenCalledTimes(2);
			expect(feedStorageMock.addProcessedEntry).toHaveBeenCalledWith(feed.id, 'http://example.com/article1');
			expect(feedStorageMock.addProcessedEntry).toHaveBeenCalledWith(feed.id, 'http://example.com/article3');
			expect(feedStorageMock.updateFeedMetadata).toHaveBeenCalledWith({
				...feed,
				last_modified: feedResponse.lastModified,
				e_tag: feedResponse.eTag
			});
		});

		it('should handle when feedFetcher returns null', async () => {
			feedFetcherMock.fetch.mockResolvedValue(null);

			console.log = jest.fn();

			await feedProcessor.process(feed, pocketClientMock);

			expect(feedFetcherMock.fetch).toHaveBeenCalledWith(feed);
			expect(console.log).toHaveBeenCalledWith(`Nothing found on feed ${feed.url}.`);
			expect(feedStorageMock.getProcessedEntries).not.toHaveBeenCalled();
			expect(pocketClientMock.addItem).not.toHaveBeenCalled();
			expect(feedStorageMock.addProcessedEntry).not.toHaveBeenCalled();
			expect(feedStorageMock.updateFeedMetadata).not.toHaveBeenCalled();
		});

		it('should handle when no items are in the feed', async () => {
			const feedResponse = {
				items: [],
				lastModified: 'Mon, 01 Jan 2021 00:00:00 GMT',
				eTag: 'etag-123'
			};
			feedFetcherMock.fetch.mockResolvedValue(feedResponse);

			console.log = jest.fn();

			await feedProcessor.process(feed, pocketClientMock);

			expect(console.log).toHaveBeenCalledWith(`Processing 0 items for feed ${feed.url}`);
			expect(feedStorageMock.getProcessedEntries).not.toHaveBeenCalled();
			expect(pocketClientMock.addItem).not.toHaveBeenCalled();
			expect(feedStorageMock.addProcessedEntry).not.toHaveBeenCalled();
		});

		it('should handle when no valid entry URLs are found', async () => {
			const items: Parser.Item[] = [
				{ link: '   ' }, // Link with only spaces
				{}, // No link property
				{ link: '' } // Empty link
			];
			const feedResponse = {
				items,
				lastModified: 'Mon, 01 Jan 2021 00:00:00 GMT',
				eTag: 'etag-123'
			};
			feedFetcherMock.fetch.mockResolvedValue(feedResponse);

			console.log = jest.fn();

			await feedProcessor.process(feed, pocketClientMock);

			expect(console.log).toHaveBeenCalledWith(`No valid entry URLs found in feed ${feed.url}`);
			expect(feedStorageMock.getProcessedEntries).not.toHaveBeenCalled();
			expect(pocketClientMock.addItem).not.toHaveBeenCalled();
			expect(feedStorageMock.addProcessedEntry).not.toHaveBeenCalled();
		});

		it('should handle when all items have already been processed', async () => {
			const items: Parser.Item[] = [
				{ link: 'http://example.com/article1' },
				{ link: 'http://example.com/article2' }
			];
			const feedResponse = {
				items,
				lastModified: null,
				eTag: null
			};
			feedFetcherMock.fetch.mockResolvedValue(feedResponse);

			// Mock getProcessedEntries to return all URLs as already processed
			feedStorageMock.getProcessedEntries.mockResolvedValue(new Set([
				'http://example.com/article1',
				'http://example.com/article2'
			]));

			console.log = jest.fn();

			await feedProcessor.process(feed, pocketClientMock);

			expect(feedStorageMock.getProcessedEntries).toHaveBeenCalledWith(feed.id, [
				'http://example.com/article1',
				'http://example.com/article2'
			]);
			expect(console.log).toHaveBeenCalledWith(`Item http://example.com/article1 has already been processed.`);
			expect(console.log).toHaveBeenCalledWith(`Item http://example.com/article2 has already been processed.`);
			expect(pocketClientMock.addItem).not.toHaveBeenCalled();
			expect(feedStorageMock.addProcessedEntry).not.toHaveBeenCalled();

			// Since there's no new metadata, updateFeedMetadata should not be called
			expect(feedStorageMock.updateFeedMetadata).not.toHaveBeenCalled();
		});

		it('should handle errors when adding item to Pocket', async () => {
			const items: Parser.Item[] = [
				{ link: 'http://example.com/article1' }
			];
			const feedResponse = {
				items,
				lastModified: null,
				eTag: null
			};
			feedFetcherMock.fetch.mockResolvedValue(feedResponse);

			feedStorageMock.getProcessedEntries.mockResolvedValue(new Set());

			// Mock pocketClient.addItem to throw an error
			const pocketError = new Error('Pocket API error');
			pocketClientMock.addItem.mockRejectedValue(pocketError);

			console.error = jest.fn();

			await feedProcessor.process(feed, pocketClientMock);

			expect(pocketClientMock.addItem).toHaveBeenCalledWith('http://example.com/article1', ['tag1', 'tag2']);
			expect(console.error).toHaveBeenCalledWith(
				`Failed to add http://example.com/article1 to Pocket: ${pocketError.message}`
			);
			expect(feedStorageMock.addProcessedEntry).not.toHaveBeenCalled();
		});

		it('should continue processing other items when pocket fails for one', async () => {
			const items: Parser.Item[] = [
				{ link: 'http://example.com/article1' },
				{ link: 'http://example.com/article2' },
				{ link: 'http://example.com/article3' }
			];
			const feedResponse = {
				items,
				lastModified: null,
				eTag: null
			};
			feedFetcherMock.fetch.mockResolvedValue(feedResponse);

			feedStorageMock.getProcessedEntries.mockResolvedValue(new Set());
			pocketClientMock.addItem
				.mockResolvedValueOnce()
				.mockRejectedValueOnce(new Error('Pocket API error'))
				.mockResolvedValueOnce();
			feedStorageMock.addProcessedEntry.mockResolvedValue();

			console.error = jest.fn();

			await feedProcessor.process(feed, pocketClientMock);

			expect(pocketClientMock.addItem).toHaveBeenCalledWith('http://example.com/article1', ['tag1', 'tag2']);
			expect(pocketClientMock.addItem).toHaveBeenCalledWith('http://example.com/article2', ['tag1', 'tag2']);
			expect(pocketClientMock.addItem).toHaveBeenCalledWith('http://example.com/article3', ['tag1', 'tag2']);
			expect(console.error).toHaveBeenCalledWith(
				`Failed to add http://example.com/article2 to Pocket: Pocket API error`
			);
			expect(feedStorageMock.addProcessedEntry).toHaveBeenCalledWith(feed.id, 'http://example.com/article1');
			expect(feedStorageMock.addProcessedEntry).toHaveBeenCalledWith(feed.id, 'http://example.com/article3');
		});

		it('should update feed metadata when lastModified or eTag is present', async () => {
			const items: Parser.Item[] = [
				{ link: 'http://example.com/article1' }
			];
			const feedResponse = {
				items,
				lastModified: 'Mon, 01 Jan 2021 00:00:00 GMT',
				eTag: 'etag-456'
			};
			feedFetcherMock.fetch.mockResolvedValue(feedResponse);

			feedStorageMock.getProcessedEntries.mockResolvedValue(new Set());
			pocketClientMock.addItem.mockResolvedValue();
			feedStorageMock.addProcessedEntry.mockResolvedValue();
			feedStorageMock.updateFeedMetadata.mockResolvedValue();

			await feedProcessor.process(feed, pocketClientMock);

			expect(feedStorageMock.updateFeedMetadata).toHaveBeenCalledWith({
				...feed,
				last_modified: feedResponse.lastModified,
				e_tag: feedResponse.eTag
			});
		});

		it('should not update feed metadata when lastModified and eTag are null', async () => {
			const items: Parser.Item[] = [
				{ link: 'http://example.com/article1' }
			];
			const feedResponse = {
				items,
				lastModified: null,
				eTag: null
			};
			feedFetcherMock.fetch.mockResolvedValue(feedResponse);

			feedStorageMock.getProcessedEntries.mockResolvedValue(new Set());
			pocketClientMock.addItem.mockResolvedValue();
			feedStorageMock.addProcessedEntry.mockResolvedValue();
			feedStorageMock.updateFeedMetadata.mockResolvedValue();

			await feedProcessor.process(feed, pocketClientMock);

			expect(feedStorageMock.updateFeedMetadata).not.toHaveBeenCalled();
		});
	});
});
