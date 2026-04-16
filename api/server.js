// Vercel serverless function — adapts Node.js req/res to TanStack Start's Web Fetch handler
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers.host ?? "localhost";
  const url = `${proto}://${host}${req.url}`;

  // Build Fetch-API headers from Node.js headers
  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val == null) continue;
    if (Array.isArray(val)) headers.set(key, val.join(", "));
    else headers.set(key, val);
  }

  // Buffer request body for non-GET/HEAD requests
  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });
  }

  // Dynamically import the built server (avoids bundling issues)
  const { default: server } = await import("../dist/server/server.js");

  const response = await server.fetch(
    new Request(url, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
    })
  );

  res.status(response.status);
  for (const [key, val] of response.headers.entries()) {
    res.setHeader(key, val);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}
