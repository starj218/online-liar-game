const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;


// =====================================================
// 웹 파일 제공
// =====================================================

app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// =====================================================
// 서버 데이터
// =====================================================

// 접속한 플레이어
// socket.id -> player
const players = new Map();


// 방
// roomId -> room
const rooms = new Map();


// 랜덤 매칭 대기열
const matchmakingQueues = {
    4: [],
    5: [],
    6: [],
    7: [],
    8: []
};


// =====================================================
// 유틸
// =====================================================

function getPlayer(socketId) {
    return players.get(socketId);
}


function makeRandomRoomId() {

    return (
        "MATCH_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 8)
    );

}


function normalizeRoomCode(code) {

    return String(code || "")
        .trim()
        .toUpperCase();

}


function publicPlayer(player) {

    return {
        id: player.id,
        nickname: player.nickname
    };

}


// =====================================================
// 전체 온라인 플레이어 목록
// =====================================================

function broadcastOnlinePlayers() {

    const list =
        [...players.values()]
            .map(publicPlayer);


    io.emit("onlinePlayerList", list);

}


// =====================================================
// 방 정보 보내기
// =====================================================

function broadcastRoom(roomId) {

    const room = rooms.get(roomId);

    if (!room) {
        return;
    }


    const roomPlayers =
        [...room.players]
            .map(id => players.get(id))
            .filter(Boolean)
            .map(publicPlayer);


    const payload = {

        id: room.id,

        type: room.type,

        code: room.code || null,

        targetSize: room.targetSize || null,

        players: roomPlayers,

        count: roomPlayers.length,

        canStart:
            room.type === "code" &&
            roomPlayers.length >= 4 &&
            roomPlayers.length <= 8

    };


    io.to(roomId).emit(
        "roomUpdate",
        payload
    );

}


// =====================================================
// 매칭 대기열 정보
// =====================================================

function broadcastQueue(targetSize) {

    const queue =
        matchmakingQueues[targetSize];


    const validIds =
        queue.filter(id => {

            const player =
                players.get(id);

            return (
                player &&
                player.status === "queue" &&
                player.queueSize === targetSize
            );

        });


    matchmakingQueues[targetSize] =
        validIds;


    const queuePlayers =
        validIds
            .map(id => players.get(id))
            .filter(Boolean)
            .map(publicPlayer);


    validIds.forEach(id => {

        io.to(id).emit(
            "matchmakingUpdate",
            {
                targetSize,
                count: validIds.length,
                players: queuePlayers
            }
        );

    });

}


// =====================================================
// 플레이어를 현재 상태에서 제거
// =====================================================

function removePlayerFromCurrentState(socketId) {

    const player =
        players.get(socketId);


    if (!player) {
        return;
    }


    // -----------------------------------------
    // 랜덤 매칭 대기 중이었다면 제거
    // -----------------------------------------

    if (
        player.status === "queue" &&
        player.queueSize
    ) {

        const size =
            player.queueSize;


        matchmakingQueues[size] =
            matchmakingQueues[size]
                .filter(id =>
                    id !== socketId
                );


        player.status = "lobby";
        player.queueSize = null;


        broadcastQueue(size);

    }


    // -----------------------------------------
    // 방에 있었다면 제거
    // -----------------------------------------

    if (
        player.roomId &&
        rooms.has(player.roomId)
    ) {

        const oldRoomId =
            player.roomId;


        const room =
            rooms.get(oldRoomId);


        room.players.delete(
            socketId
        );


        const socket =
            io.sockets.sockets.get(
                socketId
            );


        if (socket) {
            socket.leave(oldRoomId);
        }


        player.roomId = null;
        player.status = "lobby";


        if (room.players.size === 0) {

            rooms.delete(
                oldRoomId
            );

        }

        else {

            broadcastRoom(
                oldRoomId
            );

        }

    }

}


// =====================================================
// 랜덤 매칭 시도
// =====================================================

