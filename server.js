const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.static(path.join(__dirname)));

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces()))
    for (const i of ifaces)
      if (i.family === 'IPv4' && !i.internal) return i.address;
  return 'localhost';
}

// ===================== WORDS =====================
const WORDS = [
  'AFRICA','AGENT','AIR','ALIEN','ALPS','AMAZON','ANGEL','APPLE','ARM','ATLANTIS',
  'BALL','BAND','BANK','BAR','BARK','BAT','BEACH','BEAR','BELL','BILL',
  'BLOCK','BOMB','BOND','BOOT','BOTTLE','BOW','BOX','BRIDGE','BUG','BUTTON',
  'CANADA','CAP','CAR','CARD','CAT','CELL','CHANGE','CHECK','CHEST','CHINA',
  'CIRCLE','CLIFF','CLUB','CODE','COLD','COOK','COPPER','COURT','COVER','CRANE',
  'CROWN','CYCLE','DANCE','DATE','DAY','DIAMOND','DICE','DOG','DRAFT','DRAGON',
  'DRESS','DRILL','DROP','DUCK','EGYPT','ENGINE','EYE','FACE','FAIR','FALL',
  'FIELD','FIGHTER','FILE','FILM','FIRE','FISH','FLAG','FLAT','FLY','FOOT',
  'FORCE','FOREST','FORK','FRANCE','FREEZE','GAME','GAS','GHOST','GLASS','GOLD',
  'GRACE','GRASS','GREECE','GROUND','HAND','HAWK','HEAD','HEART','HOLE','HONEY',
  'HOOK','HORN','HORSE','HOSPITAL','ICE','INDIA','IRON','JACK','JET','JUPITER',
  'KEY','KID','KING','KNIFE','KNIGHT','LAB','LAWYER','LEAD','LEMON','LOCK',
  'LOG','LUCK','MAIL','MARBLE','MARCH','MATCH','MERCURY','MINE','MINT','MODEL',
  'MOLE','MOON','MOUNT','MOUSE','MUG','NAIL','NET','NIGHT','NOTE','NUT',
  'NURSE','OAK','OLIVE','OPERA','ORANGE','ORGAN','PALM','PAN','PAPER','PARK',
  'PASS','PENGUIN','PEPPER','PIANO','PIE','PILOT','PIN','PIPE','PIRATE','PIT',
  'PLANE','PLANT','PLATE','PLAY','POINT','POISON','POLE','POLICE','POOL','PORT',
  'POST','PRESS','QUEEN','RABBIT','RAY','RING','ROCK','ROCKET','ROOT','ROSE',
  'RUG','RULER','SATURN','SCALE','SCHOOL','SCREEN','SEAL','SHADOW','SHARK','SHOT',
  'SINK','SLUG','SNOW','SOUL','SOUND','SPACE','SPAIN','SPELL','SPIDER','SPIKE',
  'SPOT','SPRING','SPY','SQUARE','STAFF','STAR','STICK','STOCK','STRAW','STREAM',
  'STRIKE','SUIT','SWING','TABLE','TAIL','TAP','TICK','TIME','TIP','TOKEN',
  'TORCH','TOWER','TRACK','TRAIN','TRAP','TRIANGLE','TRUNK','TUBE','TURKEY','VAN',
  'VERSE','WAKE','WALL','WAR','WASHER','WATCH','WATER','WAVE','WEB','WHALE',
  'WIND','WITCH','WOLF','WORM','YARD','FLASH','BLADE','STORM','FROST','EAGLE',
  'RAVEN','VIPER','COBRA','BRUSH','COMET','CRYPT','DAGGER','EMBER','FLARE','FORGE',
  'GROVE','HAVEN','IVORY','LANCE','LAVA','LOTUS','LUNAR','MAPLE','NEXUS','ORBIT',
  'ANCHOR','ARROW','ASH','AXE','BADGE','BARREL','BEACON','BEAN','BERRY','BLANK',
  'BOLT','BORDER','BRANCH','BRAND','BREACH','BREW','BRICK','BRONZE','BUBBLE','BUCK',
  'BUFFALO','BUNKER','BURST','CABIN','CABLE','CAGE','CANAL','CANVAS','CARGO','CAST',
  'CAVE','CHAIN','CHALK','CHAMBER','CHANNEL','CHARGE','CHART','CHASE','CHIP','CLAY',
  'CLINIC','CLIP','CLOUD','COAL','COAST','COIL','COLLAR','COLUMN','COMPASS','CONE',
  'CORD','CORE','COSMOS','COTTON','CRATER','CREEK','CREST','CROSS','CRUDE','CRYSTAL',
  'CURRENT','CURTAIN','CURVE','DAM','DART','DASH','DAWN','DECK','DEEP','DELTA',
  'DEPOT','DIAL','DIVER','DOME','DRAIN','DRIFT','DRUM','DUSK','DUST','ECHO',
  'EDGE','ELDER','EMPIRE','ENERGY','FANG','FARM','FAULT','FERRY','FILTER','FLAME',
  'FLASK','FLEET','FLINT','FLOOD','FLOW','FOAM','FOG','FOLD','FORT','FOSSIL',
  'FRAME','FRONTIER','FUSE','GALAXY','GATE','GEAR','GEM','GLACIER','GORGE','GRAIN',
  'GRAVEL','GRID','GRIT','GULF','HARBOR','HARVEST','HAZARD','HEAP','HEAT','HIVE',
  'HOLLOW','HORIZON','HULL','HUNT','HUSK','IDOL','INLET','ISLE','JAW','JEWEL',
  'JUNGLE','LAKE','LASH','LAUNCH','LAYER','LEDGE','LENS','LEVEL','LINK','LOOP',
  'LURE','MARSH','MAST','MAZE','MEDAL','MESH','METEOR','MINERAL','MIRROR','MOAT',
  'MIST','MODULE','MOSS','MOTOR','MOUND','MUSCLE','NEEDLE','NODE','NORTH','OASIS',
  'OUTPOST','PATROL','PEAK','PEBBLE','PETAL','PIXEL','PLAIN','PLANK','PLATEAU','PLEDGE',
  'POCKET','POLAR','PORTAL','PROBE','PULSE','PUMP','QUARTZ','QUEST','RADAR','RANGE',
  'RAPID','REEF','RELAY','RELIC','RIDGE','RIFT','RIVET','ROVER','SAND','SHARD',
  'SHELL','SHELTER','SHIFT','SIGNAL','SLATE','SLOPE','SPARK','SPHERE','SPIRE','SQUAD',
  'SPUR','STEM','STONE','STRAND','SURGE','SWAMP','TIDE','TIMBER','TITAN','TORRENT',
  'TRACE','TRAIL','TRENCH','TRIGGER','TUNDRA','TUNNEL','TURRET','VAULT','VEIN','VESSEL',
  'VOYAGE','WARD','WASTE','WEDGE','WING','WIRE','ZONE','AURORA','BEACON','BRIDGE',
];

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
function genCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=c[Math.random()*c.length|0];return s;}

