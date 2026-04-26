import { IBrokerParser } from "../parsers/base.parser";
import { ZerodhaParser } from "../parsers/zerodha.parser";
import { IBKRParser } from "../parsers/ibkr.parser";

const BROKER_REGISTRY: Array<{
  name: string;
  signature: string[];
  parser: IBrokerParser;
}> = [
  {
    name: "zerodha",
    signature: ["symbol", "isin", "trade_date", "trade_type"],
    parser: new ZerodhaParser(),
  },
  {
    name: "ibkr",
    signature: ["TradeID", "AccountID", "Buy/Sell", "TradePrice"],
    parser: new IBKRParser(),
  },
];

export class BrokerFactory {
  static getParser(csvText: string): { broker: string; parser: IBrokerParser } {
    const headers = BrokerFactory.extractHeaders(csvText);

    for (const entry of BROKER_REGISTRY) {
      const matches = entry.signature.every((col) => 
        headers.some((h) => h.toLowerCase() === col.toLowerCase())
      );
      if (matches) {
        return { broker: entry.name, parser: entry.parser };
      }
    }

    throw new Error(`Unrecognized broker format. Headers found: [${headers.join(", ")}]`);
  }

  private static extractHeaders(csvText: string): string[] {
    const cleaned = csvText.replace(/^\uFEFF/, "").trim();
    const firstLine = cleaned.split("\n")[0];
    return firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  }
}