// ToRungHub WebSocket + HTTP viewer server

const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;

// ---------------- HTTP SERVER (serve index.html) ----------------

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  if (req.method === "GET" && (url === "/" || url === "/index.html")) {
    const filePath = path.join(__dirname, "index.html");

    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error("[ToRungHub-WS] Failed to read index.html:", err);
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.end("Internal Server Error");
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(data);
    });
  } else {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
  }
});

// ---------------- WEBSOCKET SERVER ----------------

const wss = new WebSocket.Server({ server });
const clients = new Set();

function safeJsonParse(data) {
  try {
    return JSON.parse(data.toString());
  } catch (e) {
    return null;
  }
}

wss.on("connection", (ws) => {
  console.log("[ToRungHub-WS] Client connected");
  clients.add(ws);

  ws.on("message", (data) => {
    const msg = safeJsonParse(data);
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "pets_update") {
      const payload = JSON.stringify({
        type: "pets_update",
        player: msg.player || "Unknown",
        placeId: msg.placeId || 0,
        jobId: msg.jobId || "unknown",
        pets: Array.isArray(msg.pets) ? msg.pets : [],
        ts: Date.now()
      });

      // broadcast cho tất cả client (web viewer + Roblox khác)
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }

      console.log(
        "[ToRungHub-WS] pets_update from",
        msg.player,
        "jobId=" + msg.jobId,
        "pets=" + (msg.pets ? msg.pets.length : 0)
      );
    }
  });

  ws.on("close", () => {
    console.log("[ToRungHub-WS] Client disconnected");
    clients.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("[ToRungHub-WS] Client error:", err);
    clients.delete(ws);
  });
});

// ---------------- START SERVER ----------------

server.listen(PORT, () => {
  console.log("[ToRungHub-WS] HTTP + WS listening on port", PORT);
});
