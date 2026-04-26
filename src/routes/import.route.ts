import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { processImport } from "../services/import.service";

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

router.post("/import", limiter, upload.array("files", MAX_FILES), (req, res) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const emptyFiles = files.filter(f => !f.buffer || !f.buffer.toString("utf-8").trim());
  if (emptyFiles.length === files.length) {
    return res.status(400).json({ error: "Empty file", detail: "All uploaded files are empty" });
  }

  const results: Record<string, unknown>[] = [];
  const rejected: { filename: string; reason: string }[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      rejected.push({
        filename: file.originalname,
        reason: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      });
      continue;
    }

    const csvText = file.buffer.toString("utf-8");
    if (!csvText.trim()) {
      rejected.push({
        filename: file.originalname,
        reason: "Empty file",
      });
      continue;
    }

    try {
      const result = processImport(csvText);
      results.push({
        filename: file.originalname,
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      rejected.push({
        filename: file.originalname,
        reason: message,
      });
    }
  }

  res.json({
    totalFiles: files.length,
    processed: results.length,
    rejected: rejected.length,
    results,
    rejectedFiles: rejected,
  });
});

export default router;