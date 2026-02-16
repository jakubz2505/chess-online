const express = require("express");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 9090;

// Slúži statické súbory (index.html, js, css…)
app.use(express.static(path.join(__dirname)));

const server = app.listen(PORT, () => {
    console.log("Server beží na porte " + PORT);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

let waitingPlayer = null;

wss.on("connection", (ws) => {
    console.log("Player connected");

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        if (data.type === "play") {
            if (!waitingPlayer) {
                waitingPlayer = ws;
                ws.send(JSON.stringify({ type: "waiting" }));
            } else {
                ws.opponent = waitingPlayer;
                waitingPlayer.opponent = ws;

                ws.send(JSON.stringify({ type: "start", color: "black" }));
                waitingPlayer.send(JSON.stringify({ type: "start", color: "white" }));

                waitingPlayer = null;
            }
        }

        if (data.type === "move" && ws.opponent) {
            ws.opponent.send(JSON.stringify({ type: "move", move: data.move }));
        }

        if (data.type === "gameOver" && ws.opponent) {
            ws.opponent.send(JSON.stringify({ type: "gameOver", winner: data.winner }));
        }

        if (data.type === "offerDraw" && ws.opponent) {
            ws.opponent.send(JSON.stringify({ type: "offerDraw" }));
        }

        if (data.type === "acceptDraw" && ws.opponent) {
            ws.opponent.send(JSON.stringify({ type: "acceptDraw" }));
        }

        if (data.type === "rejectDraw" && ws.opponent) {
            ws.opponent.send(JSON.stringify({ type: "rejectDraw" }));
        }

        if (data.type === "resign" && ws.opponent) {
            ws.opponent.send(JSON.stringify({ type: "resign" }));
        }
    });

    ws.on("close", () => {
        if (ws.opponent) {
            ws.opponent.send(JSON.stringify({ type: "opponentLeft" }));
            ws.opponent.opponent = null;
        }
        if (waitingPlayer === ws) waitingPlayer = null;
    });
});
