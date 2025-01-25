import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Sets up Vite with custom configuration and integrates it with an Express server
 * @example
 * setupVite(app, server)
 * // app will now use Vite middleware
 * @param {Express} app - The Express application instance to which Vite is added.
 * @param {Server} server - The server instance used for hot module replacement.
 * @returns {Promise<void>} A promise that resolves once the Vite setup is complete.
 * @description
 *   - Utilizes a custom Vite logger to exit the process upon encountering an error.
 *   - Configures Vite in middleware mode for integration with the Express app.
 *   - Ensures `index.html` is reloaded from disk for live updates.
 */
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`)
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Serves static files from the 'public' directory and falls back to 'index.html' for routes not found.
 * @example
 * serveStatic(app)
 * // Static content served
 * @param {Express} app - The Express application instance to configure static file serving.
 * @returns {void} The function does not return a value.
 * @description
 *   - Ensures the 'public' directory exists before setting up static file serving.
 *   - Throws an error if the 'public' directory is not found, instructing to build the client first.
 *   - Uses wildcard route handling to send 'index.html' for any unmatched routes, supporting single-page applications.
 */
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
