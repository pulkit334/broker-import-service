import request from "supertest";
import app from "../src/app";
import { flushCache } from "../src/cache/cache";

describe("Import API Edge Cases", () => {
  beforeEach(() => flushCache());

  it("returns 400 for empty file upload", async () => {
    const response = await request(app)
      .post("/import")
      .attach("files", Buffer.from(""), "empty.csv");
    expect(response.status).toBe(400);
  });

  it("handles CSV with only a header row and no data", async () => {
    const csv = "symbol,isin,trade_date,trade_type,quantity,price\n";
    const response = await request(app)
      .post("/import")
      .attach("files", Buffer.from(csv), "header-only.csv");
    expect(response.status).toBe(200);
    expect(response.body.results[0].trades).toHaveLength(0);
  });

  it("handles a CSV where all rows are invalid", async () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price
RELIANCE,INE002A01018,bad_date,buy,10,2450.50
INFY,INE009A01021,01-04-2026,sell,-5,1520.75`;
    const response = await request(app)
      .post("/import")
      .attach("files", Buffer.from(csv), "all-invalid.csv");
    expect(response.status).toBe(200);
    expect(response.body.results[0].trades).toHaveLength(0);
    expect(response.body.results[0].errors.length).toBeGreaterThan(0);
  });

  it("handles a CSV where only one row is valid", async () => {
    const csv = `symbol,isin,trade_date,trade_type,quantity,price
RELIANCE,INE002A01018,01-04-2026,buy,10,2450.50
INFY,INE009A01021,bad_date,sell,25,1520.75`;
    const response = await request(app)
      .post("/import")
      .attach("files", Buffer.from(csv), "one-valid.csv");
    expect(response.status).toBe(200);
    expect(response.body.results[0].trades).toHaveLength(1);
    expect(response.body.results[0].errors).toHaveLength(1);
  });

  it("handles extra whitespace in headers", async () => {
    const csv = "symbol ,isin  ,trade_date,trade_type,quantity,price\nRELIANCE,INE002A01018,01-04-2026,buy,10,2450.50";
    const response = await request(app)
      .post("/import")
      .attach("files", Buffer.from(csv), "whitespace.csv");
    expect(response.status).toBe(200);
    expect(response.body.results[0].trades).toHaveLength(1);
  });

  it("handles CRLF line endings", async () => {
    const csv = "symbol,isin,trade_date,trade_type,quantity,price\r\nRELIANCE,INE002A01018,01-04-2026,buy,10,2450.50";
    const response = await request(app)
      .post("/import")
      .attach("files", Buffer.from(csv), "crlf.csv");
    expect(response.status).toBe(200);
    expect(response.body.results[0].trades).toHaveLength(1);
  });

  it("handles a CSV with BOM at the start", async () => {
    const csv = "\uFEFFsymbol,isin,trade_date,trade_type,quantity,price\nRELIANCE,INE002A01018,01-04-2026,buy,10,2450.50";
    const response = await request(app)
      .post("/import")
      .attach("files", Buffer.from(csv), "bom.csv");
    expect(response.status).toBe(200);
    expect(response.body.results[0].broker).toBe("zerodha");
  });
});