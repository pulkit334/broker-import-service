import express from "express";
import importRouter from "./routes/import.route";

const app = express();
app.use(express.json());
app.use("/", importRouter);

export default app;