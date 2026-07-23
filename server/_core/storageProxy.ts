// Storage proxy middleware for serving files from Manus storage
// Handles /manus-storage/{key} requests and proxies them to the Forge storage API

import { Request, Response, NextFunction } from "express";
import { Readable } from "stream";
import { ENV } from "./env";

export function storageProxyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only handle /manus-storage/ requests
  if (!req.path.startsWith("/manus-storage/")) {
    return next();
  }

  // Extract the storage key from the URL
  const storageKey = req.path.replace(/^\/manus-storage\//, "");

  if (!storageKey) {
    return res.status(400).json({ error: "Missing storage key" });
  }

  // Proxy the request to the Forge storage API
  const forgeApiUrl = ENV.forgeApiUrl?.replace(/\/+$/, "");
  const forgeApiKey = ENV.forgeApiKey;

  if (!forgeApiUrl || !forgeApiKey) {
    console.error("Storage proxy credentials missing");
    return res.status(500).json({ error: "Storage proxy not configured" });
  }

  const downloadUrl = new URL("v1/storage/downloadUrl", `${forgeApiUrl}/`);
  downloadUrl.searchParams.set("path", storageKey);

  // Fetch the download URL from Forge
  fetch(downloadUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${forgeApiKey}`,
    },
  })
    .then(async (forgeRes) => {
      if (!forgeRes.ok) {
        const error = await forgeRes.text().catch(() => forgeRes.statusText);
        console.error(`Forge storage error: ${forgeRes.status} ${error}`);
        console.error(`Storage key: ${storageKey}`);
        console.error(`Download URL: ${downloadUrl.toString()}`);
        return res.status(forgeRes.status).json({ error: "Storage fetch failed", details: error });
      }

      const data = await forgeRes.json();
      const fileUrl = data.url;

      if (!fileUrl) {
        console.error(`No download URL returned from Forge for key: ${storageKey}`);
        return res.status(500).json({ error: "No download URL from storage", key: storageKey });
      }

      // Fetch the actual file from the signed URL
      const fileRes = await fetch(fileUrl);

      if (!fileRes.ok) {
        console.error(`File fetch failed: ${fileRes.status} from URL: ${fileUrl}`);
        return res.status(fileRes.status).json({ error: "File fetch failed", status: fileRes.status });
      }

      // Set appropriate headers
      const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
      const contentLength = fileRes.headers.get("content-length");

      res.setHeader("Content-Type", contentType);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      // Add cache headers for static assets
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      // Stream the file to the response
      if (fileRes.body) {
        // Convert ReadableStream to Node.js Readable
        const reader = fileRes.body.getReader();
        const readable = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
              } else {
                this.push(Buffer.from(value));
              }
            } catch (error) {
              this.destroy(error as Error);
            }
          },
        });
        readable.pipe(res);
      } else {
        const buffer = await fileRes.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    })
    .catch((error) => {
      console.error("Storage proxy error:", error);
      res.status(500).json({ error: "Storage proxy error" });
    });
}