// ===================== GAME STATE =====================
function freshState(){
  const words=shuffle([...WORDS]).slice(0,25);
  const start=Math.random()<0.5?'red':'blue';
  const colors=[];
  for(let i=0;i<9;i++)colors.push(start);
  for(let i=0;i<8;i++)colors.push(start==='red'?'blue':'red');
  for(let i=0;i<7;i++)colors.push('neutral');
  colors.push('assassin');
  shuffle(colors);
  return{
    phase:'lobby',words,colors,
    revealed:Array(25).fill(false),
    turn:start,startingTeam:start,
    clue:null,clueNumber:null,guessesLeft:0,guessedThisTurn:0,
    redRevealed:0,blueRevealed:0,
    redNeed:start==='red'?9:8,blueNeed:start==='blue'?9:8,
    winner:null,winReason:'',
    redSpymasterId:null,blueSpymasterId:null,
    players:[],log:[],
    thinking:{},   // playerId -> [cardIndex, ...]
    votes:{},      // cardIndex -> [playerId, ...]
  };
}

// ===================== ROOMS =====================
const rooms=new Map();
function createRoom(hostId){
  let code;do{code=genCode();}while(rooms.has(code));
  rooms.set(code,{state:freshState(),clients:new Map(),lastActivity:Date.now(),hostId,banned:new Set()});
  return code;
}
function getRoom(code){return rooms.get(code)||null;}
function touch(code){const r=rooms.get(code);if(r)r.lastActivity=Date.now();}
setInterval(()=>{const cut=Date.now()-4*60*60*1000;for(const[c,r]of rooms)if(r.lastActivity<cut){rooms.delete(c);console.log(`Room ${c} expired.`);}},30*60*1000);

