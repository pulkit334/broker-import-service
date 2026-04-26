import { IBrokerParser } from "../parsers/base.parser";
import { ZerodhaParser } from "../parsers/zerodha.parser";
import { IBKRParser } from "../parsers/ibkr.parser";

const BROKER_REGISTRY: Array<{
  name: string;
  signature: string[];
  parser: IBrokerParser;
  weight: number;
}> = [
  {
    name: "zerodha",
    signature: ["symbol", "isin", "trade_date", "trade_type"],
    parser: new ZerodhaParser(),
    weight: 4,
  },
  {
    name: "ibkr",
    signature: ["TradeID", "AccountID", "Buy/Sell", "TradePrice"],
    parser: new IBKRParser(),
    weight: 4,
  },
];

interface DetectionResult {
  broker: string;
  detectionConfidence: number;
  parser: IBrokerParser;
}

export class BrokerFactory {
  static getParser(csvText: string): DetectionResult {
    const headers = BrokerFactory.extractHeaders(csvText);
    const scores: Array<{ name: string; confidence: number; parser: IBrokerParser }> = [];

    for (const entry of BROKER_REGISTRY) {
      let matchedColumns = 0;
      for (const sigCol of entry.signature) {
        if (headers.some((h) => h.toLowerCase() === sigCol.toLowerCase())) {
          matchedColumns++;
        }
      }
      const confidence = matchedColumns / entry.signature.length;
      scores.push({ name: entry.name, confidence, parser: entry.parser });
    }

    scores.sort((a, b) => b.confidence - a.confidence);
    
    if (scores[0].confidence > 0) {
      return {
        broker: scores[0].name,
        detectionConfidence: Math.round(scores[0].confidence * 100) / 100,
        parser: scores[0].parser,
      };
    }

    throw new Error(`Unrecognized broker format. Headers found: [${headers.join(", ")}]`);
  }

  private static extractHeaders(csvText: string): string[] {
    const cleaned = csvText.replace(/^\uFEFF/, "").trim();
    const firstLine = cleaned.split("\n")[0];
    return firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  }
}