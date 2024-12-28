import { HttpClient } from '../http/FetchHttpClient';

export interface IPocketClient {
	addItem(url: string, tags: string[]): Promise<void>;
}

export interface IPocketClientFactory {
	createPocketClient(accessToken: string): IPocketClient;
}

export class PocketClientFactory implements IPocketClientFactory {
	constructor(
		private pocketConsumerKey: string,
		private httpClient: HttpClient
	) {
	}

	createPocketClient(accessToken: string): IPocketClient {
		return new PocketClient(this.pocketConsumerKey, accessToken, this.httpClient);
	}
}

export class PocketClient implements IPocketClient {
	private readonly consumerKey: string;
	private readonly accessToken: string;
	private readonly httpClient: HttpClient;

	constructor(consumerKey: string, accessToken: string, httpClient: HttpClient) {
		this.consumerKey = consumerKey;
		this.accessToken = accessToken;
		this.httpClient = httpClient;
	}

	async addItem(url: string, tags?: string[]): Promise<void> {
		const params: any = {
			consumer_key: this.consumerKey,
			access_token: this.accessToken,
			url: url
		};
		if (tags && tags.length > 0) {
			params.tags = tags.join(',');
		}
		const response = await this.httpClient.fetch('https://getpocket.com/v3/add', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json; charset=UTF-8',
				'X-Accept': 'application/json'
			},
			body: JSON.stringify(params)
		}, 3000);
		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Failed to add item to Pocket: ${text}`);
		}
	}
}
