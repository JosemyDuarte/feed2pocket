export interface HttpClient {
	fetch(url: RequestInfo | URL, options?: RequestInit, timeout?: number): Promise<Response>;
}

export class FetchHttpClient implements HttpClient {
	async fetch(url: RequestInfo | URL, options: RequestInit = {}, timeout = 500): Promise<Response> {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeout);

		const response = await fetch(url, {
			...options,
			signal: controller.signal
		});
		clearTimeout(id);

		return response;
	}
}
