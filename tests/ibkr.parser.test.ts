import { IBKRParser } from "../src/parsers/ibkr.parser";
import * as fs from "fs";
import * as path from "path";

const parser = new IBKRParser();
const ibkrCsv = fs.readFileSync(path.join(__dirname, "fixtures/ibkr.csv"), "utf-8");

describe("IBKRParser", () => {
  it("parses 5 valid trades from the sample CSV", () => {
    const result = parser.parse(ibkrCsv);
    expect(result.rows).toHaveLength(5);
  });

  it("maps BOT to BUY and SLD to SELL", () => {
    const result = parser.parse(ibkrCsv);
    expect(result.rows.some((r) => r.trade.side === "BUY")).toBe(true);
    expect(result.rows.some((r) => r.trade.side === "SELL")).toBe(true);
  });

  it("skips row 5 with zero quantity", () => {
    const result = parser.parse(ibkrCsv);
    const errorForRow5 = result.errors.find((e) => e.row === 5);
    expect(errorForRow5).toBeDefined();
    expect(errorForRow5?.reason).toContain("Quantity must be positive");
  });

  it("normalizes EUR.USD to EUR/USD", () => {
    const result = parser.parse(ibkrCsv);
    const forexRow = result.rows.find((r) => r.trade.symbol === "EUR/USD");
    expect(forexRow).toBeDefined();
  });

  it("handles MM/DD/YYYY date format on row 4", () => {
    const result = parser.parse(ibkrCsv);
    const row4 = result.rows.find((r) => r.trade.symbol === "TSLA");
    expect(row4).toBeDefined();
    expect(row4?.trade.executedAt).toBeDefined();
  });

  it("preserves rawData including Commission and NetAmount", () => {
    const result = parser.parse(ibkrCsv);
    result.rows.forEach((row) => {
      expect(row.rawData).toHaveProperty("Commission");
      expect(row.rawData).toHaveProperty("NetAmount");
    });
  });
});