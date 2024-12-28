import { Feed } from '../types';
import { IPocketClient } from '../pocket/PocketClient';
import { FeedFetcher } from './FeedFetcher';
import { FeedStorage } from './FeedStorage';

export interface IFeedProcessor {
	process(feed: Feed, pocketClient: IPocketClient): Promise<void>;
}

export class FeedProcessor implements IFeedProcessor {
	private readonly feedStorage: FeedStorage;
	private readonly feedFetcher: FeedFetcher;

	constructor(dbService: FeedStorage, feedFetcher: FeedFetcher) {
		this.feedStorage = dbService;
		this.feedFetcher = feedFetcher;
	}

	async process(feed: Feed, pocketClient: IPocketClient): Promise<void> {
		console.log(`Processing feed ${feed.url}`);

		const feedResponse = await this.feedFetcher.fetch(feed);

		if (!feedResponse) {
			console.log(`Nothing found on feed ${feed.url}.`);
			return;
		}

		const { items } = feedResponse;
		console.log(`Processing ${items.length} items for feed ${feed.url}`);

		const entryUrls = items
			.map(item => item.link?.trim())
			.filter((entryUrl): entryUrl is string => !!entryUrl);

		if (entryUrls.length === 0) {
			console.log(`No valid entry URLs found in feed ${feed.url}`);
			return;
		}

		const alreadyProcessedSet = await this.feedStorage.getProcessedEntries(feed.id, entryUrls);

		for (const entryUrl of entryUrls) {
			if (alreadyProcessedSet.has(entryUrl)) {
				console.log(`Item ${entryUrl} has already been processed.`);
				continue;
			}

			console.log(`Adding ${entryUrl} to Pocket`);

			try {
				const tags = feed.tags ? feed.tags.split(',') : [];
				await pocketClient.addItem(entryUrl, tags);

				await this.feedStorage.addProcessedEntry(feed.id, entryUrl);
				alreadyProcessedSet.add(entryUrl);
			} catch (error: any) {
				console.error(`Failed to add ${entryUrl} to Pocket: ${error.message}`);
			}
		}

		console.log(`Finished processing feed ${feed.url}`);

		if (feedResponse.lastModified || feedResponse.eTag) {
			feed.last_modified = feedResponse.lastModified;
			feed.e_tag = feedResponse.eTag;
			await this.feedStorage.updateFeedMetadata(feed);
		}
	}

}
