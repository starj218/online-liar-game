const express=require("express");
const http=require("http");
const path=require("path");
const {Server}=require("socket.io");

const app=express();
const server=http.createServer(app);
const io=new Server(server);
const PORT=process.env.PORT||3000;

app.use(express.static(__dirname));
app.get("/",(_,res)=>res.sendFile(path.join(__dirname,"index.html")));

const players=new Map();
const rooms=new Map();
const queues={3:[],4:[],5:[],6:[],7:[]};

const WORDS=[["음식","치킨","피자"],["음식","햄버거","핫도그"],["음식","떡볶이","라면"],["음식","김밥","초밥"],["음식","짜장면","짬뽕"],["음식","아이스크림","빙수"],["음식","사탕","초콜릿"],["음식","콜라","사이다"],["음식","붕어빵","호떡"],["음식","삼겹살","갈비"],["음식","우동","라면"],["음식","케이크","마카롱"],["음식","팝콘","과자"],["음식","토스트","샌드위치"],["음식","햄버거","샌드위치"],["음식","피자","치즈"],["음식","떡볶이","순대"],["음식","김치","깍두기"],["음식","된장찌개","김치찌개"],["음식","냉면","소바"],["음식","국수","우동"],["음식","닭강정","치킨"],["음식","와플","팬케이크"],["음식","도넛","베이글"],["음식","수박","멜론"],["음식","딸기","체리"],["음식","사과","배"],["음식","복숭아","자두"],["음식","귤","오렌지"],["동물","고양이","강아지"],["동물","사자","호랑이"],["동물","치타","표범"],["동물","코끼리","하마"],["동물","기린","얼룩말"],["동물","원숭이","고릴라"],["동물","상어","돌고래"],["동물","고래","돌고래"],["동물","독수리","매"],["동물","부엉이","올빼미"],["동물","토끼","햄스터"],["동물","여우","늑대"],["동물","뱀","도마뱀"],["동물","악어","공룡"],["동물","펭귄","북극곰"],["동물","곰","판다"],["동물","사슴","노루"],["동물","말","얼룩말"],["동물","소","염소"],["동물","돼지","멧돼지"],["동물","닭","오리"],["동물","독수리","매"],["동물","문어","오징어"],["동물","게","새우"],["동물","개구리","두꺼비"],["동물","나비","나방"],["동물","벌","말벌"],["동물","거미","전갈"],["스포츠","축구","농구"],["스포츠","야구","축구"],["스포츠","배드민턴","테니스"],["스포츠","탁구","테니스"],["스포츠","스키","스노보드"],["스포츠","수영","다이빙"],["스포츠","볼링","당구"],["스포츠","마라톤","달리기"],["스포츠","야구공","축구공"],["스포츠","농구공","배구공"],["스포츠","야구방망이","골프채"],["스포츠","축구화","농구화"],["스포츠","스케이트","롤러스케이트"],["스포츠","서핑","스케이트보드"],["스포츠","태권도","유도"],["게임 / 디지털","마인크래프트","로블록스"],["게임 / 디지털","닌텐도","플레이스테이션"],["게임 / 디지털","키보드","마우스"],["게임 / 디지털","유튜브","틱톡"],["게임 / 디지털","게임","유튜브"],["게임 / 디지털","스마트폰","태블릿"],["게임 / 디지털","컴퓨터","노트북"],["게임 / 디지털","헤드셋","이어폰"],["게임 / 디지털","카메라","캠코더"],["게임 / 디지털","모니터","TV"],["게임 / 디지털","키보드","컨트롤러"],["게임 / 디지털","스피커","헤드폰"],["게임 / 디지털","충전기","보조배터리"],["게임 / 디지털","사진","동영상"],["게임 / 디지털","검색","쇼핑"],["교통","자동차","버스"],["교통","버스","지하철"],["교통","지하철","기차"],["교통","기차","KTX"],["교통","택시","버스"],["교통","오토바이","자전거"],["교통","자전거","킥보드"],["교통","비행기","헬리콥터"],["교통","배","잠수함"],["교통","로켓","비행기"],["교통","트럭","버스"],["교통","택시","승용차"],["교통","기차","전철"],["교통","공항","기차역"],["교통","도로","고속도로"],["학교","학교","학원"],["학교","교과서","문제집"],["학교","연필","샤프"],["학교","볼펜","연필"],["학교","지우개","수정테이프"],["학교","칠판","화이트보드"],["학교","시험","숙제"],["학교","선생님","교수님"],["학교","급식","도시락"],["학교","체육관","운동장"],["학교","수학","과학"],["학교","국어","영어"],["학교","방학","주말"],["학교","교실","강의실"],["학교","책상","사물함"],["일상생활","스마트폰","태블릿"],["일상생활","침대","소파"],["일상생활","냉장고","냉동고"],["일상생활","선풍기","에어컨"],["일상생활","샤워","목욕"],["일상생활","칫솔","치약"],["일상생활","우산","우비"],["일상생활","안경","선글라스"],["일상생활","가방","캐리어"],["일상생활","시계","알람"],["일상생활","지갑","가방"],["일상생활","열쇠","카드"],["일상생활","신발","슬리퍼"],["일상생활","양말","장갑"],["일상생활","모자","헬멧"],["일상생활","수건","휴지"],["일상생활","비누","샴푸"],["일상생활","거울","창문"],["장소","바다","수영장"],["장소","산","언덕"],["장소","강","호수"],["장소","공원","놀이터"],["장소","학교","도서관"],["장소","영화관","극장"],["장소","편의점","마트"],["장소","병원","약국"],["장소","공항","기차역"],["장소","놀이공원","워터파크"],["장소","카페","식당"],["장소","호텔","모텔"],["장소","박물관","미술관"],["장소","동물원","아쿠아리움"],["장소","해변","수영장"],["장소","캠핑장","펜션"],["문화","영화","드라마"],["문화","만화","애니메이션"],["문화","콘서트","축제"],["문화","가수","배우"],["문화","유튜버","스트리머"],["문화","책","만화책"],["문화","소설","웹툰"],["문화","노래","음악"],["문화","마술","서커스"],["문화","영화관","콘서트장"],["문화","배우","개그맨"],["문화","가수","아이돌"],["문화","방송","유튜브"],["과학","망원경","현미경"],["과학","태양","달"],["과학","지구","화성"],["과학","목성","토성"],["과학","별","행성"],["과학","혜성","소행성"],["과학","로봇","인공지능"],["과학","화산","지진"],["과학","번개","천둥"],["과학","구름","안개"],["과학","전기","자석"],["과학","원자","분자"],["과학","현미경","카메라"],["과학","실험","관찰"],["과학","공룡","화석"],["우주","우주비행사","천문학자"],["우주","로켓","우주선"],["우주","달","화성"],["우주","태양","별"],["우주","블랙홀","중성자별"],["우주","은하","성운"],["우주","행성","위성"],["우주","혜성","소행성"],["우주","우주","심해"],["우주","화성","금성"],["우주","목성","토성"],["우주","태양계","은하계"],["우주","별자리","별"],["재미있는 조합","좀비","귀신"],["재미있는 조합","외계인","로봇"],["재미있는 조합","마법사","과학자"],["재미있는 조합","닌자","해적"],["재미있는 조합","슈퍼히어로","악당"],["재미있는 조합","탐정","경찰"],["재미있는 조합","왕","대통령"],["재미있는 조합","공룡","드래곤"],["재미있는 조합","천사","악마"],["재미있는 조합","산타클로스","루돌프"],["재미있는 조합","요정","마법사"],["재미있는 조합","해적","바이킹"],["재미있는 조합","기사","전사"],["재미있는 조합","왕자","공주"],["재미있는 조합","마녀","마법사"],["재미있는 조합","도둑","경찰"],["재미있는 조합","천재","바보"],["재미있는 조합","부자","거지"],["재미있는 조합","히어로","빌런"],["헷갈리는 조합","바다","호수"],["헷갈리는 조합","강","바다"],["헷갈리는 조합","고양이","호랑이"],["헷갈리는 조합","사자","강아지"],["헷갈리는 조합","달","전구"],["헷갈리는 조합","태양","전등"],["헷갈리는 조합","눈","얼음"],["헷갈리는 조합","비","눈"],["헷갈리는 조합","안개","구름"],["헷갈리는 조합","불","태양"],["헷갈리는 조합","사막","해변"],["헷갈리는 조합","동굴","터널"],["헷갈리는 조합","엘리베이터","에스컬레이터"],["헷갈리는 조합","계단","에스컬레이터"],["헷갈리는 조합","문","창문"],["헷갈리는 조합","거울","창문"],["헷갈리는 조합","강","폭포"],["헷갈리는 조합","산","언덕"],["헷갈리는 조합","숲","정글"],["헷갈리는 조합","사막","극지방"],["헷갈리는 조합","해","달"],["헷갈리는 조합","별","불꽃놀이"],["말하다 보면 웃기는 조합","숙제","시험"],["말하다 보면 웃기는 조합","엄마","선생님"],["말하다 보면 웃기는 조합","아빠","선생님"],["말하다 보면 웃기는 조합","친구","라이벌"],["말하다 보면 웃기는 조합","천재","바보"],["말하다 보면 웃기는 조합","부자","거지"],["말하다 보면 웃기는 조합","왕자","공주"],["말하다 보면 웃기는 조합","히어로","빌런"],["말하다 보면 웃기는 조합","도둑","경찰"],["말하다 보면 웃기는 조합","요리사","배달원"],["말하다 보면 웃기는 조합","학생","선생님"],["말하다 보면 웃기는 조합","손님","알바생"],["말하다 보면 웃기는 조합","사장님","직원"],["말하다 보면 웃기는 조합","아빠","사장님"],["말하다 보면 웃기는 조합","엄마","선생님"],["말하다 보면 웃기는 조합","학생","알바생"],["말하다 보면 웃기는 조합","친구","가족"],["말하다 보면 웃기는 조합","시험","공포영화"],["집","거실","방"],["집","주방","식당"],["집","냉장고","전자레인지"],["집","침대","이불"],["집","베개","쿠션"],["집","소파","의자"],["집","TV","모니터"],["집","청소기","로봇청소기"],["집","세탁기","건조기"],["집","에어컨","선풍기"],["집","전자레인지","오븐"],["집","냄비","프라이팬"],["집","식탁","책상"],["집","현관","복도"],["자연","비","눈"],["자연","태풍","허리케인"],["자연","번개","천둥"],["자연","무지개","오로라"],["자연","강","폭포"],["자연","산","화산"],["자연","숲","정글"],["자연","사막","극지방"],["자연","해","달"],["자연","별","불꽃놀이"],["자연","바람","공기"],["자연","파도","물결"],["자연","구름","연기"],["자연","안개","연기"],["자연","얼음","눈"],["판타지","마법사","마녀"],["판타지","용","공룡"],["판타지","기사","전사"],["판타지","왕","황제"],["판타지","요정","천사"],["판타지","뱀파이어","좀비"],["판타지","늑대인간","뱀파이어"],["판타지","드래곤","그리핀"],["판타지","보물","금"],["판타지","마법봉","지팡이"],["판타지","성","궁전"],["판타지","왕국","제국"],["판타지","마법","초능력"],["판타지","용사","영웅"],["판타지","몬스터","괴물"],["물건","연필","샤프"],["물건","책","공책"],["물건","가위","칼"],["물건","컵","병"],["물건","접시","그릇"],["물건","숟가락","젓가락"],["물건","포크","숟가락"],["물건","의자","소파"],["물건","책상","테이블"],["물건","시계","스마트폰"],["물건","카메라","망원경"],["물건","손전등","휴대폰"],["물건","우산","양산"],["물건","배낭","캐리어"],["물건","볼펜","형광펜"],["추가 재미 조합","잠","휴식"],["추가 재미 조합","아침","저녁"],["추가 재미 조합","여름","겨울"],["추가 재미 조합","봄","가을"],["추가 재미 조합","생일","기념일"],["추가 재미 조합","선물","택배"],["추가 재미 조합","돈","보물"],["추가 재미 조합","은행","금고"],["추가 재미 조합","비밀번호","암호"],["추가 재미 조합","사진","추억"],["추가 재미 조합","시간","시계"],["추가 재미 조합","꿈","상상"],["추가 재미 조합","웃음","울음"],["추가 재미 조합","공포","놀람"],["추가 재미 조합","행복","기쁨"],["추가 재미 조합","화","짜증"],["추가 재미 조합","친구","동료"],["추가 재미 조합","여행","휴가"],["추가 재미 조합","캠핑","여행"],["추가 재미 조합","시험","면접"],["추가 재미 조합","학교","회사"]];


