import { ZerodhaParser } from "../src/parsers/zerodha.parser";
import * as fs from "fs";
import * as path from "path";

const parser = new ZerodhaParser();
const zerodhaCsv = fs.readFileSync(path.join(__dirname, "fixtures/zerodha.csv"), "utf-8");

describe("ZerodhaParser", () => {
  it("parses 5 valid trades from the sample CSV", () => {
    const result = parser.parse(zerodhaCsv);
    expect(result.rows).toHaveLength(5);
  });

  it("skips row 6 with invalid date", () => {
    const result = parser.parse(zerodhaCsv);
    const errorForRow6 = result.errors.find((e) => e.row === 6);
    expect(errorForRow6).toBeDefined();
    expect(errorForRow6?.reason).toContain("Invalid date");
  });

  it("skips row 7 with negative quantity", () => {
    const result = parser.parse(zerodhaCsv);
    const errorForRow7 = result.errors.find((e) => e.row === 7);
    expect(errorForRow7).toBeDefined();
    expect(errorForRow7?.reason).toContain("Quantity must be positive");
  });

  it("normalizes trade_type to uppercase BUY/SELL", () => {
    const result = parser.parse(zerodhaCsv);
    const buyRows = result.rows.filter((r) => r.trade.side === "BUY");
    const sellRows = result.rows.filter((r) => r.trade.side === "SELL");
    expect(buyRows.length).toBeGreaterThan(0);
    expect(sellRows.length).toBeGreaterThan(0);
  });

  it("sets currency to INR for all rows", () => {
    const result = parser.parse(zerodhaCsv);
    result.rows.forEach((row) => {
      expect(row.trade.currency).toBe("INR");
    });
  });

  it("preserves rawData for each valid row", () => {
    const result = parser.parse(zerodhaCsv);
    result.rows.forEach((row) => {
      expect(row.rawData).toBeDefined();
      expect(Object.keys(row.rawData).length).toBeGreaterThan(0);
    });
  });
});