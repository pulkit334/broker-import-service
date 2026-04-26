import { Trade } from "../schemas/trade.schema";

export interface ParsedRow {
  trade: Partial<Trade>;
  rawData: Record<string, unknown>;
}

export interface RowError {
  row: number;
  reason: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: RowError[];
}

export interface IBrokerParser {
  parse(csvText: string): ParseResult;
}