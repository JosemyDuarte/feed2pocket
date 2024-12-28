# Feeds 2 Pocket

## Overview

Feeds 2 Pocket fetches and store RSS items into [Pocket](https://getpocket.com/) for you to read later. Motivation for this project is to have a simple way to read my RSS feeds on my [Kobo e-reader](https://help.kobo.com/hc/en-us/articles/360017763753-Use-the-Pocket-App-with-your-Kobo-eReader).

This project is designed to be run as a cron job in [Cloudflare Workers](https://workers.cloudflare.com/).

Notice that this project doesn't have a user interface. You will need to configure everything is a non-fancy way, unfortunately.

## Features

- Fetch RSS feeds
- Store RSS items into Pocket
- Retry mechanism in case of failure to fetch or store an item
- Avoid duplicates
- Allow to specify tags for each feed

## Configuration

The following environment variable is required and can be added as a secret in Cloudflare dashboard or in the `wrangler.toml` file:

- `POCKET_CONSUMER_KEY`: See [Pocket API](https://getpocket.com/developer/docs/authentication) for how to get your consumer key.

You will also need to create a D1 Database in Cloudflare to run the migration scripts. You can do this by running the following command:

```bash
wrangler d1 create f2p-db
```

Then you can run the migration script:

```bash
wrangler d1 migrations apply --remote F2P_DB
```

Copy the `wrangler.toml.example` to `wrangler.toml` and update it with your database ID (you can get it from Cloudflare dashboard).

## Usage

Add your Pocket access token to the database (you can do it with migration scripts or from Cloudflare dashboard):

```sql
--- Check here how to get your Pocket access token: https://getpocket.com/developer/docs/authentication
INSERT INTO users (username, access_token) VALUES ('your_username', 'access_token');
```

Add the feeds you want to fetch:

```sql
INSERT INTO feeds (url, tags, user_id) VALUES ('https://lobste.rs/top/rss', 'programming,tech', 1);
```

Now you can run the worker:

```bash
 npm run deploy
```

Notice that by default **the worker runs once a day**. You can change this by updating the cron expression in the `wrangler.toml` file or from Cloudflare dashboard.
