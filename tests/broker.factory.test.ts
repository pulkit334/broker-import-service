import { BrokerFactory } from "../src/factory/broker.factory";
import * as fs from "fs";
import * as path from "path";

const zerodhaCsv = fs.readFileSync(path.join(__dirname, "fixtures/zerodha.csv"), "utf-8");
const ibkrCsv = fs.readFileSync(path.join(__dirname, "fixtures/ibkr.csv"), "utf-8");

describe("BrokerFactory", () => {
  it("detects zerodha from zerodha CSV headers", () => {
    const result = BrokerFactory.getParser(zerodhaCsv);
    expect(result.broker).toBe("zerodha");
  });

  it("detects ibkr from ibkr CSV headers", () => {
    const result = BrokerFactory.getParser(ibkrCsv);
    expect(result.broker).toBe("ibkr");
  });

  it("throws on unrecognized headers", () => {
    const unknownCsv = "col1,col2,col3\nval1,val2,val3";
    expect(() => BrokerFactory.getParser(unknownCsv)).toThrow();
  });

  it("throws on empty string input", () => {
    expect(() => BrokerFactory.getParser("")).toThrow();
  });

  it("strips BOM from header before matching", () => {
    const bomCsv = "\uFEFFsymbol,isin,trade_date,trade_type,quantity,price\nRELIANCE,INE002A01018,01-04-2026,buy,10,2450.50";
    const result = BrokerFactory.getParser(bomCsv);
    expect(result.broker).toBe("zerodha");
  });
});