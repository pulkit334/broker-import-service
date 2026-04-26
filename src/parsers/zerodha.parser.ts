import { parse } from "csv-parse/sync";
import { IBrokerParser, ParseResult, ParsedRow, RowError } from "./base.parser";

function normalizeRecord(record: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    normalized[key.trim()] = value;
  }
  return normalized;
}

export class ZerodhaParser implements IBrokerParser {
  parse(csvText: string): ParseResult {
    const records = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    const rows: ParsedRow[] = [];
    const errors: RowError[] = [];

    records.forEach((record, index) => {
      const row = normalizeRecord(record);
      const rowNum = index + 1;

      const executedAt = this.parseDate(row["trade_date"]);
      if (!executedAt) {
        errors.push({ row: rowNum, reason: `Invalid date: '${row["trade_date"]}'` });
        return;
      }

      const quantity = Number(row["quantity"]);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ row: rowNum, reason: `Quantity must be positive, got ${row["quantity"]}` });
        return;
      }

      const price = Number(row["price"]);
      const side = row["trade_type"].toUpperCase() as "BUY" | "SELL";
      const totalAmount = side === "SELL" ? -(quantity * price) : quantity * price;

      rows.push({
        trade: {
          symbol: row["symbol"],
          side,
          quantity,
          price,
          totalAmount,
          currency: "INR",
          executedAt,
          broker: "zerodha",
        },
        rawData: row,
      });
    });

    return { rows, errors };
  }

  private parseDate(raw: string): string | null {
    const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!match) return null;
    const [, day, month, year] = match;
    const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
}