function tryMakeMatch(targetSize) {

    const queue =
        matchmakingQueues[targetSize];


    // 유효하지 않은 사용자 제거
    matchmakingQueues[targetSize] =
        queue.filter(id => {

            const player =
                players.get(id);

            return (
                player &&
                player.status === "queue" &&
                player.queueSize === targetSize
            );

        });


    const cleanQueue =
        matchmakingQueues[targetSize];


    // 아직 인원 부족
    if (
        cleanQueue.length <
        targetSize
    ) {

        broadcastQueue(
            targetSize
        );

        return;
    }


    // 앞에서부터 목표 인원수만큼 선택
    const matchedIds =
        cleanQueue.splice(
            0,
            targetSize
        );


    const roomId =
        makeRandomRoomId();


    const room = {

        id: roomId,

        type: "random",

        code: null,

        targetSize,

        players:
            new Set(matchedIds),

        state:
            "matched"

    };


    rooms.set(
        roomId,
        room
    );


    matchedIds.forEach(
        socketId => {

            const player =
                players.get(socketId);


            if (!player) {
                return;
            }


            player.status =
                "room";

            player.queueSize =
                null;

            player.roomId =
                roomId;


            const socket =
                io.sockets.sockets.get(
                    socketId
                );


            if (socket) {

                socket.join(
                    roomId
                );

            }

        }
    );


    const roomPlayers =
        matchedIds
            .map(id =>
                players.get(id)
            )
            .filter(Boolean)
            .map(publicPlayer);


    io.to(roomId).emit(
        "randomMatched",
        {

            roomId,

            targetSize,

            players:
                roomPlayers

        }
    );


    broadcastRoom(
        roomId
    );


    // 대기열에 남은 사람들에게 업데이트
    broadcastQueue(
        targetSize
    );


    // 혹시 남은 인원도 또 충분하다면 추가 매칭
    if (
        matchmakingQueues[targetSize]
            .length >=
        targetSize
    ) {

        tryMakeMatch(
            targetSize
        );

    }

}


// =====================================================
// Socket.IO
// =====================================================

