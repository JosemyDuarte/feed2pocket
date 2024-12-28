import { FetchHttpClient } from './FetchHttpClient';

describe('FetchHttpClient', () => {
	let fetchHttpClient: FetchHttpClient;
	let fetchMock: jest.Mock;

	beforeEach(() => {
		fetchHttpClient = new FetchHttpClient();
		jest.useFakeTimers();
		fetchMock = jest.fn();
		global.fetch = fetchMock;
	});

	it('fetches data successfully', async () => {
		const mockResponse = new Response(JSON.stringify({ data: 'test' }), { status: 200 });
		fetchMock.mockResolvedValueOnce(mockResponse);

		const url = 'https://example.com';
		const response = await fetchHttpClient.fetch(url, { method: 'GET' }, 1000); // Timeout after 1s

		jest.advanceTimersByTime(500); // Advance time to 500ms

		expect(response).toBe(mockResponse);
		expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining({
			signal: expect.any(AbortSignal),
			method: 'GET'
		}));
	});

	it('aborts the request after timeout', async () => {
		const abortError = new DOMException('The user aborted a request.', 'AbortError');
		fetchMock.mockImplementationOnce((_, { signal }) => {
			return new Promise((_, reject) => {
				signal.addEventListener('abort', () => {
					reject(abortError);
				});
			});
		});

		const url = 'https://example.com';
		const response = fetchHttpClient.fetch(url, {}, 500); // Timeout after 500ms

		jest.advanceTimersByTime(501); // Advance time to timeout

		await expect(response).rejects.toThrow('The user aborted a request.');
		expect(fetchMock).toHaveBeenCalledWith(url, expect.objectContaining({ signal: expect.any(AbortSignal) }));
	});

	it('clears timeout after successful fetch', async () => {
		const mockResponse = new Response(JSON.stringify({ data: 'test' }), { status: 200 });
		fetchMock.mockResolvedValueOnce(mockResponse);
		const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

		await fetchHttpClient.fetch('https://example.com', { method: 'GET' });

		expect(clearTimeoutSpy).toHaveBeenCalled();
	});

	it('should handle errors from fetch correctly', async () => {
		fetchMock.mockRejectedValueOnce(new Error('Network error'));

		const url = 'https://example.com';

		await expect(fetchHttpClient.fetch(url, {}, 1000)).rejects.toThrow('Network error');
	});
});
