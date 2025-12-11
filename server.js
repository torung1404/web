const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log("[ToRungHub-WS] Listening on port", PORT);

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

      for (const client of clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
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
