import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const clients = new Set<any>();
let pythonProcess: any = null;

export function registerRoutes(app: Express): Server {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const pythonScript = path.join(__dirname, "downloader.py");

  if (pythonProcess) {
    pythonProcess.kill();
  }

  pythonProcess = spawn("python3", [pythonScript]);

  const waitForPythonService = new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      pythonProcess.kill();
      reject(new Error("Python service failed to start"));
    }, 60000);

    pythonProcess.stdout.on('data', (data: Buffer) => {
      output += data.toString();
      console.log(`Python service: ${data}`);
      if (output.includes("Application startup complete")) {
        clearTimeout(timeout);
        resolve(true);
      }
      notifyClients();
    });

    pythonProcess.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      console.error(`Python service error: ${message}`);
      if (!message.includes("INFO:") && !message.includes("WARNING:")) {
        console.error("Critical Python error:", message);
      }
    });

    pythonProcess.on('error', (err: Error) => {
      console.error(`Failed to start Python service: ${err}`);
      clearTimeout(timeout);
      reject(err);
    });

    pythonProcess.on('exit', (code: number) => {
      clearTimeout(timeout);
      if (code !== 0 && code !== null) {
        console.error(`Python service exited with code ${code}`);
        reject(new Error(`Python service exited with code ${code}`));
      }
    });
  });

  app.get("/api/downloads/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ping\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
  });

  function notifyClients() {
    clients.forEach(client => {
      client.write(`data: update\n\n`);
    });
  }

  waitForPythonService.then(() => {
    console.log("Python service is ready");

    app.get("/api/downloads", async (_req, res) => {
      try {
        const response = await fetch("http://localhost:5001/downloads");
        const downloads = await response.json();
        res.json(downloads);
      } catch (error) {
        console.error(error);
        res.status(500).send("Failed to fetch downloads");
      }
    });

    app.post("/api/downloads", async (req, res) => {
      try {
        const response = await fetch("http://localhost:5001/download", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(req.body),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();
        notifyClients();
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).send(error instanceof Error ? error.message : "Failed to start download");
      }
    });
  }).catch((err: Error) => {
    console.error("Failed to start Python service:", err);
    process.exit(1);
  });

  const httpServer = createServer(app);

  process.on('SIGTERM', () => {
    if (pythonProcess) {
      pythonProcess.kill();
    }
  });

  return httpServer;
}