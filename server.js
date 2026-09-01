// Minimal static file server for Railway. No dependencies: Railway's Node
// builder runs `npm start`, and everything here is in the standard library.
//
// The explainer pages are large (about 1.3 MB and 5 MB) because the whole
// simulation trace is inlined, so gzip is doing real work here — it takes the
// public page under 300 KB on the wire.

const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml",
  ".py": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".md", ".js", ".css", ".json", ".svg",
                              ".py", ".txt"]);

// Friendly URLs, so the links people share do not carry a file extension.
const ALIASES = {
  "/": "/index.html",
  "/full": "/full.html",
  "/detailed": "/full.html",
  "/writeup": "/writeup-public.md",
  "/writeup-full": "/writeup-full.md",
};

http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    res.writeHead(400).end("bad request");
    return;
  }
  urlPath = ALIASES[urlPath.replace(/\/+$/, "") || "/"] || urlPath;

  // Resolve inside ROOT only — no path traversal.
  const file = path.join(ROOT, path.normalize(urlPath));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" })
         .end('<h1>404</h1><p><a href="/">Back to the explainer</a></p>');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      "content-type": TYPES[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "public, max-age=300"
                                       : "public, max-age=86400",
      "x-content-type-options": "nosniff",
    };
    const accepts = (req.headers["accept-encoding"] || "").includes("gzip");
    if (accepts && COMPRESSIBLE.has(ext)) {
      headers["content-encoding"] = "gzip";
      headers.vary = "accept-encoding";
      res.writeHead(200, headers);
      fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    } else {
      headers["content-length"] = st.size;
      res.writeHead(200, headers);
      fs.createReadStream(file).pipe(res);
    }
  });
}).listen(PORT, () => console.log("listening on " + PORT));
