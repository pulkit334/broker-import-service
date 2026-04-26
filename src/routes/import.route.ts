import { Router } from "express";
import multer from "multer";
import { processImport } from "../services/import.service";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/import", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const csvText = req.file.buffer.toString("utf-8");
  if (!csvText.trim()) {
    return res.status(400).json({ error: "Empty file", detail: "The uploaded CSV has no content" });
  }

  try {
    const result = processImport(csvText);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: "Unrecognized broker format", detail: message });
  }
});

export default router;