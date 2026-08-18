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

const players = new Map();

const rooms = new Map();

const matchmakingQueues = {
    4: [],
    5: [],
    6: [],
    7: [],
    8: []
};


// =====================================================
// 기본 함수
// =====================================================

function getPlayer(socketId) {
    return players.get(socketId);
}


function publicPlayer(player) {
    return {
        id: player.id,
        nickname: player.nickname
    };
}


function normalizeRoomCode(code) {

    return String(code || "")
        .trim()
        .toUpperCase();

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


// =====================================================
// 전체 온라인 플레이어
// =====================================================

function broadcastOnlinePlayers() {

    const list =
        [...players.values()]
            .map(publicPlayer);

    io.emit(
        "onlinePlayerList",
        list
    );

}


// =====================================================
// 방 데이터
// =====================================================

function getRoomPlayers(room) {

    return [...room.players]
        .map(id => players.get(id))
        .filter(Boolean);

}


function broadcastRoom(roomId) {

    const room =
        rooms.get(roomId);

    if (!room) {
        return;
    }


    const roomPlayers =
        getRoomPlayers(room)
            .map(publicPlayer);


    io.to(roomId).emit(
        "roomUpdate",
        {
            id: room.id,

            type: room.type,

            code: room.code || null,

            targetSize:
                room.targetSize || null,

            players: roomPlayers,

            count:
                roomPlayers.length,

            state:
                room.state,

            canStart:
                room.type === "code" &&
                room.state === "waiting" &&
                roomPlayers.length >= 4 &&
                roomPlayers.length <= 8
        }
    );

}


// =====================================================
// 매칭 대기열 업데이트
// =====================================================

function cleanQueue(targetSize) {

    matchmakingQueues[targetSize] =
        matchmakingQueues[targetSize]
            .filter(id => {

                const player =
                    players.get(id);

                return (
                    player &&
                    player.status === "queue" &&
                    player.queueSize === targetSize
                );

            });

}


function broadcastQueue(targetSize) {

    cleanQueue(targetSize);

    const validIds =
        matchmakingQueues[targetSize];


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

                count:
                    validIds.length,

                players:
                    queuePlayers
            }
        );

    });

}


// =====================================================
// 방 타이머 제거
// =====================================================

function clearRoomTimers(room) {

    if (!room) {
        return;
    }


    if (room.modeResultTimer) {

        clearTimeout(
            room.modeResultTimer
        );

        room.modeResultTimer = null;

    }


    if (room.countdownInterval) {

        clearInterval(
            room.countdownInterval
        );

        room.countdownInterval = null;

    }

}


// =====================================================
// 인원 부족 시 방 종료
// =====================================================

function abortRoomIfTooSmall(room) {

    if (!room) {
        return false;
    }


    // 게임 시작 전 일반 대기방은
    // 1~3명이 있어도 유지 가능
    if (
        room.state === "waiting"
    ) {
        return false;
    }


    const validPlayers =
        getRoomPlayers(room);


    if (
        validPlayers.length >= 4
    ) {
        return false;
    }


    clearRoomTimers(room);


    io.to(room.id).emit(
        "roomAborted",
        {
            message:
                "플레이어가 3명 이하로 줄어 게임을 계속할 수 없습니다."
        }
    );


    validPlayers.forEach(player => {

        player.status = "lobby";

        player.roomId = null;

        player.queueSize = null;


        const socket =
            io.sockets.sockets.get(
                player.id
            );


        if (socket) {

            socket.leave(
                room.id
            );

        }

    });


    rooms.delete(
        room.id
    );


    return true;

}


// =====================================================
// 현재 상태에서 플레이어 제거
// =====================================================

function removePlayerFromCurrentState(socketId) {

    const player =
        players.get(socketId);


    if (!player) {
        return;
    }


    // -----------------------------------------
    // 랜덤 매칭 대기열
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


        player.status =
            "lobby";

        player.queueSize =
            null;


        broadcastQueue(
            size
        );

    }


    // -----------------------------------------
    // 방
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


        if (room.modeVotes) {

            room.modeVotes.delete(
                socketId
            );

        }


        const socket =
            io.sockets.sockets.get(
                socketId
            );


        if (socket) {

            socket.leave(
                oldRoomId
            );

        }


        player.roomId =
            null;

        player.status =
            "lobby";


        if (
            room.players.size === 0
        ) {

            clearRoomTimers(room);

            rooms.delete(
                oldRoomId
            );

            return;

        }


        if (
            abortRoomIfTooSmall(
                room
            )
        ) {

            return;

        }


        broadcastRoom(
            oldRoomId
        );


        if (
            room.state ===
            "modeVote"
        ) {

            broadcastModeVotes(
                room
            );


            checkModeVotingFinished(
                room
            );

        }

    }

}


