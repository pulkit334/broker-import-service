import { Queue, Worker } from "bullmq";
import { processImport } from "../services/import.service";

export const importQueue = new Queue("csv-import", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
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
        host: "127.0.0.1",
        port: 6379,
      },
    }
  );
}