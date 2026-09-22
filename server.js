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
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".py": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
const COMPRESSIBLE = new Set([".html", ".md", ".js", ".css", ".json", ".svg",
                              ".py", ".txt"]);

// Friendly URLs, so the links people share do not carry a file extension.
const ALIASES = {
  // The site. "/" is the call to action; the rest are the deep pages.
  "/": "/index.html",
  "/questions": "/questions.html",
  "/faq": "/questions.html",
  "/safety": "/safety.html",
  "/crashes": "/crashes.html",
  "/traffic": "/traffic.html",
  "/emergency": "/emergency.html",
  "/parking": "/parking.html",
  "/business": "/parking.html",
  "/what-drives-traffic": "/what-drives-traffic.html",
  "/examples": "/examples.html",
  "/process": "/process.html",
  // The simulation editions. The build-up walk used to be the front page, so
  // the old /buildup links land on it at its new address.
  "/simulation": "/simulation.html",
  "/buildup": "/simulation.html",
  "/build-up": "/simulation.html",
  "/short": "/short.html",
  "/public": "/short.html",
  "/full": "/full.html",
  "/detailed": "/full.html",
  "/writeup": "/writeup-public.md",
  "/writeup-full": "/writeup-full.md",
};

// Working files that live in the repo but are not part of the site.
const PRIVATE = /^\/(\.git|\.claude|planning|node_modules)(\/|$)|^\/(CLAUDE|DEPLOY|README)\.md$/i;

http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    res.writeHead(400).end("bad request");
    return;
  }
  urlPath = ALIASES[urlPath.replace(/\/+$/, "") || "/"] || urlPath;
  if (PRIVATE.test(urlPath)) {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" })
       .end('<h1>404</h1><p><a href="/">Back to the site</a></p>');
    return;
  }

  // Resolve inside ROOT only — no path traversal.
  const file = path.join(ROOT, path.normalize(urlPath));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" })
         .end('<h1>404</h1><p><a href="/">Back to the site</a></p>');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      "content-type": TYPES[ext] || "application/octet-stream",
      // Pages, styles, scripts and their data change together, so they share a short
      // cache; media is large and rarely changes.
      "cache-control": [".html", ".css", ".js", ".json"].includes(ext) ? "public, max-age=300"
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
      // Byte ranges: iOS Safari will not play an MP4 without them, and they let
      // any browser seek a video without downloading all of it first.
      headers["accept-ranges"] = "bytes";
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if (m && (m[1] || m[2])) {
        let start = m[1] ? parseInt(m[1], 10) : st.size - parseInt(m[2], 10);
        let end = m[1] && m[2] ? parseInt(m[2], 10) : st.size - 1;
        start = Math.max(0, start); end = Math.min(end, st.size - 1);
        if (start > end) {
          res.writeHead(416, { "content-range": `bytes */${st.size}` }).end();
          return;
        }
        headers["content-range"] = `bytes ${start}-${end}/${st.size}`;
        headers["content-length"] = end - start + 1;
        res.writeHead(206, headers);
        fs.createReadStream(file, { start, end }).pipe(res);
        return;
      }
      headers["content-length"] = st.size;
      res.writeHead(200, headers);
      fs.createReadStream(file).pipe(res);
    }
  });
}).listen(PORT, () => console.log("listening on " + PORT));
