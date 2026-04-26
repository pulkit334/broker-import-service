import { parse } from "csv-parse/sync";
import { IBrokerParser, ParseResult, ParsedRow, RowError } from "./base.parser";

function normalizeRecord(record: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    normalized[key.trim()] = value;
  }
  return normalized;
}

export class IBKRParser implements IBrokerParser {
  private readonly sideMap: Record<string, "BUY" | "SELL"> = {
    BOT: "BUY",
    SLD: "SELL",
  };

  parse(csvText: string): ParseResult {
    const records = parse(csvText, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
    const rows: ParsedRow[] = [];
    const errors: RowError[] = [];

    records.forEach((record, index) => {
      const row = normalizeRecord(record);
      const rowNum = index + 1;

      const rawSide = row["Buy/Sell"]?.toUpperCase();
      const side = this.sideMap[rawSide];
      if (!side) {
        errors.push({ row: rowNum, reason: `Unknown side value: '${row["Buy/Sell"]}'` });
        return;
      }

      const quantity = Number(row["Quantity"]);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push({ row: rowNum, reason: `Quantity must be positive, got ${row["Quantity"]}` });
        return;
      }

      const executedAt = this.parseDateTime(row["DateTime"]);
      if (!executedAt) {
        errors.push({ row: rowNum, reason: `Invalid date: '${row["DateTime"]}'` });
        return;
      }

      const price = Number(row["TradePrice"]);
      const symbol = row["Symbol"].replace(".", "/");
      const totalAmount = side === "SELL" ? -(quantity * price) : quantity * price;

      rows.push({
        trade: {
          symbol,
          side,
          quantity,
          price,
          totalAmount,
          currency: row["Currency"],
          executedAt,
          broker: "ibkr",
        },
        rawData: row,
      });
    });

    return { rows, errors };
  }

  private parseDateTime(raw: string): string | null {
    if (!raw) return null;
    if (raw.includes("T") || raw.includes("-")) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, month, day, year] = match;
      const d = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    return null;
  }
}