// ===================== STATE FILTERING =====================
function stateFor(room,pid){
  const s=JSON.parse(JSON.stringify(room.state));
  const isSM=s.redSpymasterId===pid||s.blueSpymasterId===pid;
  if(!isSM)s.colors=s.colors.map((c,i)=>s.revealed[i]?c:null);
  s.iAmSpymaster=isSM;s.myId=pid;s.isHost=room.hostId===pid;
  // Build thinking display: cardIndex -> [{name, isMe}]
  const thinkMap={};
  for(const[vpid,indices]of Object.entries(s.thinking)){
    if(!indices||!indices.length)continue;
    const p=s.players.find(p=>p.id===vpid);
    for(const cidx of indices){
      if(!thinkMap[cidx])thinkMap[cidx]=[];
      thinkMap[cidx].push({name:p?p.name:'?',isMe:vpid===pid});
    }
  }
  s.thinkMap=thinkMap;
  // Build vote display
  const teamOps=s.players.filter(p=>{
    const me=s.players.find(q=>q.id===pid);
    return me&&p.team===s.turn&&p.role==='operative';
  });
  const needed=Math.max(1,Math.floor(teamOps.length/2)+1);
  const voteMap={};
  for(const[cidx,voters]of Object.entries(s.votes)){
    if(!voters||!voters.length)continue;
    const names=voters.map(v=>{const p=s.players.find(q=>q.id===v);return p?p.name:'?';});
    voteMap[cidx]={voters:names,count:voters.length,needed,iVoted:voters.includes(pid)};
  }
  s.voteMap=voteMap;
  s.voteNeeded=needed;
  return s;
}

function broadcastRoom(code){
  const room=getRoom(code);if(!room)return;
  for(const[pid,ws]of room.clients)
    if(ws.readyState===WebSocket.OPEN)
      ws.send(JSON.stringify({type:'state',state:stateFor(room,pid)}));
}
function sendErr(ws,msg){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'error',msg}));}

// ===================== WIN CHECK =====================
function checkWin(gs){
  if(gs.redRevealed>=gs.redNeed){gs.winner='red';gs.winReason='All red agents found!';gs.phase='gameover';return true;}
  if(gs.blueRevealed>=gs.blueNeed){gs.winner='blue';gs.winReason='All blue agents found!';gs.phase='gameover';return true;}
  return false;
}
function switchTurn(gs){
  gs.turn=gs.turn==='red'?'blue':'red';
  gs.clue=null;gs.clueNumber=null;gs.guessesLeft=0;gs.guessedThisTurn=0;
  gs.votes={};gs.thinking={};
}

// ===================== HANDLERS =====================
function handleJoin(ws,pid,code,msg){
  const room=getRoom(code);if(!room)return sendErr(ws,'Room not found.');
  if(room.banned.has(pid))return sendErr(ws,'You have been removed from this room.');
  const gs=room.state;
  const{name,team,role}=msg;
  if(!name||!name.trim())return sendErr(ws,'Enter a name.');
  if(!['red','blue'].includes(team))return sendErr(ws,'Pick a team.');
  if(!['spymaster','operative'].includes(role))return sendErr(ws,'Pick a role.');
  if(gs.phase==='playing'&&role==='spymaster'){
    const key=team==='red'?'redSpymasterId':'blueSpymasterId';
    if(gs[key]&&gs[key]!==pid)return sendErr(ws,'Spymaster slot already taken!');
  }
  if(gs.phase==='gameover')return sendErr(ws,'Game is over. Wait for the next round.');
  const trimName=name.trim().slice(0,20);
  // Check duplicate names
  const nameExists=gs.players.some(p=>p.id!==pid&&p.name.toLowerCase()===trimName.toLowerCase());
  if(nameExists)return sendErr(ws,'That name is already taken!');
  if(role==='spymaster'){
    const key=team==='red'?'redSpymasterId':'blueSpymasterId';
    if(gs[key]&&gs[key]!==pid)return sendErr(ws,'Spymaster slot already taken!');
    if(gs.redSpymasterId===pid&&team!=='red')gs.redSpymasterId=null;
    if(gs.blueSpymasterId===pid&&team!=='blue')gs.blueSpymasterId=null;
    gs[key]=pid;
  }else{
    if(gs.redSpymasterId===pid)gs.redSpymasterId=null;
    if(gs.blueSpymasterId===pid)gs.blueSpymasterId=null;
  }
  gs.players=gs.players.filter(p=>p.id!==pid);
  gs.players.push({id:pid,name:trimName,team,role});
  touch(code);broadcastRoom(code);
}

