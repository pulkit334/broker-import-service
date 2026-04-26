import { Queue, Worker } from "bullmq";
import { processImport } from "../services/import.service";
import "dotenv/config";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const importQueue = new Queue("csv-import", {
  connection: {
    url: REDIS_URL,
    tls: REDIS_URL.includes("upstash") ? {} : undefined,
  },
});

export function createImportWorker() {
  return new Worker(
    "csv-import",
    async (job) => {
      const { csvText, filename } = job.data;
      const result = processImport(csvText);
      return { filename, ...result };
    },
    {
      connection: {
        url: REDIS_URL,
        tls: REDIS_URL.includes("upstash") ? {} : undefined,
      },
    }
  );
}