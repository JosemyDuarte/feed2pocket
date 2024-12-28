import { PocketClient } from './PocketClient';
import { HttpClient } from '../http/FetchHttpClient';

jest.mock('../http/FetchHttpClient');

describe('PocketClient', () => {
 let httpClient: jest.Mocked<HttpClient>;
 let pocketClient: PocketClient;
 const consumerKey = 'test-consumer-key';
 const accessToken = 'test-access-token';

 beforeEach(() => {
  httpClient = {
			 fetch: jest.fn()
	};
  pocketClient = new PocketClient(consumerKey, accessToken, httpClient);
 });

 it('adds item to Pocket successfully', async () => {
  httpClient.fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

  await pocketClient.addItem('https://example.com', ['tag1', 'tag2']);

  expect(httpClient.fetch).toHaveBeenCalledWith('https://getpocket.com/v3/add', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Accept': 'application/json'
   },
   body: JSON.stringify({
    consumer_key: consumerKey,
    access_token: accessToken,
    url: 'https://example.com',
    tags: 'tag1,tag2'
   })
  }, 3000);
 });

 it('throws error when adding item to Pocket fails', async () => {
  httpClient.fetch.mockResolvedValueOnce(new Response('Error', { status: 400 }));

  await expect(pocketClient.addItem('https://example.com')).rejects.toThrow('Failed to add item to Pocket: Error');

  expect(httpClient.fetch).toHaveBeenCalledWith('https://getpocket.com/v3/add', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Accept': 'application/json'
   },
   body: JSON.stringify({
    consumer_key: consumerKey,
    access_token: accessToken,
    url: 'https://example.com'
   })
  }, 3000);
 });

 it('adds item to Pocket without tags', async () => {
  httpClient.fetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

  await pocketClient.addItem('https://example.com');

  expect(httpClient.fetch).toHaveBeenCalledWith('https://getpocket.com/v3/add', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Accept': 'application/json'
   },
   body: JSON.stringify({
    consumer_key: consumerKey,
    access_token: accessToken,
    url: 'https://example.com'
   })
  }, 3000);
 });
});
