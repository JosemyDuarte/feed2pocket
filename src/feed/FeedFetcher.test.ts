import { FetchHttpClient, HttpClient } from '../http/FetchHttpClient';
import { Feed } from '../types';
import { FeedParser } from './FeedParser';
import Parser from 'rss-parser';
import { TimeoutFeedFetcher } from './FeedFetcher';

jest.mock('../http/FetchHttpClient');
jest.mock('./FeedParser');

describe('TimeoutFeedFetcher', () => {
	let httpClientMock: jest.Mocked<HttpClient>;
	let feedParserMock: jest.Mocked<FeedParser>;
	let feedFetcher: TimeoutFeedFetcher;

	const LAST_MODIFIED_HEADER = 'Last-Modified';
	const ETAG_HEADER = 'Etag';

	beforeEach(() => {
		// Create mocked instances of HttpClient and FeedParser
		httpClientMock = new FetchHttpClient() as jest.Mocked<HttpClient>;
		feedParserMock = {
			parseString: jest.fn(),
		}

		feedFetcher = new TimeoutFeedFetcher(httpClientMock, feedParserMock);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const feed: Feed = {
		id: 1,
		url: 'http://example.com/feed',
		last_modified: null,
		e_tag: null,
		user_id: 1,
		// Include any other properties defined in your Feed type
	} as Feed;

	describe('fetch', () => {
		it('should fetch and parse the feed when it has been modified', async () => {
			// Mock the response of HttpClient.fetch
			const responseText = '<rss><channel></channel></rss>';
			const response = {
				ok: true,
				statusText: 'OK',
				headers: {
					get: jest.fn((header: string) => {
						if (header === LAST_MODIFIED_HEADER) return 'Mon, 01 Jan 2021 00:00:00 GMT';
						if (header === ETAG_HEADER) return 'etag-123';
						return null;
					}),
				},
				text: jest.fn().mockResolvedValue(responseText),
			};

			httpClientMock.fetch.mockResolvedValue(response as any);

			// Mock the FeedParser.parseString method
			const parsedFeedData = { items: [{ link: 'http://example.com/article1' }] as Parser.Item[] };
			feedParserMock.parseString.mockResolvedValue(parsedFeedData);

			// Call the fetch method
			const result = await feedFetcher.fetch(feed);

			// Assertions
			expect(httpClientMock.fetch).toHaveBeenCalledWith(feed.url, {}, 1000);
			expect(response.text).toHaveBeenCalled();
			expect(feedParserMock.parseString).toHaveBeenCalledWith(responseText);

			expect(result).toEqual({
				eTag: 'etag-123',
				lastModified: 'Mon, 01 Jan 2021 00:00:00 GMT',
				items: parsedFeedData.items,
			});
		});

		it('should return null if the feed has not been modified (based on ETag)', async () => {
			const feedWithEtag: Feed = {
				...feed,
				e_tag: 'etag-123',
			};

			const response = {
				ok: true,
				headers: {
					get: jest.fn((header: string) => {
						if (header === ETAG_HEADER) return 'etag-123';
						return null;
					}),
				},
				text: jest.fn(),
			};

			httpClientMock.fetch.mockResolvedValue(response as any);

			console.log = jest.fn();

			const result = await feedFetcher.fetch(feedWithEtag);

			expect(httpClientMock.fetch).toHaveBeenCalledWith(feed.url, {}, 1000);
			expect(response.headers.get).toHaveBeenCalledWith(ETAG_HEADER);
			expect(console.log).toHaveBeenCalledWith(`Feed ${feed.url} has not been modified since last sync.`);
			expect(result).toBeNull();
		});

		it('should return null if the feed has not been modified (based on Last-Modified)', async () => {
			const feedWithLastModified: Feed = {
				...feed,
				last_modified: 'Mon, 01 Jan 2021 00:00:00 GMT',
			};

			const response = {
				ok: true,
				headers: {
					get: jest.fn((header: string) => {
						if (header === LAST_MODIFIED_HEADER) return 'Mon, 01 Jan 2021 00:00:00 GMT';
						return null;
					}),
				},
				text: jest.fn(),
			};

			httpClientMock.fetch.mockResolvedValue(response as any);

			console.log = jest.fn();

			const result = await feedFetcher.fetch(feedWithLastModified);

			expect(httpClientMock.fetch).toHaveBeenCalledWith(feed.url, {}, 1000);
			expect(response.headers.get).toHaveBeenCalledWith(LAST_MODIFIED_HEADER);
			expect(console.log).toHaveBeenCalledWith(`Feed ${feed.url} has not been modified since last sync.`);
			expect(result).toBeNull();
		});

		it('should handle HTTP errors gracefully', async () => {
			const response = {
				ok: false,
				statusText: 'Not Found',
				headers: {
					get: jest.fn(),
				},
				text: jest.fn(),
			};

			httpClientMock.fetch.mockResolvedValue(response as any);

			console.error = jest.fn();

			const result = await feedFetcher.fetch(feed);

			expect(httpClientMock.fetch).toHaveBeenCalledWith(feed.url, {}, 1000);
			expect(console.error).toHaveBeenCalledWith(`Failed to fetch feed ${feed.url}: Failed to retrieve feed: ${response.statusText}`);
			expect(result).toBeNull();
		});

		it('should handle exceptions during fetch', async () => {
			const error = new Error('Network error');

			httpClientMock.fetch.mockRejectedValue(error);

			console.error = jest.fn();

			const result = await feedFetcher.fetch(feed);

			expect(httpClientMock.fetch).toHaveBeenCalledWith(feed.url, {}, 1000);
			expect(console.error).toHaveBeenCalledWith(`Failed to fetch feed ${feed.url}: ${error.message}`);
			expect(result).toBeNull();
		});

		it('should handle exceptions during parsing', async () => {
			const responseText = '<rss><channel></channel></rss>';
			const response = {
				ok: true,
				statusText: 'OK',
				headers: {
					get: jest.fn((header: string) => {
						if (header === LAST_MODIFIED_HEADER) return 'Mon, 01 Jan 2021 00:00:00 GMT';
						if (header === ETAG_HEADER) return 'etag-123';
						return null;
					}),
				},
				text: jest.fn().mockResolvedValue(responseText),
			};

			httpClientMock.fetch.mockResolvedValue(response as any);

			// Mock the FeedParser.parseString method to throw an error
			const parseError = new Error('Parse error');
			feedParserMock.parseString.mockRejectedValue(parseError);

			console.error = jest.fn();

			const result = await feedFetcher.fetch(feed);

			expect(feedParserMock.parseString).toHaveBeenCalledWith(responseText);
			expect(console.error).toHaveBeenCalledWith(`Failed to fetch feed ${feed.url}: ${parseError.message}`);
			expect(result).toBeNull();
		});
	});
});
