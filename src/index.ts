import "dotenv/config";
import app from "./app";
import { createImportWorker } from "./queue/import.queue";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const USE_QUEUE = process.env.USE_QUEUE === "true";

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  if (USE_QUEUE) {
    const worker = createImportWorker();
    
    worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.log(`Job ${job?.id} failed: ${err.message}`);
    });

    console.log("Worker started, processing jobs from queue");
  }
};

startServer().catch(console.error);