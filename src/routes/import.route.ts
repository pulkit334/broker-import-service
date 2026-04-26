import "dotenv/config";
import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { processImport } from "../services/import.service";
import { getCache, setCache, hashContent } from "../cache/cache";

const router = Router();

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", detail: "Rate limit exceeded. Try again in a minute." },
});

const USE_QUEUE = process.env.USE_QUEUE === "true";

router.post("/import", limiter, upload.array("files", MAX_FILES), async (req, res) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const emptyFiles = files.filter(f => !f.buffer || !f.buffer.toString("utf-8").trim());
  if (emptyFiles.length === files.length) {
    return res.status(400).json({ error: "Empty file", detail: "All uploaded files are empty" });
  }

  if (USE_QUEUE) {
    const { importQueue } = await import("../queue/import.queue");
    const results: Record<string, unknown>[] = [];
    const rejected: { filename: string; reason: string }[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push({ filename: file.originalname, reason: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` });
        continue;
      }

      const csvText = file.buffer.toString("utf-8");
      if (!csvText.trim()) {
        rejected.push({ filename: file.originalname, reason: "Empty file" });
        continue;
      }

      try {
        const job = await importQueue.add("process-csv", { csvText, filename: file.originalname }, { attempts: 3, backoff: { type: "exponential", delay: 1000 } });
        results.push({ filename: file.originalname, jobId: job.id, status: "queued" });
      } catch (err: unknown) {
        rejected.push({ filename: file.originalname, reason: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return res.json({ totalFiles: files.length, processed: results.length, rejected: rejected.length, results, rejectedFiles: rejected });
  }

  const results: Record<string, unknown>[] = [];
  const rejected: { filename: string; reason: string }[] = [];

  for (const file of files) {
    const csvText = file.buffer.toString("utf-8");
    if (!csvText.trim()) {
      rejected.push({ filename: file.originalname, reason: "Empty file" });
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      rejected.push({ filename: file.originalname, reason: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` });
      continue;
    }

    const cacheKey = hashContent(csvText);
    const cached = getCache(cacheKey);
    if (cached) {
      results.push({ filename: file.originalname, ...(cached as object), fromCache: true });
      continue;
    }

    try {
      const result = processImport(csvText);
      setCache(cacheKey, result);
      results.push({ filename: file.originalname, ...result });
    } catch (err: unknown) {
      rejected.push({ filename: file.originalname, reason: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  res.json({ totalFiles: files.length, processed: results.length, rejected: rejected.length, results, rejectedFiles: rejected });
});

export default router;