function handleStart(ws,pid,code){
  const room=getRoom(code);if(!room)return sendErr(ws,'Room not found.');
  const gs=room.state;
  if(gs.phase!=='lobby')return sendErr(ws,'Game already started.');
  gs.phase='playing';
  gs.log.unshift({type:'system',text:'Game started!'});
  touch(code);broadcastRoom(code);
}

function handleClue(ws,pid,code,msg){
  const room=getRoom(code);if(!room)return sendErr(ws,'Room not found.');
  const gs=room.state;
  if(gs.phase!=='playing')return sendErr(ws,'Game not in progress.');
  const smId=gs.turn==='red'?gs.redSpymasterId:gs.blueSpymasterId;
  if(smId!==pid)return sendErr(ws,"Not your turn to give a clue.");
  if(gs.clue)return sendErr(ws,'Clue already given.');
  const word=(msg.word||'').trim().toUpperCase();
  const num=parseInt(msg.number);
  if(!word)return sendErr(ws,'Enter a clue word.');
  if(word.includes(' '))return sendErr(ws,'One word only.');
  if(isNaN(num)||num<1||num>9)return sendErr(ws,'Number must be 1–9.');
  if(gs.words.some((w,i)=>w===word&&!gs.revealed[i]))return sendErr(ws,'Clue cannot match a board word.');
  gs.clue=word;gs.clueNumber=num;gs.guessesLeft=num+1;gs.guessedThisTurn=0;
  gs.votes={};gs.thinking={};
  gs.log.unshift({type:'clue',team:gs.turn,text:word,num});
  touch(code);broadcastRoom(code);
}

function revealCard(room,pid,idx,code){
  const gs=room.state;
  const color=gs.colors[idx],word=gs.words[idx];
  const player=gs.players.find(p=>p.id===pid)||{name:'?'};
  gs.revealed[idx]=true;
  if(color==='red')gs.redRevealed++;
  if(color==='blue')gs.blueRevealed++;
  gs.log.unshift({type:'guess',team:gs.turn,word,color,guesser:player.name});
  gs.guessedThisTurn++;gs.guessesLeft--;
  gs.votes={};gs.thinking={};
  if(color==='assassin'){
    gs.winner=gs.turn==='red'?'blue':'red';
    gs.winReason=`${player.name} hit the assassin!`;
    gs.phase='gameover';
  }else if(!checkWin(gs)){
    if(color!==gs.turn||gs.guessesLeft<=0)switchTurn(gs);
  }
  touch(code);broadcastRoom(code);
}

function handleGuess(ws,pid,code,msg){
  const room=getRoom(code);if(!room)return sendErr(ws,'Room not found.');
  const gs=room.state;
  if(gs.phase!=='playing')return sendErr(ws,'Game not in progress.');
  if(!gs.clue)return sendErr(ws,'Wait for the spymaster to give a clue.');
  const player=gs.players.find(p=>p.id===pid);
  if(!player)return sendErr(ws,'Join the game first.');
  if(player.role==='spymaster')return sendErr(ws,'Spymasters cannot guess.');
  if(player.team!==gs.turn)return sendErr(ws,"Not your team's turn.");
  const idx=parseInt(msg.index);
  if(isNaN(idx)||idx<0||idx>24||gs.revealed[idx])return sendErr(ws,'Invalid card.');
  revealCard(room,pid,idx,code);
}

function handleThink(ws,pid,code,msg){
  const room=getRoom(code);if(!room)return;
  const gs=room.state;
  if(gs.phase!=='playing'||!gs.clue)return;
  const player=gs.players.find(p=>p.id===pid);
  if(!player||player.role==='spymaster'||player.team!==gs.turn)return;
  const idx=parseInt(msg.index);
  if(isNaN(idx)||idx<0||idx>24||gs.revealed[idx])return;
  if(!gs.thinking[pid])gs.thinking[pid]=[];
  const arr=gs.thinking[pid];
  const pos=arr.indexOf(idx);
  if(pos>=0)arr.splice(pos,1);  // toggle off
  else arr.push(idx);            // toggle on
  touch(code);broadcastRoom(code);
}

