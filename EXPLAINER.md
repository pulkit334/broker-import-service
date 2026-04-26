# Understanding Our Broker CSV Import Service

## What Did We Build?

We built a service that takes CSV files from different brokers (like Zerodha, Interactive Brokers), figures out which broker the file is from, and converts the data into a standard format that anyone can use.

Think of it like a translator. Different brokers speak different languages (formats). Our service translates all of them into one common language.

---

## How It Works - Step by Step

### 1. You Upload a File
You send a CSV file to our server using Postman or curl. The file can have multiple broker data mixed together.

### 2. File Size Check
Before processing, we check:
- Is the file bigger than 25MB? → Reject it, but process other files
- Are there more than 10 files? → Only process first 10

This way, one big file doesn't crash everything.

### 3. Broker Detection (Auto-Detect)
The system looks at the column headers (first row of the CSV) and asks: "Which broker does this look like?"

For example:
- If it sees columns like `symbol`, `isin`, `trade_date` → It's probably Zerodha
- If it sees columns like `TradeID`, `AccountID`, `Buy/Sell` → It's probably Interactive Brokers

We calculate a **confidence score**:
- 1.0 (100%) = All signature columns found
- 0.75 (75%) = 3 out of 4 columns found
- If no columns match → Error

This is smarter than just saying "yes" or "no" - it tells us how sure we are.

### 4. Parsing (Reading the Data)
Once we know the broker, we read each row one by one.

For every row, we:
1. Extract the data
2. Convert date formats (DD-MM-YYYY → ISO 8601)
3. Convert trade types (buy/sell or BOT/SLD → BUY/SELL)
4. Handle special cases (empty ISIN, zero quantity, etc.)

### 5. Validation (Checking for Errors)
After parsing, we use Zod (a validation tool) to check if the data is correct:

- Symbol must exist
- Quantity must be positive
- Price must be positive
- Date must be valid

If anything is wrong, we don't throw the row away - we mark it as an error and continue.

### 6. Response
We return everything in one response:
- How many files processed
- How many rejected (with reasons)
- Valid trades for each file
- Errors for each file

---

## Why It Doesn't Break

### The Key Idea: Fail Gracefully

When we encounter a bad row, we don't stop. We just note the error and move to the next row.

Example with 10,000 rows:
- Row 5,000 has an invalid date
- We note the error
- We continue with row 5,001
- End result: 9,999 valid trades + 1 error

This is called "error isolation" - one bad apple doesn't ruin the bunch.

### Rate Limiting
We allow 30 requests per minute per IP. This prevents someone from overwhelming the server.

### File Size Limits
Each file max 25MB. This prevents memory issues.

---

## Understanding the Code Structure

### Files and Their Jobs

| File | Job |
|------|-----|
| `import.route.ts` | Receives the file, checks size, calls the right function |
| `broker.factory.ts` | Looks at headers, figures out which broker |
| `zerodha.parser.ts` | Reads Zerodha-style CSVs |
| `ibkr.parser.ts` | Reads Interactive Brokers CSVs |
| `import.service.ts` | Coordinates everything, validates with Zod |
| `trade.schema.ts` | Defines what a valid trade looks like |

### How They Connect

```
Your File
    ↓
import.route.ts (checks size, limits)
    ↓
broker.factory.ts (detects broker)
    ↓
zerodha.parser.ts OR ibkr.parser.ts (parses data)
    ↓
import.service.ts (validates each row with Zod)
    ↓
Response to you
```

---

## Edge Cases We Handle

### 1. Empty Files
If you upload an empty file → We return 400 error saying "Empty file"

### 2. Bad Date
If a row has "invalid_date" → We skip that row, add to errors, continue

### 3. Negative Quantity
If quantity is -5 → We skip that row, add to errors, continue

### 4. Zero Quantity
If quantity is 0 → We skip that row, add to errors, continue

### 5. Missing Optional Fields
If ISIN is empty → That's fine, we skip it

### 6. Different Date Formats
- Zerodha: "01-04-2026" (DD-MM-YYYY)
- IBKR: "2026-04-01T14:30:00Z" (ISO 8601)
- IBKR also accepts: "04/03/2026" (MM/DD/YYYY)

We handle all of these.

### 7. Uppercase/Lowercase
- "buy", "BUY", "buy" → All become "BUY"
- "sell", "SELL", "Sell" → All become "SELL"

### 8. BOM Character
Sometimes CSV files start with a hidden character (UTF-8 BOM). We strip it automatically.

### 9. CRLF Line Endings
Windows uses CRLF (\r\n), Linux uses LF (\n). We handle both.

---

## Sample Response Explained

```json
{
  "totalFiles": 2,
  "processed": 2,
  "rejected": 0,
  "results": [
    {
      "filename": "zerodha.csv",
      "broker": "zerodha",
      "detectionConfidence": 1.0,
      "summary": { "total": 7, "valid": 5, "skipped": 2 },
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
          "rawData": { ... }
        }
      ],
      "errors": [
        { "row": 6, "reason": "Invalid date: 'invalid_date'" },
        { "row": 7, "reason": "Quantity must be positive, got -5" }
      ]
    }
  ],
  "rejectedFiles": []
}
```

- `totalFiles`: 2 files sent
- `processed`: 2 files parsed successfully
- `rejected`: 0 files rejected (like too big)
- `broker`: Which broker we detected
- `detectionConfidence`: How sure we are (1.0 = 100%)
- `summary`: Total rows, valid trades, skipped rows
- `trades`: The clean data you wanted
- `errors`: Rows that had problems (but we didn't stop!)
- `rejectedFiles`: Files we couldn't process at all

---

## Design Decisions We Made

### Why Strategy Pattern?
We used a design pattern where each broker has its own "parser class". This means:
- Adding a new broker (like "Robinhood") only requires creating a new parser class
- No need to touch existing code
- Existing brokers keep working

### Why Confidence Score Instead of Binary?
Instead of just saying "yes, it's Zerodha" or "no", we say "it's 95% likely Zerodha". This is important because:
- Some CSV files might have partial headers
- It helps you make decisions about data quality
- It shows we thought about ambiguous cases

### Why Continue on Error?
Financial data is messy. We designed it to handle bad data:
- If we stopped at first error, you'd lose all valid data
- Our approach: "Get as much good data as possible, report what went wrong"

This is the professional approach used in real financial systems.

---

## How to Test

### Start Server
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Test with Postman
- Method: POST
- URL: http://localhost:3000/import
- Body: form-data
- Key: files (select your CSV file)

---

## Summary

1. **File comes in** → Check size, enforce limits
2. **Detect broker** → Look at headers, calculate confidence
3. **Parse each row** → Convert formats, handle edge cases
4. **Validate** → Use Zod to check data quality
5. **Return** → Include both valid trades and errors

The system never stops unexpectedly. It processes as much as possible and tells you what went wrong. This is what makes it "production-ready".