const QUESTIONS=[
  "이것은 보통 언제 사용하거나 경험하나요?",
  "이것과 관련된 장소를 하나 말한다면?",
  "이것의 가장 큰 특징은 무엇인가요?",
  "이것과 가장 잘 어울리는 색은 무엇인가요?",
  "이것을 한 단어로 표현한다면?",
  "이것은 실내와 실외 중 어디에 더 어울리나요?",
  "이것을 자주 볼 수 있는 곳은 어디인가요?",
  "이것을 좋아하는 사람은 어떤 사람일까요?",
  "이것이 없다면 가장 불편한 점은 무엇일까요?",
  "이것과 함께 떠오르는 계절은 무엇인가요?",
  "이것과 관련된 소리를 표현한다면?",
  "이것의 크기를 비유한다면 어느 정도인가요?",
  "이것은 혼자보다 여럿이 더 어울리나요?",
  "이것을 처음 접하는 사람에게 뭐라고 설명하겠나요?",
  "이것과 가장 가까운 감정은 무엇인가요?",
  "이것을 선물로 받는다면 기분이 어떨까요?",
  "이것은 낮과 밤 중 언제 더 잘 어울리나요?",
  "이것을 어디에 보관할 것 같나요?",
  "이것과 함께 생각나는 직업은 무엇인가요?",
  "이것을 한 가지 맛으로 표현한다면?",
  "이것과 관련된 행동 하나를 말한다면?",
  "이것을 한 가지 날씨로 표현한다면?",
  "이것은 빠른 것과 느린 것 중 어디에 가깝나요?",
  "이것을 학교에서 본다면 어디에서 볼까요?",
  "이것과 관련된 물건 하나를 말한다면?",
  "이것은 비싼 것과 싼 것 중 어느 쪽 이미지인가요?",
  "이것의 장점 하나를 말한다면?",
  "이것의 단점 하나를 말한다면?",
  "이것을 여행지에서 본다면 어디일까요?",
  "이것과 가장 잘 어울리는 음식은 무엇인가요?"
];