// =====================================================
// 랜덤 매칭
// =====================================================

function tryMakeMatch(targetSize) {

    cleanQueue(targetSize);


    const queue =
        matchmakingQueues[targetSize];


    if (
        queue.length <
        targetSize
    ) {

        broadcastQueue(
            targetSize
        );

        return;

    }


    const matchedIds =
        queue.splice(
            0,
            targetSize
        );


    const roomId =
        makeRandomRoomId();


    const room = {

        id:
            roomId,

        type:
            "random",

        code:
            null,

        targetSize,

        players:
            new Set(
                matchedIds
            ),

        state:
            "matched",

        modeVotes:
            new Map(),

        selectedMode:
            null,

        modeResultTimer:
            null,

        countdownInterval:
            null

    };


    rooms.set(
        roomId,
        room
    );


    matchedIds.forEach(
        socketId => {

            const player =
                players.get(
                    socketId
                );


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
        getRoomPlayers(room)
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


    // 매칭 성공 화면을 잠시 보여준 뒤
    // 자동으로 게임 유형 투표
    setTimeout(
        () => {

            const latestRoom =
                rooms.get(
                    roomId
                );


            if (
                latestRoom &&
                latestRoom.players.size >= 4 &&
                latestRoom.state === "matched"
            ) {

                startModeVoting(
                    latestRoom
                );

            }

        },
        1800
    );


    broadcastQueue(
        targetSize
    );


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
// 게임 유형 투표 시작
// =====================================================

function startModeVoting(room) {

    if (!room) {
        return;
    }


    if (
        room.players.size < 4
    ) {

        abortRoomIfTooSmall(
            room
        );

        return;

    }


    clearRoomTimers(room);


    room.state =
        "modeVote";

    room.modeVotes =
        new Map();

    room.selectedMode =
        null;


    io.to(room.id).emit(
        "modeVoteStart",
        {
            totalPlayers:
                room.players.size
        }
    );


    broadcastModeVotes(
        room
    );

}


// =====================================================
// 게임 유형 투표 상황
// =====================================================

function getModeVoteCounts(room) {

    const counts = {
        basic: 0,
        question: 0,
        fool: 0
    };


    for (
        const mode
        of room.modeVotes.values()
    ) {

        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    counts,
                    mode
                )
        ) {

            counts[mode]++;

        }

    }


    return counts;

}


function broadcastModeVotes(room) {

    if (!room) {
        return;
    }


    const counts =
        getModeVoteCounts(
            room
        );


    io.to(room.id).emit(
        "modeVoteUpdate",
        {
            counts,

            voted:
                room.modeVotes.size,

            total:
                room.players.size
        }
    );

}


// =====================================================
// 투표 완료 확인
// =====================================================

function checkModeVotingFinished(room) {

    if (
        !room ||
        room.state !== "modeVote"
    ) {
        return;
    }


    const playerCount =
        room.players.size;


    if (
        playerCount < 4
    ) {

        abortRoomIfTooSmall(
            room
        );

        return;

    }


    if (
        room.modeVotes.size <
        playerCount
    ) {

        return;

    }


    finishModeVoting(
        room
    );

}


// =====================================================
// 게임 유형 결정
// =====================================================

function finishModeVoting(room) {

    if (
        !room ||
        room.state !== "modeVote"
    ) {
        return;
    }


    const counts =
        getModeVoteCounts(
            room
        );


    const maxVotes =
        Math.max(
            counts.basic,
            counts.question,
            counts.fool
        );


    const topModes =
        Object.keys(
            counts
        ).filter(
            mode =>
                counts[mode] ===
                maxVotes
        );


    const selectedMode =
        topModes[
            Math.floor(
                Math.random() *
                topModes.length
            )
        ];


    room.selectedMode =
        selectedMode;

    room.state =
        "modeResult";


    io.to(room.id).emit(
        "modeVoteResult",
        {
            selectedMode,

            counts,

            tied:
                topModes.length > 1,

            tiedModes:
                topModes
        }
    );


    // 결과를 잠시 보여준 뒤
    // 5초 카운트다운
    room.modeResultTimer =
        setTimeout(
            () => {

                startGameCountdown(
                    room.id
                );

            },
            2500
        );

}


// =====================================================
// 5초 카운트다운
// =====================================================

function startGameCountdown(roomId) {

    const room =
        rooms.get(
            roomId
        );


    if (!room) {
        return;
    }


    if (
        room.players.size < 4
    ) {

        abortRoomIfTooSmall(
            room
        );

        return;

    }


    room.state =
        "countdown";


    let seconds =
        5;


    io.to(room.id).emit(
        "gameCountdownStart",
        {
            seconds,

            selectedMode:
                room.selectedMode
        }
    );


    room.countdownInterval =
        setInterval(
            () => {

                const latestRoom =
                    rooms.get(
                        roomId
                    );


                if (!latestRoom) {

                    clearInterval(
                        room.countdownInterval
                    );

                    return;

                }


                if (
                    latestRoom.players.size < 4
                ) {

                    clearInterval(
                        latestRoom.countdownInterval
                    );

                    latestRoom.countdownInterval =
                        null;


                    abortRoomIfTooSmall(
                        latestRoom
                    );

                    return;

                }


                seconds--;


                if (
                    seconds <= 0
                ) {

                    clearInterval(
                        latestRoom.countdownInterval
                    );


                    latestRoom.countdownInterval =
                        null;


                    latestRoom.state =
                        "roleStage";


                    io.to(
                        latestRoom.id
                    ).emit(
                        "roleStagePlaceholder",
                        {
                            selectedMode:
                                latestRoom.selectedMode
                        }
                    );


                    return;

                }


                io.to(
                    latestRoom.id
                ).emit(
                    "gameCountdownTick",
                    {
                        seconds
                    }
                );

            },
            1000
        );

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
        // 닉네임 입장
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
                    "CODE_" +
                    code;


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
                            "waiting",

                        modeVotes:
                            new Map(),

                        selectedMode:
                            null,

                        modeResultTimer:
                            null,

                        countdownInterval:
                            null
                    };


                    rooms.set(
                        roomId,
                        room
                    );

                }


                // 이미 게임이 시작된 방
                if (
                    room.state !==
                    "waiting"
                ) {

                    callback({
                        success: false,

                        message:
                            "이미 게임이 시작된 방입니다."
                    });

                    return;
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
        // 랜덤 매칭
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
                            "랜덤 매칭방은 자동으로 진행됩니다."
                    });

                    return;
                }


                if (
                    room.state !==
                    "waiting"
                ) {

                    callback({
                        success: false,

                        message:
                            "이미 게임이 시작되었습니다."
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


                startModeVoting(
                    room
                );


                callback({
                    success: true
                });

            }
        );


        // =================================================
        // 게임 유형 투표
        // =================================================

        socket.on(
            "voteGameMode",
            (
                mode,
                callback
            ) => {

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
                            "현재 게임방이 없습니다."
                    });

                    return;
                }


                const room =
                    rooms.get(
                        player.roomId
                    );


                if (
                    !room ||
                    room.state !==
                    "modeVote"
                ) {

                    callback({
                        success: false,

                        message:
                            "현재는 게임 방식 투표 시간이 아닙니다."
                    });

                    return;
                }


                if (
                    ![
                        "basic",
                        "question",
                        "fool"
                    ].includes(mode)
                ) {

                    callback({
                        success: false,

                        message:
                            "잘못된 게임 방식입니다."
                    });

                    return;
                }


                if (
                    room.modeVotes.has(
                        socket.id
                    )
                ) {

                    callback({
                        success: false,

                        message:
                            "이미 투표했습니다."
                    });

                    return;
                }


                room.modeVotes.set(
                    socket.id,
                    mode
                );


                callback({
                    success: true,
                    mode
                });


                broadcastModeVotes(
                    room
                );


                checkModeVotingFinished(
                    room
                );

            }
        );


        // =================================================
        // 접속 종료
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
// 서버 실행
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
