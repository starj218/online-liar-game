const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 3000;


// ========================================
// 정적 파일
// ========================================

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// ========================================
// 현재 접속 플레이어
// ========================================

const players = new Map();


// ========================================
// Socket.IO
// ========================================

io.on("connection", (socket) => {

    console.log("접속:", socket.id);


    // ------------------------------------
    // 닉네임 입장
    // ------------------------------------

    socket.on("joinWithNickname", (nickname, callback) => {

        nickname = String(nickname || "").trim();


        if (
            nickname.length < 2 ||
            nickname.length > 10
        ) {

            callback({
                success: false,
                message: "닉네임은 2~10자로 입력해주세요."
            });

            return;
        }


        const duplicated =
            [...players.values()]
                .some(player =>
                    player.nickname.toLowerCase() ===
                    nickname.toLowerCase()
                );


        if (duplicated) {

            callback({
                success: false,
                message: "이미 사용 중인 닉네임입니다."
            });

            return;
        }


        players.set(socket.id, {
            id: socket.id,
            nickname: nickname
        });


        callback({
            success: true,
            nickname: nickname
        });


        broadcastPlayerList();

    });


    // ------------------------------------
    // 연결 종료
    // ------------------------------------

    socket.on("disconnect", () => {

        players.delete(socket.id);

        broadcastPlayerList();

        console.log("접속 종료:", socket.id);

    });

});


// ========================================
// 플레이어 목록 전송
// ========================================

function broadcastPlayerList() {

    const list =
        [...players.values()]
            .map(player => ({
                id: player.id,
                nickname: player.nickname
            }));


    io.emit("playerList", list);

}


// ========================================
// 서버 실행
// ========================================

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `온라인 라이어 게임 서버 실행 중 : ${PORT}`
    );

});
