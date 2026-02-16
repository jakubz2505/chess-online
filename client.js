window.onload = () => {

    const socket = new WebSocket("ws://" + window.location.hostname + ":9090");

    const playBtn = document.getElementById("playBtn");
    const status = document.getElementById("status");
    const statusDot = document.getElementById("statusDot");
    const boardDiv = document.getElementById("board");

    let board = null;
    let game = new Chess();
    let myColor = null;
    let gameOver = false;

    playBtn.onclick = () => {
        socket.send(JSON.stringify({ type: "play" }));
        status.innerText = "Hľadám súpera…";
        statusDot.className = "dot waiting";
    };

    socket.onopen = () => {
        status.innerText = "Pripojený k serveru";
        statusDot.className = "dot";
    };

    socket.onmessage = (msg) => {
        const data = JSON.parse(msg.data);

        // START GAME
        if (data.type === "start") {
            myColor = data.color;

            status.innerText = "Súper nájdený! Hra začína.";
            statusDot.className = "dot";

            boardDiv.style.opacity = "1";
            game = new Chess();
            gameOver = false;

            setTimeout(() => {

                const config = {
                    draggable: true,
                    position: "start",
                    orientation: myColor,
                    onDrop: (source, target) => {

                        if (gameOver) return "snapback";

                        if (game.turn() !== myColor[0]) {
                            return "snapback";
                        }

                        const move = game.move({
                            from: source,
                            to: target,
                            promotion: "q"
                        });

                        if (move === null) {
                            return "snapback";
                        }

                        socket.send(JSON.stringify({
                            type: "move",
                            move: move
                        }));

                        if (game.in_checkmate()) {
                            gameOver = true;
                            socket.send(JSON.stringify({
                                type: "gameOver",
                                winner: myColor
                            }));
                            status.innerText = "Mat! Vyhral si.";
                            statusDot.className = "dot offline";
                        }

                        if (game.in_draw()) {
                            gameOver = true;
                            socket.send(JSON.stringify({
                                type: "gameOver",
                                winner: "draw"
                            }));
                            status.innerText = "Remíza.";
                            statusDot.className = "dot offline";
                        }
                    }
                };

                board = Chessboard("board", config);

            }, 200);
        }

        // OPPONENT MOVE
        if (data.type === "move") {
            if (gameOver) return;

            game.move(data.move);
            board.position(game.fen(), true);

            if (game.in_checkmate()) {
                gameOver = true;
                status.innerText = "Mat! Súper vyhral.";
                statusDot.className = "dot offline";
            }

            if (game.in_draw()) {
                gameOver = true;
                status.innerText = "Remíza.";
                statusDot.className = "dot offline";
            }
        }

        // GAME OVER RECEIVED
        if (data.type === "gameOver") {
            gameOver = true;

            if (data.winner === "draw") {
                status.innerText = "Remíza.";
            } else if (data.winner === myColor) {
                status.innerText = "Mat! Vyhral si.";
            } else {
                status.innerText = "Mat! Súper vyhral.";
            }

            statusDot.className = "dot offline";
        }

        // OPPONENT LEFT
        if (data.type === "opponentLeft") {
            gameOver = true;
            status.innerText = "Súper odišiel.";
            statusDot.className = "dot offline";
        }
    };
};