function handleVote(ws,pid,code,msg){
  const room=getRoom(code);if(!room)return;
  const gs=room.state;
  if(gs.phase!=='playing'||!gs.clue)return sendErr(ws,'No clue given yet.');
  const player=gs.players.find(p=>p.id===pid);
  if(!player)return sendErr(ws,'Join the game first.');
  if(player.role==='spymaster')return sendErr(ws,'Spymasters cannot vote.');
  if(player.team!==gs.turn)return sendErr(ws,"Not your team's turn.");
  const idx=parseInt(msg.index);
  if(isNaN(idx)||idx<0||idx>24||gs.revealed[idx])return sendErr(ws,'Invalid card.');
  // Remove previous vote by this player
  for(const[ci,voters]of Object.entries(gs.votes)){
    gs.votes[ci]=voters.filter(v=>v!==pid);
    if(!gs.votes[ci].length)delete gs.votes[ci];
  }
  const wasVoted=msg.wasVoted;
  if(!wasVoted){
    if(!gs.votes[idx])gs.votes[idx]=[];
    gs.votes[idx].push(pid);
    const teamOps=gs.players.filter(p=>p.team===gs.turn&&p.role==='operative');
    const needed=Math.max(1,Math.floor(teamOps.length/2)+1);
    if(gs.votes[idx].length>=needed){revealCard(room,pid,idx,code);return;}
  }
  touch(code);broadcastRoom(code);
}

function handleEndTurn(ws,pid,code){
  const room=getRoom(code);if(!room)return sendErr(ws,'Room not found.');
  const gs=room.state;
  if(gs.phase!=='playing')return sendErr(ws,'Game not in progress.');
  if(!gs.clue)return sendErr(ws,'No clue given yet.');
  const player=gs.players.find(p=>p.id===pid);
  if(!player)return sendErr(ws,'Join first.');
  if(player.role==='spymaster')return sendErr(ws,'Spymasters cannot end the turn.');
  if(player.team!==gs.turn)return sendErr(ws,"Not your team's turn.");
  gs.log.unshift({type:'endturn',team:gs.turn,name:player.name});
  switchTurn(gs);touch(code);broadcastRoom(code);
}

function handleKick(ws,pid,code,msg){
  const room=getRoom(code);if(!room)return sendErr(ws,'Room not found.');
  if(room.hostId!==pid)return sendErr(ws,'Only the host can kick players.');
  const targetId=msg.playerId;
  if(targetId===pid)return sendErr(ws,"Can't kick yourself.");
  const gs=room.state;
  gs.players=gs.players.filter(p=>p.id!==targetId);
  if(gs.redSpymasterId===targetId)gs.redSpymasterId=null;
  if(gs.blueSpymasterId===targetId)gs.blueSpymasterId=null;
  delete gs.thinking[targetId];
  for(const[ci,voters]of Object.entries(gs.votes)){
    gs.votes[ci]=voters.filter(v=>v!==targetId);
    if(!gs.votes[ci].length)delete gs.votes[ci];
  }
  room.banned.add(targetId);
  const kws=room.clients.get(targetId);
  if(kws&&kws.readyState===WebSocket.OPEN)kws.send(JSON.stringify({type:'kicked'}));
  room.clients.delete(targetId);
  touch(code);broadcastRoom(code);
}

function handleMovePlayer(ws,pid,code,msg){
  const room=getRoom(code);if(!room)return sendErr(ws,'Room not found.');
  if(room.hostId!==pid)return sendErr(ws,'Only the host can move players.');
  const gs=room.state;
  const player=gs.players.find(p=>p.id===msg.playerId);
  if(!player)return sendErr(ws,'Player not found.');
  const newTeam=msg.team||player.team;
  const newRole=msg.role||player.role;
  // Free up old spymaster slot
  if(gs.redSpymasterId===msg.playerId)gs.redSpymasterId=null;
  if(gs.blueSpymasterId===msg.playerId)gs.blueSpymasterId=null;
  // Check new spymaster slot
  if(newRole==='spymaster'){
    const key=newTeam==='red'?'redSpymasterId':'blueSpymasterId';
    if(gs[key]&&gs[key]!==msg.playerId)return sendErr(ws,`${newTeam} spymaster slot is already taken!`);
    gs[key]=msg.playerId;
  }
  player.team=newTeam;
  player.role=newRole;
  touch(code);broadcastRoom(code);
}

function handleNewRound(ws,pid,code){
  const room=getRoom(code);if(!room)return;
  const players=room.state.players,rsm=room.state.redSpymasterId,bsm=room.state.blueSpymasterId;
  room.state=freshState();
  room.state.phase='playing';room.state.players=players;
  room.state.redSpymasterId=rsm;room.state.blueSpymasterId=bsm;
  room.state.log.unshift({type:'system',text:'New round!'});
  touch(code);broadcastRoom(code);
}

