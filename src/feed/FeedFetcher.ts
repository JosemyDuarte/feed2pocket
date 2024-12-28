import { HttpClient } from '../http/FetchHttpClient';
import { Feed } from '../types';
import Parser from 'rss-parser';
import { FeedParser } from './FeedParser';

const LAST_MODIFIED_HEADER = 'Last-Modified';
const ETAG_HEADER = 'Etag';

export interface FeedFetcher {
	fetch(feed: Feed): Promise<{
		items: Parser.Item[];
		lastModified: string | null;
		eTag: string | null;
	} | null>;
}

export class TimeoutFeedFetcher implements FeedFetcher {
	private readonly feedParser: FeedParser;
	private readonly httpClient: HttpClient;

	constructor(httpClient: HttpClient, feedParser: FeedParser) {
		this.httpClient = httpClient;
		this.feedParser = feedParser;
	}

	async fetch(feed: Feed): Promise<{
		items: Parser.Item[];
		lastModified: string | null;
		eTag: string | null;
	} | null> {
		try {
			const response = await this.httpClient.fetch(feed.url, {}, 1000);

			if (!response.ok) {
				throw new Error(`Failed to retrieve feed: ${response.statusText}`);
			}

			const lastModified = response.headers.get(LAST_MODIFIED_HEADER);
			const eTag = response.headers.get(ETAG_HEADER);

			if ((eTag && feed.e_tag === eTag) || (lastModified && feed.last_modified === lastModified)) {
				console.log(`Feed ${feed.url} has not been modified since last sync.`);
				return null;
			}

			const feedData = await this.feedParser.parseString(await response.text());
			console.log(`Found ${feedData.items.length} items in feed ${feed.url}`);

			return {
				eTag,
				lastModified,
				items: feedData.items
			};
		} catch (error: any) {
			console.error(`Failed to fetch feed ${feed.url}: ${error.message}`);
			return null;
		}
	}
}
