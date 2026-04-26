import { Queue, Worker } from "bullmq";
import { processImport } from "../services/import.service";

const REDIS_URL = "redis://default:gQAAAAAAAaETAAIgcDI2OTljZDBiYTViM2U0Y2UyYjVhOTMzYmE2MGE2NDA3OA@thankful-antelope-106771.upstash.io:6379";

export const importQueue = new Queue("csv-import", {
  connection: {
    url: REDIS_URL,
    tls: {},
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
        tls: {},
      },
    }
  );
}