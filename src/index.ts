import { UserSyncer } from './user/UserSyncer';
import { FetchHttpClient } from './http/FetchHttpClient';
import { FeedStorageD1 } from './feed/FeedStorage';
import { PocketClientFactory } from './pocket/PocketClient';
import { UserStorageD1 } from './user/UserStorage';
import { FeedProcessor } from './feed/FeedProcessor';
import { TimeoutFeedFetcher } from './feed/FeedFetcher';
import { FeedParserXML } from './feed/FeedParser';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return new Response('FeedsToPocket Worker is running.');
	},

	async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`trigger fired at ${event.cron}`);

		const httpClient = new FetchHttpClient();
		const userSyncer = new UserSyncer(
			new PocketClientFactory(env.POCKET_CONSUMER_KEY, httpClient),
			new UserStorageD1(env.F2P_DB),
			new FeedProcessor(new FeedStorageD1(env.F2P_DB), new TimeoutFeedFetcher(httpClient, new FeedParserXML())));

		await userSyncer.syncAllUsers();
		console.log('All users synced successfully.');
	}

} satisfies ExportedHandler<Env>;



