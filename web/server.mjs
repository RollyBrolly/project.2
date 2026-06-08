import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

const port = Number.parseInt(process.env.PORT || "3001", 10);
const root = resolve(import.meta.dirname);
const projectRoot = resolve(root, "..");

const vendorFiles = new Map([
  ["/vendor/freighter-api.js", resolve(projectRoot, "node_modules/@stellar/freighter-api/build/index.min.js")],
  ["/vendor/stellar-sdk.js", resolve(projectRoot, "node_modules/@stellar/stellar-sdk/dist/stellar-sdk.min.js")],
]);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
};

createServer((request, response) => {
  const url = new URL(request.url || "/", `http://localhost:${port}`);
  const vendorPath = vendorFiles.get(url.pathname);
  if (vendorPath) {
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    createReadStream(vendorPath).pipe(response);
    return;
  }

  const safePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = resolve(join(root, safePath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "content-type": types[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Emergency Fund Trigger running at http://localhost:${port}`);
});
