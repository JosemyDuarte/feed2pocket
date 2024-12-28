import Parser from 'rss-parser';

export interface FeedParser {
	parseString(xml: string): Promise<{ items: Parser.Item[] }>;
}

export class FeedParserXML implements FeedParser {
	private parser: Parser;

	constructor() {
		this.parser = new Parser();
	}

	parseString(xml: string): Promise<{ items: Parser.Item[] }> {
		return this.parser.parseString(xml);
	}
}