io.on(
    "connection",
    socket => {

        console.log(
            "접속:",
            socket.id
        );


        // =================================================
        // 닉네임으로 입장
        // =================================================

        socket.on(
            "joinWithNickname",
            (
                nickname,
                callback
            ) => {

                nickname =
                    String(
                        nickname || ""
                    ).trim();


                if (
                    nickname.length < 2 ||
                    nickname.length > 10
                ) {

                    callback({
                        success: false,
                        message:
                            "닉네임은 2~10자로 입력해주세요."
                    });

                    return;
                }


                const duplicated =
                    [...players.values()]
                        .some(
                            player =>
                                player.nickname
                                    .toLowerCase() ===
                                nickname
                                    .toLowerCase()
                        );


                if (duplicated) {

                    callback({
                        success: false,
                        message:
                            "이미 사용 중인 닉네임입니다."
                    });

                    return;
                }


                players.set(
                    socket.id,
                    {

                        id:
                            socket.id,

                        nickname,

                        status:
                            "lobby",

                        roomId:
                            null,

                        queueSize:
                            null

                    }
                );


                callback({
                    success: true,
                    nickname
                });


                broadcastOnlinePlayers();

            }
        );


        // =================================================
        // 방 코드 입장
        // =================================================

        socket.on(
            "joinCodeRoom",
            (
                rawCode,
                callback
            ) => {

                const player =
                    getPlayer(
                        socket.id
                    );


                if (!player) {

                    callback({
                        success: false,
                        message:
                            "먼저 닉네임으로 입장해주세요."
                    });

                    return;
                }


                const code =
                    normalizeRoomCode(
                        rawCode
                    );


                if (
                    !/^[A-Z0-9]{1,8}$/
                        .test(code)
                ) {

                    callback({
                        success: false,
                        message:
                            "방 코드는 영문과 숫자로 최대 8자까지 입력해주세요."
                    });

                    return;
                }


                removePlayerFromCurrentState(
                    socket.id
                );


                const roomId =
                    "CODE_" + code;


                let room =
                    rooms.get(
                        roomId
                    );


                if (!room) {

                    room = {

                        id:
                            roomId,

                        type:
                            "code",

                        code,

                        targetSize:
                            null,

                        players:
                            new Set(),

                        state:
                            "waiting"

                    };


                    rooms.set(
                        roomId,
                        room
                    );

                }


                if (
                    room.players.size >=
                    8
                ) {

                    callback({
                        success: false,
                        message:
                            "이 방은 이미 8명으로 가득 찼습니다."
                    });

                    return;
                }


                room.players.add(
                    socket.id
                );


                player.status =
                    "room";

                player.roomId =
                    roomId;

                player.queueSize =
                    null;


                socket.join(
                    roomId
                );


                callback({
                    success: true,
                    code
                });


                broadcastRoom(
                    roomId
                );

            }
        );


        // =================================================
        // 랜덤 매칭 시작
        // =================================================

        socket.on(
            "joinMatchmaking",
            (
                targetSize,
                callback
            ) => {

                const player =
                    getPlayer(
                        socket.id
                    );


                targetSize =
                    Number(
                        targetSize
                    );


                if (!player) {

                    callback({
                        success: false,
                        message:
                            "먼저 닉네임으로 입장해주세요."
                    });

                    return;
                }


                if (
                    ![4, 5, 6, 7, 8]
                        .includes(
                            targetSize
                        )
                ) {

                    callback({
                        success: false,
                        message:
                            "잘못된 매칭 인원입니다."
                    });

                    return;
                }


                removePlayerFromCurrentState(
                    socket.id
                );


                player.status =
                    "queue";

                player.queueSize =
                    targetSize;

                player.roomId =
                    null;


                if (
                    !matchmakingQueues[
                        targetSize
                    ].includes(
                        socket.id
                    )
                ) {

                    matchmakingQueues[
                        targetSize
                    ].push(
                        socket.id
                    );

                }


                callback({
                    success: true,
                    targetSize
                });


                broadcastQueue(
                    targetSize
                );


                tryMakeMatch(
                    targetSize
                );

            }
        );


        // =================================================
        // 랜덤 매칭 취소
        // =================================================

        socket.on(
            "cancelMatchmaking",
            callback => {

                const player =
                    getPlayer(
                        socket.id
                    );


                if (!player) {
                    return;
                }


                if (
                    player.status ===
                    "queue"
                ) {

                    const size =
                        player.queueSize;


                    matchmakingQueues[
                        size
                    ] =
                        matchmakingQueues[
                            size
                        ].filter(
                            id =>
                                id !==
                                socket.id
                        );


                    player.status =
                        "lobby";

                    player.queueSize =
                        null;


                    broadcastQueue(
                        size
                    );

                }


                if (callback) {

                    callback({
                        success: true
                    });

                }

            }
        );


        // =================================================
        // 방 나가기
        // =================================================

        socket.on(
            "leaveRoom",
            callback => {

                const player =
                    getPlayer(
                        socket.id
                    );


                if (!player) {
                    return;
                }


                removePlayerFromCurrentState(
                    socket.id
                );


                if (callback) {

                    callback({
                        success: true
                    });

                }

            }
        );


        // =================================================
        // 방 코드 게임 시작
        // =================================================

        socket.on(
            "requestGameStart",
            callback => {

                const player =
                    getPlayer(
                        socket.id
                    );


                if (
                    !player ||
                    !player.roomId
                ) {

                    callback({
                        success: false,
                        message:
                            "현재 방에 들어가 있지 않습니다."
                    });

                    return;
                }


                const room =
                    rooms.get(
                        player.roomId
                    );


                if (!room) {

                    callback({
                        success: false,
                        message:
                            "방을 찾을 수 없습니다."
                    });

                    return;
                }


                if (
                    room.type !==
                    "code"
                ) {

                    callback({
                        success: false,
                        message:
                            "랜덤 매칭방은 자동으로 게임이 시작됩니다."
                    });

                    return;
                }


                if (
                    room.players.size < 4
                ) {

                    callback({
                        success: false,
                        message:
                            "최소 4명이 필요합니다."
                    });

                    return;
                }


                if (
                    room.players.size > 8
                ) {

                    callback({
                        success: false,
                        message:
                            "최대 8명까지 플레이할 수 있습니다."
                    });

                    return;
                }


                room.state =
                    "readyForGame";


                io.to(
                    room.id
                ).emit(
                    "gameStartPlaceholder",
                    {
                        message:
                            "게임 인원이 확정되었습니다!"
                    }
                );


                callback({
                    success: true
                });

            }
        );


        // =================================================
        // 연결 종료
        // =================================================

        socket.on(
            "disconnect",
            () => {

                const player =
                    getPlayer(
                        socket.id
                    );


                if (player) {

                    removePlayerFromCurrentState(
                        socket.id
                    );


                    players.delete(
                        socket.id
                    );


                    broadcastOnlinePlayers();

                }


                console.log(
                    "접속 종료:",
                    socket.id
                );

            }
        );

    }
);


// =====================================================
// 서버 시작
// =====================================================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `온라인 라이어 게임 서버 실행 중 : ${PORT}`
        );

    }
);
