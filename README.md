# Broker CSV Trade Import Service

A production-ready Node.js/TypeScript service that normalizes broker trade export CSVs into a standardized format. Accepts CSV files from multiple brokers, auto-detects the format, parses and validates trades, and returns structured JSON responses.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | v18+ | Runtime |
| TypeScript | 5.x | Type safety with strict mode |
| Express | 4.x | HTTP server & routing |
| Zod | 3.x | Schema validation |
| csv-parse | 5.x | CSV parsing |
| Multer | 1.x | Multipart file uploads |
| Jest | 29.x | Testing framework |
| ts-jest | 29.x | TypeScript support for Jest |

## Features

- **Multi-broker support** — Auto-detects and parses CSVs from Zerodha and Interactive Brokers
- **Smart format detection** — Header fingerprinting identifies broker type automatically
- **Robust error handling** — Row-level errors don't crash imports; invalid rows are skipped with clear reasons
- **Schema validation** — Zod ensures data integrity before acceptance
- **Extensible architecture** — Add new brokers without touching existing code
- **Edge case handling** — BOM characters, CRLF line endings, whitespace in headers, mixed date formats

## Quick Start

```bash
# Clone the repository
git clone https://github.com/pulkit334/broker-import-service.git
cd broker-import-service

# Install dependencies
npm install

# Run development server
npm run dev
# Server running at http://localhost:3000

# Run tests
npm test
```

## Project Structure

```
broker-import-service/
├── src/
│   ├── parsers/
│   │   ├── base.parser.ts        # IBrokerParser interface
│   │   ├── zerodha.parser.ts     # Zerodha CSV parser
│   │   └── ibkr.parser.ts        # Interactive Brokers CSV parser
│   ├── factory/
│   │   └── broker.factory.ts     # Broker auto-detection
│   ├── services/
│   │   └── import.service.ts     # Orchestration layer
│   ├── schemas/
│   │   └── trade.schema.ts       # Zod validation schema
│   ├── routes/
│   │   └── import.route.ts       # POST /import endpoint
│   ├── types/
│   │   └── index.ts              # Shared type definitions
│   ├── app.ts                    # Express app setup
│   └── index.ts                  # Entry point
├── tests/
│   ├── fixtures/
│   │   ├── zerodha.csv           # Sample Zerodha export
│   │   └── ibkr.csv              # Sample IBKR export
│   ├── zerodha.parser.test.ts
│   ├── ibkr.parser.test.ts
│   ├── broker.factory.test.ts
│   └── edge-cases.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## API Reference

### POST /import

Upload a CSV file for parsing and normalization.

**Request**

```bash
curl -X POST http://localhost:3000/import \
  -F "file=@path/to/trades.csv"
```

**Content-Type:** `multipart/form-data`  
**Field name:** `file`

**Response (Success)**

```json
{
  "broker": "zerodha",
  "summary": {
    "total": 7,
    "valid": 5,
    "skipped": 2
  },
  "trades": [
    {
      "symbol": "RELIANCE",
      "side": "BUY",
      "quantity": 10,
      "price": 2450.50,
      "totalAmount": 24505.00,
      "currency": "INR",
      "executedAt": "2026-04-01T00:00:00.000Z",
      "broker": "zerodha",
      "rawData": {
        "symbol": "RELIANCE",
        "isin": "INE002A01018",
        "trade_date": "01-04-2026",
        "trade_type": "buy",
        "quantity": "10",
        "price": "2450.50"
      }
    }
  ],
  "errors": [
    { "row": 6, "reason": "Invalid date: 'invalid_date'" },
    { "row": 7, "reason": "Quantity must be positive, got -5" }
  ]
}
```

**Response (Unrecognized Format)**

```json
HTTP 400
{
  "error": "Unrecognized broker format",
  "detail": "Unrecognized broker format. Headers found: [col1, col2, col3]"
}
```

**Response (Empty File)**

```json
HTTP 400
{
  "error": "Empty file",
  "detail": "The uploaded CSV has no content"
}
```

## Supported Brokers

### Zerodha
- **Date format:** DD-MM-YYYY → ISO 8601
- **Side:** `buy`/`sell`/`BUY`/`SELL` → normalized to `BUY`/`SELL`
- **Currency:** Always INR (inferred)
- **Skipped rows:** Invalid dates, zero or negative quantity

### Interactive Brokers (IBKR)
- **Date format:** ISO 8601 with timezone or MM/DD/YYYY
- **Side:** `BOT` → `BUY`, `SLD` → `SELL`
- **Symbol normalization:** `EUR.USD` → `EUR/USD`
- **Skipped rows:** Zero or negative quantity, invalid dates

## Error Handling

Three levels of error handling:

| Level | Error | Response |
|-------|-------|----------|
| **Request** | No file, empty file | HTTP 400 with message |
| **Detection** | Unknown broker format | HTTP 400 with detected headers |
| **Row** | Invalid date, bad quantity, Zod failure | Logged to errors[], row skipped |

Row-level errors never crash an import — valid trades are processed independently.

## Design Decisions

### Why Express?
Express is minimal, battle-tested, and integrates seamlessly with middleware like multer for file uploads. It provides just enough structure without the overhead of larger frameworks.

### Why csv-parse?
The `csv-parse` library offers a synchronous API that plays well with TypeScript's type inference. It handles quoted fields, escaped characters, and mixed line endings without additional configuration.

### Strategy Pattern for Parsers
Each broker has unique CSV conventions (date formats, column names, side indicators). The Strategy pattern isolates this complexity:
- `IBrokerParser` defines the contract
- `ZerodhaParser` handles Zerodha's format
- `IBKRParser` handles IBKR's format
- Service layer remains broker-agnostic

### Factory for Auto-Detection
The `BrokerFactory` uses header fingerprinting — a minimal set of unique column names per broker — to detect the format without user configuration. This allows seamless handling of any registered broker format.

### Adding a New Broker

1. Create `src/parsers/newbroker.parser.ts` implementing `IBrokerParser`
2. Add entry to `BROKER_REGISTRY` in `src/factory/broker.factory.ts`:

```typescript
{
  name: "newbroker",
  signature: ["uniqueColumn1", "uniqueColumn2"],
  parser: new NewBrokerParser(),
}
```

No changes to service layer or existing parsers required.

## Test Coverage

```
npm test

PASS tests/zerodha.parser.test.ts
PASS tests/ibkr.parser.test.ts
PASS tests/broker.factory.test.ts
PASS tests/edge-cases.test.ts

Test Suites: 4 passed, 4 total
Tests:       24 passed, 24 total
```

### Test Categories

- **Parser tests** — Verify correct parsing of valid trades
- **Error handling** — Invalid dates, zero/negative quantities
- **Format detection** — Broker identification from headers
- **Edge cases** — BOM, CRLF, whitespace, empty files, all-invalid CSVs

## Trade Schema

```typescript
{
  symbol: string;          // e.g. "AAPL", "EUR/USD"
  side: "BUY" | "SELL";
  quantity: number;        // positive
  price: number;           // positive
  totalAmount: number;     // quantity * price (negative for SELL)
  currency: string;        // 3-letter code: "USD", "INR", "EUR"
  executedAt: string;      // ISO 8601 datetime
  broker: string;         // "zerodha" | "ibkr"
  rawData: object;         // original CSV row for auditability
}
```

## License

ISC