const pub=p=>({id:p.id,nickname:p.nickname});
const roomPlayers=r=>[...r.players].map(id=>players.get(id)).filter(Boolean);
const norm=s=>String(s||"").trim().toUpperCase();
const makeRoomId=()=>`MATCH_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

function broadcastOnline(){
  io.emit("onlinePlayerList",[...players.values()].map(pub));
}

function broadcastRoom(r){
  if(!r)return;
  const list=roomPlayers(r).map(pub);
  io.to(r.id).emit("roomUpdate",{
    id:r.id,type:r.type,code:r.code||null,targetSize:r.targetSize||null,
    players:list,count:list.length,state:r.state,
    canStart:r.type==="code"&&r.state==="waiting"&&list.length>=3&&list.length<=7
  });
}

function cleanQueue(size){
  queues[size]=queues[size].filter(id=>{
    const p=players.get(id);
    return p&&p.status==="queue"&&p.queueSize===size;
  });
}

function broadcastQueue(size){
  cleanQueue(size);
  const list=queues[size].map(id=>players.get(id)).filter(Boolean).map(pub);
  queues[size].forEach(id=>io.to(id).emit("matchmakingUpdate",{targetSize:size,count:list.length,players:list}));
}

function clearTimers(r){
  if(!r)return;
  for(const key of ["modeResultTimer","countdownTimer","readyTimer","restartTimer","turnTimer","shuffleTimer","nextTurnTimer","finalStatementTimer","voteNextTimer","guessTimer","rematchTimer"]){
    if(r[key]){
      clearTimeout(r[key]);
      clearInterval(r[key]);
      r[key]=null;
    }
  }
}

function abortIfTooSmall(r){
  if(!r||r.state==="waiting"||r.players.size>=3)return false;
  clearTimers(r);
  io.to(r.id).emit("roomAborted",{message:"플레이어가 2명 이하로 줄어 게임을 계속할 수 없습니다."});
  for(const id of [...r.players]){
    const p=players.get(id);
    if(p){
      p.status="lobby";p.roomId=null;p.queueSize=null;
      resetStats(p);
      sendStats(id);
    }
    io.sockets.sockets.get(id)?.leave(r.id);
  }
  rooms.delete(r.id);
  return true;
}

function removeFromCurrent(id){
  const p=players.get(id);
  if(!p)return;

  if(p.status==="queue"&&p.queueSize){
    const size=p.queueSize;
    queues[size]=queues[size].filter(x=>x!==id);
    p.status="lobby";p.queueSize=null;
    broadcastQueue(size);
  }

  if(p.roomId&&rooms.has(p.roomId)){
    const r=rooms.get(p.roomId);
    const oldId=r.id;
    r.players.delete(id);
    r.modeVotes?.delete(id);
    r.readyPlayers?.delete(id);
    r.liarVotes?.delete(id);

    if(r.voteCandidates){
      r.voteCandidates=
        r.voteCandidates.filter(x=>x!==id);
    }

    if(r.finalStatementQueue){
      r.finalStatementQueue=
        r.finalStatementQueue.filter(x=>x!==id);
    }
    if(["shuffle","turn","speakingFinished"].includes(r.state)){
      removeFromGameplayOrder(r,id);
    }
    io.sockets.sockets.get(id)?.leave(oldId);
    p.roomId=null;p.status="lobby";

    if(r.players.size===0){
      clearTimers(r);rooms.delete(oldId);return;
    }
    if(abortIfTooSmall(r))return;

    broadcastRoom(r);
    if(r.state==="modeVote"){
      broadcastModeVotes(r);
      checkModeVote(r);
    }
    if(r.state==="roleReady"){
      broadcastReady(r);
      if(r.readyPlayers.size===r.players.size)finishReady(r);
    }
  }
}

function tryMatch(size){
  cleanQueue(size);
  if(queues[size].length<size){broadcastQueue(size);return;}

  const ids=queues[size].splice(0,size);
  const id=makeRoomId();
  const r={
    id,type:"random",code:null,targetSize:size,players:new Set(ids),state:"matched",
    modeVotes:new Map(),selectedMode:null,readyPlayers:new Set(),
    liarId:null,wordSet:null,roleDeadline:null,
    modeResultTimer:null,countdownTimer:null,readyTimer:null,restartTimer:null,
    turnOrder:[],totalRounds:0,currentRound:0,turnIndex:0,currentTurnId:null,
    currentQuestion:null,turnDeadline:null,turnTimer:null,shuffleTimer:null,nextTurnTimer:null,
    voteStage:0,voteCandidates:[],liarVotes:new Map(),finalStatementQueue:[],finalStatementIndex:0,
    finalStatementCurrentId:null,finalStatementTimer:null,voteNextTimer:null,
    guessTimer:null,rematchTimer:null,lastWinner:null
  };
  rooms.set(id,r);

  for(const sid of ids){
    const p=players.get(sid);
    if(!p)continue;
    p.status="room";p.queueSize=null;p.roomId=id;
    io.sockets.sockets.get(sid)?.join(id);
  }

  const list=roomPlayers(r).map(pub);
  io.to(id).emit("randomMatched",{roomId:id,targetSize:size,players:list});
  broadcastRoom(r);

  setTimeout(()=>{
    const rr=rooms.get(id);
    if(rr&&rr.state==="matched"&&rr.players.size>=3)startModeVote(rr);
  },1800);

  broadcastQueue(size);
  if(queues[size].length>=size)tryMatch(size);
}

function startModeVote(r){
  if(!r||r.players.size<3){abortIfTooSmall(r);return;}
  clearTimers(r);
  r.state="modeVote";
  r.modeVotes=new Map();
  r.selectedMode=null;
  io.to(r.id).emit("modeVoteStart",{totalPlayers:r.players.size});
  broadcastModeVotes(r);
}

function modeCounts(r){
  const c={basic:0,question:0,fool:0};
  for(const m of r.modeVotes.values())if(m in c)c[m]++;
  return c;
}

function broadcastModeVotes(r){
  io.to(r.id).emit("modeVoteUpdate",{counts:modeCounts(r),voted:r.modeVotes.size,total:r.players.size});
}

function checkModeVote(r){
  if(!r||r.state!=="modeVote")return;
  if(r.players.size<3){abortIfTooSmall(r);return;}
  if(r.modeVotes.size<r.players.size)return;

  const c=modeCounts(r);
  const max=Math.max(c.basic,c.question,c.fool);
  const tops=Object.keys(c).filter(k=>c[k]===max);
  r.selectedMode=tops[Math.floor(Math.random()*tops.length)];
  r.state="modeResult";

  io.to(r.id).emit("modeVoteResult",{
    selectedMode:r.selectedMode,counts:c,tied:tops.length>1,tiedModes:tops
  });

  r.modeResultTimer=setTimeout(()=>startCountdown(r.id),2500);
}

function startCountdown(id){
  const r=rooms.get(id);
  if(!r)return;
  if(r.players.size<3){abortIfTooSmall(r);return;}

  r.state="countdown";
  let sec=5;
  io.to(id).emit("gameCountdownStart",{seconds:sec,selectedMode:r.selectedMode});

  r.countdownTimer=setInterval(()=>{
    const rr=rooms.get(id);
    if(!rr){clearInterval(r.countdownTimer);return;}
    if(rr.players.size<3){
      clearInterval(rr.countdownTimer);rr.countdownTimer=null;abortIfTooSmall(rr);return;
    }
    sec--;
    if(sec<=0){
      clearInterval(rr.countdownTimer);rr.countdownTimer=null;
      setupRoleStage(rr);
      return;
    }
    io.to(id).emit("gameCountdownTick",{seconds:sec});
  },1000);
}


function ensureStats(p){
  if(!p)return;
  if(!p.stats){
    p.stats={liarGames:0,citizenGames:0,liarWins:0,citizenWins:0};
  }
}

function resetStats(p){
  if(!p)return;
  p.stats={liarGames:0,citizenGames:0,liarWins:0,citizenWins:0};
}

function sendStats(id){
  const p=players.get(id);
  if(!p)return;
  ensureStats(p);
  io.to(id).emit("sessionStatsUpdate",{
    liarGames:p.stats.liarGames,
    citizenGames:p.stats.citizenGames,
    liarWins:p.stats.liarWins,
    citizenWins:p.stats.citizenWins
  });
}

function sendRoomStats(r){
  if(!r)return;
  for(const id of r.players)sendStats(id);
}

function setupRoleStage(r){
  if(!r||r.players.size<3){abortIfTooSmall(r);return;}
  clearTimers(r);
  r.state="roleReady";
  r.readyPlayers=new Set();

  const ids=[...r.players];
  r.liarId=ids[Math.floor(Math.random()*ids.length)];
  r.wordSet=WORDS[Math.floor(Math.random()*WORDS.length)];
  r.roleDeadline=Date.now()+20000;
  r.roleStatsCommitted=false;

  const [category,citizenWord,liarWord]=r.wordSet;

  for(const id of ids){
    const isLiar=id===r.liarId;

    if(r.selectedMode==="fool"){
      io.to(id).emit("privateRoleInfo",{
        mode:r.selectedMode,roleHidden:true,
        category,word:isLiar?liarWord:citizenWord,
        deadline:r.roleDeadline
      });
    }else{
      io.to(id).emit("privateRoleInfo",{
        mode:r.selectedMode,roleHidden:false,
        role:isLiar?"liar":"citizen",
        category,word:isLiar?null:citizenWord,
        deadline:r.roleDeadline
      });
    }
  }

  broadcastReady(r);
  r.readyTimer=setTimeout(()=>readyTimeout(r.id),20000);
}

function broadcastReady(r){
  const list=roomPlayers(r).map(p=>({
    id:p.id,nickname:p.nickname,ready:r.readyPlayers.has(p.id)
  }));
  io.to(r.id).emit("roleReadyStatus",{players:list,readyCount:r.readyPlayers.size,total:r.players.size});
}

function shuffleArray(arr){
  const out=[...arr];
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

function pickQuestion(){
  return QUESTIONS[
    Math.floor(Math.random()*QUESTIONS.length)
  ];
}

function finishReady(r){
  if(!r||r.state!=="roleReady")return;
  if(r.players.size<3){abortIfTooSmall(r);return;}
  if(r.readyPlayers.size!==r.players.size)return;

  if(r.readyTimer){
    clearTimeout(r.readyTimer);
    r.readyTimer=null;
  }

  if(!r.roleStatsCommitted){
    for(const id of r.players){
      const p=players.get(id);
      if(!p)continue;
      ensureStats(p);
      if(id===r.liarId)p.stats.liarGames++;
      else p.stats.citizenGames++;
    }
    r.roleStatsCommitted=true;
    sendRoomStats(r);
  }

  startSpeakingStage(r);
}

function startSpeakingStage(r){
  if(!r||r.players.size<3){abortIfTooSmall(r);return;}

  r.state="shuffle";
  r.turnOrder=shuffleArray([...r.players]);
  r.totalRounds=r.players.size>=7?3:2;
  r.currentRound=1;
  r.turnIndex=0;
  r.currentTurnId=null;
  r.currentQuestion=r.selectedMode==="question"?pickQuestion():null;

  const orderedPlayers=r.turnOrder
    .map(id=>players.get(id))
    .filter(Boolean)
    .map(pub);

  io.to(r.id).emit("gameplaySetup",{
    selectedMode:r.selectedMode,
    players:orderedPlayers,
    totalRounds:r.totalRounds,
    shuffleMs:2800
  });

  r.shuffleTimer=setTimeout(()=>{
    r.shuffleTimer=null;
    startTurn(r.id);
  },2800);
}

function startTurn(roomId){
  const r=rooms.get(roomId);
  if(!r)return;
  if(r.players.size<3){abortIfTooSmall(r);return;}

  // 남아 있는 플레이어만 순서에 유지
  r.turnOrder=r.turnOrder.filter(id=>r.players.has(id));

  if(r.turnOrder.length<4){
    abortIfTooSmall(r);
    return;
  }

  if(r.turnIndex>=r.turnOrder.length){
    r.currentRound++;
    r.turnIndex=0;

    if(r.currentRound>r.totalRounds){
      finishSpeakingStage(r);
      return;
    }

    if(r.selectedMode==="question"){
      r.currentQuestion=pickQuestion();
    }
  }

  const currentId=r.turnOrder[r.turnIndex];
  const currentPlayer=players.get(currentId);

  if(!currentPlayer){
    r.turnIndex++;
    startTurn(roomId);
    return;
  }

  r.state="turn";
  r.currentTurnId=currentId;
  r.turnDeadline=Date.now()+20000;

  io.to(r.id).emit("turnStarted",{
    currentPlayer:pub(currentPlayer),
    round:r.currentRound,
    totalRounds:r.totalRounds,
    turnNumber:r.turnIndex+1,
    playersInRound:r.turnOrder.length,
    selectedMode:r.selectedMode,
    question:r.selectedMode==="question"?r.currentQuestion:null,
    deadline:r.turnDeadline,
    maxLength:30
  });

  r.turnTimer=setTimeout(()=>{
    completeTurn(r.id,currentId,"(시간 초과)",true);
  },20000);
}

function completeTurn(roomId,speakerId,text,timedOut=false){
  const r=rooms.get(roomId);
  if(!r||r.state!=="turn")return;
  if(r.currentTurnId!==speakerId)return;

  if(r.turnTimer){
    clearTimeout(r.turnTimer);
    r.turnTimer=null;
  }

  const speaker=players.get(speakerId);

  if(speaker){
    io.to(r.id).emit("speechBubble",{
      player:pub(speaker),
      text,
      timedOut,
      round:r.currentRound,
      totalRounds:r.totalRounds,
      question:r.selectedMode==="question"?r.currentQuestion:null
    });
  }

  r.currentTurnId=null;
  r.turnDeadline=null;
  r.turnIndex++;

  r.nextTurnTimer=setTimeout(()=>{
    r.nextTurnTimer=null;
    startTurn(roomId);
  },1100);
}


function finishSpeakingStage(r){
  if(!r)return;

  r.state="speakingFinished";
  r.currentTurnId=null;
  r.turnDeadline=null;

  io.to(r.id).emit("speakingStageFinished",{
    selectedMode:r.selectedMode,
    players:r.turnOrder
      .map(id=>players.get(id))
      .filter(Boolean)
      .map(pub)
  });

  r.voteNextTimer=setTimeout(()=>{
    r.voteNextTimer=null;
    startLiarVote(r,1,[...r.players]);
  },1800);
}

function startLiarVote(r,stage,candidateIds){
  if(!r)return;
  if(r.players.size<3){abortIfTooSmall(r);return;}

  const validCandidates=candidateIds
    .filter(id=>r.players.has(id));

  if(validCandidates.length===0)return;

  r.state="liarVote";
  r.voteStage=stage;
  r.voteCandidates=validCandidates;
  r.liarVotes=new Map();

  io.to(r.id).emit("liarVoteStart",{
    stage,
    candidates:validCandidates
      .map(id=>players.get(id))
      .filter(Boolean)
      .map(pub),
    totalPlayers:r.players.size
  });

  broadcastLiarVoteProgress(r);
}

function broadcastLiarVoteProgress(r){
  io.to(r.id).emit("liarVoteProgress",{
    voted:r.liarVotes.size,
    total:r.players.size,
    stage:r.voteStage
  });
}

function finishLiarVote(r){
  if(!r||r.state!=="liarVote")return;

  const counts=new Map();

  r.voteCandidates.forEach(id=>{
    counts.set(id,0);
  });

  for(const targetId of r.liarVotes.values()){
    counts.set(
      targetId,
      (counts.get(targetId)||0)+1
    );
  }

  const maxVotes=Math.max(...counts.values());

  const tied=[...counts.entries()]
    .filter(([,count])=>count===maxVotes)
    .map(([id])=>id);

  // 단독 1위
  if(tied.length===1){
    resolveLiarVote(r,tied[0]);
    return;
  }

  // 1차 동점 -> 동점자만 재투표
  if(r.voteStage===1){
    io.to(r.id).emit("liarVoteTie",{
      stage:1,
      message:"동점입니다. 동점 후보만 대상으로 재투표합니다.",
      candidates:tied
        .map(id=>players.get(id))
        .filter(Boolean)
        .map(pub)
    });

    r.voteNextTimer=setTimeout(()=>{
      r.voteNextTimer=null;
      startLiarVote(r,2,tied);
    },1800);

    return;
  }

  // 2차 동점 -> 최후의 발언
  if(r.voteStage===2){
    startFinalStatements(r,tied);
    return;
  }

  // 최후의 발언 후 재투표도 동점 -> 서버 랜덤
  const chosen=
    tied[
      Math.floor(
        Math.random()*tied.length
      )
    ];

  io.to(r.id).emit("liarVoteRandomChoice",{
    candidates:tied
      .map(id=>players.get(id))
      .filter(Boolean)
      .map(pub),
    chosen:pub(players.get(chosen))
  });

  r.voteNextTimer=setTimeout(()=>{
    r.voteNextTimer=null;
    resolveLiarVote(r,chosen);
  },1800);
}

function startFinalStatements(r,candidateIds){
  if(!r)return;

  r.state="finalStatement";
  r.finalStatementQueue=
    candidateIds.filter(id=>r.players.has(id));
  r.finalStatementIndex=0;

  io.to(r.id).emit("finalStatementStageStart",{
    candidates:r.finalStatementQueue
      .map(id=>players.get(id))
      .filter(Boolean)
      .map(pub)
  });

  startNextFinalStatement(r);
}

function startNextFinalStatement(r){
  if(!r||r.state!=="finalStatement")return;

  if(r.finalStatementIndex>=r.finalStatementQueue.length){
    r.finalStatementCurrentId=null;

    r.voteNextTimer=setTimeout(()=>{
      r.voteNextTimer=null;
      startLiarVote(
        r,
        3,
        r.finalStatementQueue
      );
    },1200);

    return;
  }

  const id=
    r.finalStatementQueue[
      r.finalStatementIndex
    ];

  const p=players.get(id);

  if(!p){
    r.finalStatementIndex++;
    startNextFinalStatement(r);
    return;
  }

  r.finalStatementCurrentId=id;
  r.turnDeadline=Date.now()+20000;

  io.to(r.id).emit("finalStatementTurn",{
    player:pub(p),
    index:r.finalStatementIndex+1,
    total:r.finalStatementQueue.length,
    deadline:r.turnDeadline,
    maxLength:30
  });

  r.finalStatementTimer=setTimeout(()=>{
    completeFinalStatement(
      r.id,
      id,
      "(시간 초과)",
      true
    );
  },20000);
}

function completeFinalStatement(roomId,speakerId,text,timedOut=false){
  const r=rooms.get(roomId);

  if(
    !r ||
    r.state!=="finalStatement" ||
    r.finalStatementCurrentId!==speakerId
  ){
    return;
  }

  if(r.finalStatementTimer){
    clearTimeout(r.finalStatementTimer);
    r.finalStatementTimer=null;
  }

  const p=players.get(speakerId);

  if(p){
    io.to(r.id).emit("finalStatementBubble",{
      player:pub(p),
      text,
      timedOut
    });
  }

  r.finalStatementCurrentId=null;
  r.turnDeadline=null;
  r.finalStatementIndex++;

  r.voteNextTimer=setTimeout(()=>{
    r.voteNextTimer=null;
    startNextFinalStatement(r);
  },1200);
}


function normalizeGuess(text){
  return String(text||"")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g," ");
}

function resolveLiarVote(r,targetId){
  if(!r)return;

  const target=players.get(targetId);
  if(!target)return;

  r.state="voteResolved";

  const caughtLiar=
    targetId===r.liarId;

  io.to(r.id).emit("liarVoteResolved",{
    target:pub(target),
    caughtLiar
  });

  if(!caughtLiar){
    r.voteNextTimer=setTimeout(()=>{
      r.voteNextTimer=null;
      finishGame(r,"liar","wrongVote");
    },1800);

    return;
  }

  r.voteNextTimer=setTimeout(()=>{
    r.voteNextTimer=null;
    startLiarGuess(r);
  },1800);
}

function startLiarGuess(r){
  if(!r)return;

  if(r.players.size<3){
    abortIfTooSmall(r);
    return;
  }

  const liar=players.get(r.liarId);

  if(!liar){
    finishGame(r,"citizen","liarMissing");
    return;
  }

  r.state="liarGuess";
  r.turnDeadline=Date.now()+20000;

  io.to(r.id).emit("liarGuessStart",{
    liar:pub(liar),
    deadline:r.turnDeadline,
    maxLength:30
  });

  r.guessTimer=setTimeout(()=>{
    r.guessTimer=null;
    finishGame(r,"citizen","guessTimeout");
  },20000);
}

function finishGame(r,winner,reason,guessText=null){
  if(!r)return;

  for(const id of r.players){
    const p=players.get(id);
    if(!p)continue;
    ensureStats(p);
    const isLiar=id===r.liarId;
    if(winner==="liar"&&isLiar)p.stats.liarWins++;
    if(winner==="citizen"&&!isLiar)p.stats.citizenWins++;
  }
  sendRoomStats(r);

  if(r.guessTimer){
    clearTimeout(r.guessTimer);
    r.guessTimer=null;
  }

  r.state="result";
  r.lastWinner=winner;
  r.turnDeadline=null;

  const liar=players.get(r.liarId);

  const [
    category,
    citizenWord,
    liarWord
  ]=r.wordSet||["","",""];

  io.to(r.id).emit("gameResult",{
    winner,
    reason,
    guessText,
    liar:liar?pub(liar):null,
    category,
    citizenWord,
    liarWord:
      r.selectedMode==="fool"
        ? liarWord
        : null,
    selectedMode:r.selectedMode,
    rematchSeconds:6
  });

  r.rematchTimer=setTimeout(()=>{
    r.rematchTimer=null;

    const latest=rooms.get(r.id);

    if(!latest)return;

    if(latest.players.size<3){
      abortIfTooSmall(latest);
      return;
    }

    resetRoundData(latest);

    io.to(latest.id).emit("rematchStarting",{
      message:"같은 멤버로 다음 게임을 시작합니다."
    });

    startModeVote(latest);
  },6000);
}

function resetRoundData(r){
  clearTimers(r);

  r.modeVotes=new Map();
  r.selectedMode=null;

  r.readyPlayers=new Set();

  r.liarId=null;
  r.wordSet=null;
  r.roleDeadline=null;

  r.turnOrder=[];
  r.totalRounds=0;
  r.currentRound=0;
  r.turnIndex=0;
  r.currentTurnId=null;
  r.currentQuestion=null;
  r.turnDeadline=null;

  r.voteStage=0;
  r.voteCandidates=[];
  r.liarVotes=new Map();

  r.finalStatementQueue=[];
  r.finalStatementIndex=0;
  r.finalStatementCurrentId=null;

  r.lastWinner=null;
}

function removeFromGameplayOrder(r,id){
  if(!r.turnOrder||!r.turnOrder.length)return;

  const oldIndex=r.turnOrder.indexOf(id);
  if(oldIndex<0)return;

  const wasCurrent=
    r.state==="turn" &&
    r.currentTurnId===id;

  r.turnOrder.splice(oldIndex,1);

  if(oldIndex<r.turnIndex){
    r.turnIndex--;
  }

  if(wasCurrent){
    if(r.turnTimer){
      clearTimeout(r.turnTimer);
      r.turnTimer=null;
    }

    r.currentTurnId=null;
    r.turnDeadline=null;

    r.nextTurnTimer=setTimeout(()=>{
      r.nextTurnTimer=null;
      startTurn(r.id);
    },350);
  }

  io.to(r.id).emit("gameRosterUpdate",{
    players:r.turnOrder
      .map(pid=>players.get(pid))
      .filter(Boolean)
      .map(pub)
  });
}

function readyTimeout(id){
  const r=rooms.get(id);
  if(!r||r.state!=="roleReady")return;
  r.readyTimer=null;

  const out=[...r.players].filter(x=>!r.readyPlayers.has(x));
  if(out.length===0){finishReady(r);return;}

  for(const sid of out){
    io.to(sid).emit("readyTimeoutKick",{
      message:"20초 안에 준비 완료를 누르지 않아 메인 화면으로 이동합니다."
    });

    r.players.delete(sid);
    r.readyPlayers.delete(sid);

    const p=players.get(sid);
    if(p){p.status="lobby";p.roomId=null;p.queueSize=null;}

    io.sockets.sockets.get(sid)?.leave(r.id);
  }

  if(r.players.size<3){abortIfTooSmall(r);return;}

  io.to(r.id).emit("roleStageRestarting",{
    message:"미준비 플레이어가 제외되어 남은 인원으로 역할과 제시어를 다시 배정합니다."
  });

  r.state="roleRestart";
  r.restartTimer=setTimeout(()=>{
    const rr=rooms.get(id);
    if(rr&&rr.players.size>=3)setupRoleStage(rr);
  },1800);
}

io.on("connection",socket=>{
  socket.on("joinWithNickname",(nickname,cb)=>{
    nickname=String(nickname||"").trim();
    if(nickname.length<2||nickname.length>10)return cb({success:false,message:"닉네임은 2~10자로 입력해주세요."});

    const dup=[...players.values()].some(p=>p.nickname.toLowerCase()===nickname.toLowerCase());
    if(dup)return cb({success:false,message:"이미 사용 중인 닉네임입니다."});

    players.set(socket.id,{
      id:socket.id,
      nickname,
      status:"lobby",
      roomId:null,
      queueSize:null,
      stats:{liarGames:0,citizenGames:0,liarWins:0,citizenWins:0}
    });
    cb({success:true,nickname});
    broadcastOnline();
  });

  socket.on("joinCodeRoom",(raw,cb)=>{
    const p=players.get(socket.id);
    if(!p)return cb({success:false,message:"먼저 닉네임으로 입장해주세요."});

    const code=norm(raw);
    if(!/^[A-Z0-9]{1,8}$/.test(code))return cb({success:false,message:"방 코드는 영문과 숫자로 최대 8자까지 입력해주세요."});

    removeFromCurrent(socket.id);
    resetStats(p);
    sendStats(socket.id);

    const id="CODE_"+code;
    let r=rooms.get(id);

    if(!r){
      r={
        id,type:"code",code,targetSize:null,players:new Set(),state:"waiting",
        modeVotes:new Map(),selectedMode:null,readyPlayers:new Set(),
        liarId:null,wordSet:null,roleDeadline:null,
        modeResultTimer:null,countdownTimer:null,readyTimer:null,restartTimer:null,
        turnOrder:[],totalRounds:0,currentRound:0,turnIndex:0,currentTurnId:null,
        currentQuestion:null,turnDeadline:null,turnTimer:null,shuffleTimer:null,nextTurnTimer:null,
        voteStage:0,voteCandidates:[],liarVotes:new Map(),finalStatementQueue:[],finalStatementIndex:0,
        finalStatementCurrentId:null,finalStatementTimer:null,voteNextTimer:null,
        guessTimer:null,rematchTimer:null,lastWinner:null
      };
      rooms.set(id,r);
    }

    if(r.state!=="waiting")return cb({success:false,message:"이미 게임이 시작된 방입니다."});
    if(r.players.size>=7)return cb({success:false,message:"이 방은 이미 7명으로 가득 찼습니다."});

    r.players.add(socket.id);
    p.status="room";p.roomId=id;p.queueSize=null;
    socket.join(id);

    cb({success:true,code});
    broadcastRoom(r);
  });

  socket.on("joinMatchmaking",(size,cb)=>{
    const p=players.get(socket.id);
    size=Number(size);
    if(!p)return cb({success:false,message:"먼저 닉네임으로 입장해주세요."});
    if(![3,4,5,6,7].includes(size))return cb({success:false,message:"잘못된 매칭 인원입니다."});

    removeFromCurrent(socket.id);
    resetStats(p);
    sendStats(socket.id);

    p.status="queue";p.queueSize=size;p.roomId=null;
    if(!queues[size].includes(socket.id))queues[size].push(socket.id);

    cb({success:true,targetSize:size});
    broadcastQueue(size);
    tryMatch(size);
  });

  socket.on("cancelMatchmaking",cb=>{
    const p=players.get(socket.id);
    if(!p)return;

    if(p.status==="queue"){
      const size=p.queueSize;
      queues[size]=queues[size].filter(id=>id!==socket.id);
      p.status="lobby";p.queueSize=null;
      broadcastQueue(size);
    }
    resetStats(p);
    sendStats(socket.id);
    cb?.({success:true});
  });

  socket.on("leaveRoom",cb=>{
    const p=players.get(socket.id);
    if(p){
      removeFromCurrent(socket.id);
      resetStats(p);
      sendStats(socket.id);
    }
    cb?.({success:true});
  });

  socket.on("requestGameStart",cb=>{
    const p=players.get(socket.id);
    if(!p?.roomId)return cb({success:false,message:"현재 방에 들어가 있지 않습니다."});

    const r=rooms.get(p.roomId);
    if(!r)return cb({success:false,message:"방을 찾을 수 없습니다."});
    if(r.type!=="code")return cb({success:false,message:"랜덤 매칭방은 자동으로 진행됩니다."});
    if(r.state!=="waiting")return cb({success:false,message:"이미 게임이 시작되었습니다."});
    if(r.players.size<3)return cb({success:false,message:"최소 3명이 필요합니다."});

    startModeVote(r);
    cb({success:true});
  });

  socket.on("voteGameMode",(mode,cb)=>{
    const p=players.get(socket.id);
    const r=p?.roomId?rooms.get(p.roomId):null;

    if(!r||r.state!=="modeVote")return cb({success:false,message:"현재는 게임 방식 투표 시간이 아닙니다."});
    if(!["basic","question","fool"].includes(mode))return cb({success:false,message:"잘못된 게임 방식입니다."});
    if(r.modeVotes.has(socket.id))return cb({success:false,message:"이미 투표했습니다."});

    r.modeVotes.set(socket.id,mode);
    cb({success:true,mode});
    broadcastModeVotes(r);
    checkModeVote(r);
  });

  socket.on("roleReady",cb=>{
    const p=players.get(socket.id);
    const r=p?.roomId?rooms.get(p.roomId):null;

    if(!r||r.state!=="roleReady")return cb({success:false,message:"현재는 역할 확인 단계가 아닙니다."});

    r.readyPlayers.add(socket.id);
    cb({success:true});
    broadcastReady(r);

    if(r.readyPlayers.size===r.players.size)finishReady(r);
  });


  socket.on("submitSpeech",(raw,cb)=>{
    const p=players.get(socket.id);
    const r=p?.roomId?rooms.get(p.roomId):null;

    if(!r||r.state!=="turn"){
      return cb?.({success:false,message:"현재는 발언 시간이 아닙니다."});
    }

    if(r.currentTurnId!==socket.id){
      return cb?.({success:false,message:"현재 당신의 차례가 아닙니다."});
    }

    let text=String(raw||"").trim();

    if(!text){
      return cb?.({success:false,message:"내용을 입력해주세요."});
    }

    if(text.length>30){
      return cb?.({success:false,message:"발언은 최대 30자까지 입력할 수 있습니다."});
    }

    cb?.({success:true});
    completeTurn(r.id,socket.id,text,false);
  });


  socket.on("voteLiar",(targetId,cb)=>{
    const p=players.get(socket.id);
    const r=p?.roomId?rooms.get(p.roomId):null;

    if(!r||r.state!=="liarVote"){
      return cb?.({
        success:false,
        message:"현재는 라이어 투표 시간이 아닙니다."
      });
    }

    if(r.liarVotes.has(socket.id)){
      return cb?.({
        success:false,
        message:"이미 투표했습니다."
      });
    }

    if(targetId===socket.id){
      return cb?.({
        success:false,
        message:"자기 자신에게는 투표할 수 없습니다."
      });
    }

    if(!r.voteCandidates.includes(targetId)){
      return cb?.({
        success:false,
        message:"선택할 수 없는 후보입니다."
      });
    }

    if(!r.players.has(targetId)){
      return cb?.({
        success:false,
        message:"해당 플레이어는 방에 없습니다."
      });
    }

    r.liarVotes.set(
      socket.id,
      targetId
    );

    cb?.({success:true});

    broadcastLiarVoteProgress(r);

    if(r.liarVotes.size===r.players.size){
      finishLiarVote(r);
    }
  });

  socket.on("submitFinalStatement",(raw,cb)=>{
    const p=players.get(socket.id);
    const r=p?.roomId?rooms.get(p.roomId):null;

    if(
      !r ||
      r.state!=="finalStatement" ||
      r.finalStatementCurrentId!==socket.id
    ){
      return cb?.({
        success:false,
        message:"현재 당신의 최후 발언 차례가 아닙니다."
      });
    }

    const text=String(raw||"").trim();

    if(!text){
      return cb?.({
        success:false,
        message:"내용을 입력해주세요."
      });
    }

    if(text.length>30){
      return cb?.({
        success:false,
        message:"최후 발언은 최대 30자까지 입력할 수 있습니다."
      });
    }

    cb?.({success:true});

    completeFinalStatement(
      r.id,
      socket.id,
      text,
      false
    );
  });


  socket.on("submitLiarGuess",(raw,cb)=>{
    const p=players.get(socket.id);
    const r=p?.roomId?rooms.get(p.roomId):null;

    if(
      !r ||
      r.state!=="liarGuess"
    ){
      return cb?.({
        success:false,
        message:"현재는 제시어 추측 시간이 아닙니다."
      });
    }

    if(socket.id!==r.liarId){
      return cb?.({
        success:false,
        message:"라이어만 제시어를 추측할 수 있습니다."
      });
    }

    const guess=String(raw||"").trim();

    if(!guess){
      return cb?.({
        success:false,
        message:"제시어를 입력해주세요."
      });
    }

    if(guess.length>30){
      return cb?.({
        success:false,
        message:"입력은 최대 30자까지 가능합니다."
      });
    }

    const citizenWord=
      r.wordSet?.[1]||"";

    const correct=
      normalizeGuess(guess)===
      normalizeGuess(citizenWord);

    cb?.({
      success:true,
      correct
    });

    if(r.guessTimer){
      clearTimeout(r.guessTimer);
      r.guessTimer=null;
    }

    finishGame(
      r,
      correct?"liar":"citizen",
      correct?"guessCorrect":"guessWrong",
      guess
    );
  });

  socket.on("disconnect",()=>{
    if(players.has(socket.id)){
      removeFromCurrent(socket.id);
      players.delete(socket.id);
      broadcastOnline();
    }
  });
});

server.listen(PORT,"0.0.0.0",()=>{
  console.log(`온라인 라이어 게임 서버 실행 중 : ${PORT}`);
});
