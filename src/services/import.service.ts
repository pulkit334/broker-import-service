import { TradeSchema } from "../schemas/trade.schema";
import { ImportResponse, RowError } from "../types";
import { BrokerFactory } from "../factory/broker.factory";
import { Trade } from "../schemas/trade.schema";

export function processImport(csvText: string): ImportResponse {
  const { broker, parser } = BrokerFactory.getParser(csvText);
  const { rows, errors } = parser.parse(csvText);

  const trades: Trade[] = [];
  const allErrors: RowError[] = [...errors];

  rows.forEach((row, index) => {
    const result = TradeSchema.safeParse({ ...row.trade, rawData: row.rawData });
    if (result.success) {
      trades.push(result.data);
    } else {
      allErrors.push({ row: index + 1, reason: result.error.errors[0].message });
    }
  });

  return {
    broker,
    summary: {
      total: trades.length + allErrors.length,
      valid: trades.length,
      skipped: allErrors.length,
    },
    trades,
    errors: allErrors,
  };
}