function handleReset(ws,pid,code){
  const room=getRoom(code);if(!room)return;
  // Generate new room code to invalidate kicked players' links
  let newCode;do{newCode=genCode();}while(rooms.has(newCode));
  room.state=freshState();
  room.banned=new Set(); // clear bans on full reset
  rooms.delete(code);
  rooms.set(newCode,room);
  // Update all active connections to use new code
  for(const[,cws]of room.clients){
    cws._roomCode=newCode;
    if(cws.readyState===WebSocket.OPEN)
      cws.send(JSON.stringify({type:'room_reset',newCode,state:stateFor(room,cws._pid)}));
  }
}

function closeRoom(code,reason){
  const room=getRoom(code);if(!room)return;
  for(const[,cws]of room.clients)
    if(cws.readyState===WebSocket.OPEN)
      cws.send(JSON.stringify({type:'room_closed',reason}));
  rooms.delete(code);
}

function handleAbandon(ws,pid,code){
  const room=getRoom(code);if(!room)return;
  if(room.hostId===pid){
    // Host leaving closes the whole room
    if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'left_room'}));
    closeRoom(code,'The host left the room.');
    return;
  }
  const gs=room.state;
  gs.players=gs.players.filter(p=>p.id!==pid);
  if(gs.redSpymasterId===pid)gs.redSpymasterId=null;
  if(gs.blueSpymasterId===pid)gs.blueSpymasterId=null;
  delete gs.thinking[pid];
  room.clients.delete(pid);
  broadcastRoom(code);
  if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'left_room'}));
}

// ===================== WEBSOCKET =====================
wss.on('connection',(ws)=>{
  ws._pid=null;
  ws._roomCode=null;

  ws.on('message',(raw)=>{
    let msg;try{msg=JSON.parse(raw);}catch{return;}

    if(msg.type==='connect'){
      ws._pid=msg.playerId;
      ws.send(JSON.stringify({type:'connected'}));
      return;
    }
    if(!ws._pid)return;
    const pid=ws._pid;

    if(msg.type==='create_room'){
      const code=createRoom(pid);
      ws._roomCode=code;
      const room=getRoom(code);
      room.clients.set(pid,ws);
      ws.send(JSON.stringify({type:'room_created',code,state:stateFor(room,pid)}));
      return;
    }
    if(msg.type==='join_room'){
      const code=(msg.code||'').trim().toUpperCase();
      const room=getRoom(code);
      if(!room){ws.send(JSON.stringify({type:'error',msg:`Room "${code}" not found.`}));return;}
      if(room.banned.has(pid)){ws.send(JSON.stringify({type:'error',msg:'You have been removed from this room.'}));return;}
      ws._roomCode=code;
      room.clients.set(pid,ws);
      touch(code);
      ws.send(JSON.stringify({type:'room_joined',code,state:stateFor(room,pid)}));
      broadcastRoom(code);
      return;
    }

    const roomCode=ws._roomCode;
    if(!roomCode)return sendErr(ws,'Not in a room.');

    switch(msg.type){
      case 'join':        handleJoin(ws,pid,roomCode,msg);break;
      case 'start':       handleStart(ws,pid,roomCode);break;
      case 'clue':        handleClue(ws,pid,roomCode,msg);break;
      case 'guess':       handleGuess(ws,pid,roomCode,msg);break;
      case 'think':       handleThink(ws,pid,roomCode,msg);break;
      case 'vote':        handleVote(ws,pid,roomCode,msg);break;
      case 'endturn':     handleEndTurn(ws,pid,roomCode);break;
      case 'kick':        handleKick(ws,pid,roomCode,msg);break;
      case 'move_player': handleMovePlayer(ws,pid,roomCode,msg);break;
      case 'newround':    handleNewRound(ws,pid,roomCode);break;
      case 'reset':       handleReset(ws,pid,roomCode);break;
      case 'abandon':     handleAbandon(ws,pid,roomCode);ws._roomCode=null;break;
    }
  });

  ws.on('close',()=>{
    if(ws._pid&&ws._roomCode){
      const room=getRoom(ws._roomCode);
      if(room){
        if(room.hostId===ws._pid){
          closeRoom(ws._roomCode,'The host disconnected.');
        }else{
          room.clients.delete(ws._pid);
        }
      }
    }
  });
});

// ===================== START =====================
server.listen(PORT,()=>{
  const ip=getLocalIP();
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       CODENAMES SERVER RUNNING           ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Local:   http://localhost:${PORT}/codenames.html`);
  console.log(`║  Network: http://${ip}:${PORT}/codenames.html`);
  console.log('╚══════════════════════════════════════════╝\n');
});
