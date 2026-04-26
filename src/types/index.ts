import { Trade } from "../schemas/trade.schema";

export interface RowError {
  row: number;
  reason: string;
}

export interface ImportResponse {
  broker: string;
  summary: { total: number; valid: number; skipped: number };
  trades: Trade[];
  errors: RowError[];
}