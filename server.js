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
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return 'localhost';
}

// ===================== WORD LIST =====================
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
  'RAVEN','VIPER','COBRA','TOWER','BRUSH','CLIFF','COMET','CRYPT','DAGGER','EMBER',
  'FLARE','FORGE','GROVE','HAVEN','IVORY','LANCE','LAVA','LOTUS','LUNAR','MAPLE'
];

// ===================== UTILS =====================
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===================== GAME STATE =====================
function freshState() {
  const words = shuffle([...WORDS]).slice(0, 25);
  const start = Math.random() < 0.5 ? 'red' : 'blue';
  const colors = [];
  for (let i = 0; i < 9; i++) colors.push(start);
  for (let i = 0; i < 8; i++) colors.push(start === 'red' ? 'blue' : 'red');
  for (let i = 0; i < 7; i++) colors.push('neutral');
  colors.push('assassin');
  shuffle(colors);
  return {
    phase: 'lobby',          // lobby | playing | gameover
    words, colors,
    revealed: Array(25).fill(false),
    turn: start,
    startingTeam: start,
    clue: null, clueNumber: null,
    guessesLeft: 0, guessedThisTurn: 0,
    redRevealed: 0, blueRevealed: 0,
    redNeed: start === 'red' ? 9 : 8,
    blueNeed: start === 'blue' ? 9 : 8,
    winner: null, winReason: '',
    redSpymasterId: null, blueSpymasterId: null,
    players: [],
    log: []
  };
}

let gs = freshState();

// playerId -> WebSocket
const clients = new Map();

// ===================== STATE FILTERING =====================
// Spymasters get the real colors. Everyone else gets null for unrevealed cards.
function stateFor(playerId) {
  const s = JSON.parse(JSON.stringify(gs));
  const isSM = s.redSpymasterId === playerId || s.blueSpymasterId === playerId;
  if (!isSM) {
    s.colors = s.colors.map((c, i) => (s.revealed[i] ? c : null));
  }
  // Flag whether this player is a spymaster
  s.iAmSpymaster = isSM;
  s.myId = playerId;
  return s;
}

function broadcastAll() {
  for (const [pid, ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'state', state: stateFor(pid) }));
    }
  }
}

function sendErr(ws, msg) {
  if (ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify({ type: 'error', msg }));
}

// ===================== WIN CHECK =====================
function checkWin() {
  if (gs.redRevealed >= gs.redNeed) {
    gs.winner = 'red'; gs.winReason = 'All red agents found!'; gs.phase = 'gameover'; return true;
  }
  if (gs.blueRevealed >= gs.blueNeed) {
    gs.winner = 'blue'; gs.winReason = 'All blue agents found!'; gs.phase = 'gameover'; return true;
  }
  return false;
}

function switchTurn() {
  gs.turn = gs.turn === 'red' ? 'blue' : 'red';
  gs.clue = null; gs.clueNumber = null; gs.guessesLeft = 0; gs.guessedThisTurn = 0;
}

// ===================== HANDLERS =====================
function handleJoin(ws, pid, msg) {
  const { name, team, role } = msg;
  if (!name || name.trim().length === 0) return sendErr(ws, 'Enter a name.');
  if (!['red','blue'].includes(team)) return sendErr(ws, 'Pick a team.');
  if (!['spymaster','operative'].includes(role)) return sendErr(ws, 'Pick a role.');
  if (gs.phase !== 'lobby') return sendErr(ws, 'Game already in progress.');

  const trimName = name.trim().slice(0, 20);

  if (role === 'spymaster') {
    const key = team === 'red' ? 'redSpymasterId' : 'blueSpymasterId';
    if (gs[key] && gs[key] !== pid) return sendErr(ws, 'Spymaster slot already taken!');
    // Release any old spymaster claim by this player on either team
    if (gs.redSpymasterId === pid && team !== 'red') gs.redSpymasterId = null;
    if (gs.blueSpymasterId === pid && team !== 'blue') gs.blueSpymasterId = null;
    gs[key] = pid;
  } else {
    // If they were a spymaster before, release the slot
    if (gs.redSpymasterId === pid) gs.redSpymasterId = null;
    if (gs.blueSpymasterId === pid) gs.blueSpymasterId = null;
  }

  gs.players = gs.players.filter(p => p.id !== pid);
  gs.players.push({ id: pid, name: trimName, team, role });
  broadcastAll();
}

function handleStart(ws, pid) {
  if (gs.phase !== 'lobby') return sendErr(ws, 'Game already started.');
  if (!gs.redSpymasterId) return sendErr(ws, 'Red team needs a spymaster.');
  if (!gs.blueSpymasterId) return sendErr(ws, 'Blue team needs a spymaster.');
  gs.phase = 'playing';
  gs.log.unshift({ type: 'system', text: 'Game started!' });
  broadcastAll();
}

function handleClue(ws, pid, msg) {
  if (gs.phase !== 'playing') return sendErr(ws, 'Game not in progress.');
  const smId = gs.turn === 'red' ? gs.redSpymasterId : gs.blueSpymasterId;
  if (smId !== pid) return sendErr(ws, "It's not your turn to give a clue.");
  if (gs.clue) return sendErr(ws, 'Clue already given this turn.');

  const word = (msg.word || '').trim().toUpperCase();
  const num = parseInt(msg.number);

  if (!word) return sendErr(ws, 'Enter a clue word.');
  if (word.includes(' ')) return sendErr(ws, 'Clue must be one word only.');
  if (isNaN(num) || num < 1 || num > 9) return sendErr(ws, 'Number must be 1–9.');
  if (gs.words.some((w, i) => w === word && !gs.revealed[i]))
    return sendErr(ws, 'Clue cannot match a visible word on the board.');

  gs.clue = word;
  gs.clueNumber = num;
  gs.guessesLeft = num + 1;
  gs.guessedThisTurn = 0;
  gs.log.unshift({ type: 'clue', team: gs.turn, text: word, num });
  broadcastAll();
}

function handleGuess(ws, pid, msg) {
  if (gs.phase !== 'playing') return sendErr(ws, 'Game not in progress.');
  if (!gs.clue) return sendErr(ws, 'Wait for the spymaster to give a clue.');

  const player = gs.players.find(p => p.id === pid);
  if (!player) return sendErr(ws, 'Join the game first.');
  if (player.role === 'spymaster') return sendErr(ws, 'Spymasters cannot guess.');
  if (player.team !== gs.turn) return sendErr(ws, "It's not your team's turn.");

  const idx = parseInt(msg.index);
  if (isNaN(idx) || idx < 0 || idx > 24) return sendErr(ws, 'Invalid card.');
  if (gs.revealed[idx]) return sendErr(ws, 'Card already revealed.');

  const color = gs.colors[idx];
  const word = gs.words[idx];

  gs.revealed[idx] = true;
  if (color === 'red') gs.redRevealed++;
  if (color === 'blue') gs.blueRevealed++;

  gs.log.unshift({ type: 'guess', team: gs.turn, word, color, guesser: player.name });
  gs.guessedThisTurn++;
  gs.guessesLeft--;

  if (color === 'assassin') {
    gs.winner = gs.turn === 'red' ? 'blue' : 'red';
    gs.winReason = `${player.name} hit the assassin — ${gs.turn} team loses!`;
    gs.phase = 'gameover';
  } else if (!checkWin()) {
    if (color !== gs.turn) {
      switchTurn();
    } else if (gs.guessesLeft <= 0) {
      switchTurn();
    }
  }

  broadcastAll();
}

function handleEndTurn(ws, pid) {
  if (gs.phase !== 'playing') return sendErr(ws, 'Game not in progress.');
  if (!gs.clue) return sendErr(ws, 'No clue has been given yet.');
  const player = gs.players.find(p => p.id === pid);
  if (!player) return sendErr(ws, 'Join the game first.');
  if (player.role === 'spymaster') return sendErr(ws, 'Spymasters cannot end the turn.');
  if (player.team !== gs.turn) return sendErr(ws, "It's not your team's turn.");

  gs.log.unshift({ type: 'endturn', team: gs.turn, name: player.name });
  switchTurn();
  broadcastAll();
}

function handleNewRound(ws, pid) {
  const players = gs.players;
  const rsm = gs.redSpymasterId;
  const bsm = gs.blueSpymasterId;
  gs = freshState();
  gs.phase = 'playing';
  gs.players = players;
  gs.redSpymasterId = rsm;
  gs.blueSpymasterId = bsm;
  gs.log.unshift({ type: 'system', text: 'New round started!' });
  broadcastAll();
}

function handleReset(ws, pid) {
  gs = freshState();
  broadcastAll();
}

// ===================== WEBSOCKET =====================
wss.on('connection', (ws) => {
  let pid = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'connect') {
      pid = msg.playerId;
      clients.set(pid, ws);
      ws.send(JSON.stringify({ type: 'state', state: stateFor(pid) }));
      return;
    }

    if (!pid) return;

    switch (msg.type) {
      case 'join':     handleJoin(ws, pid, msg);    break;
      case 'start':    handleStart(ws, pid);         break;
      case 'clue':     handleClue(ws, pid, msg);     break;
      case 'guess':    handleGuess(ws, pid, msg);    break;
      case 'endturn':  handleEndTurn(ws, pid);       break;
      case 'newround': handleNewRound(ws, pid);      break;
      case 'reset':    handleReset(ws, pid);         break;
    }
  });

  ws.on('close', () => {
    if (pid) clients.delete(pid);
  });
});

// ===================== START =====================
server.listen(PORT, () => {
  const ip = getLocalIP();
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║         CODENAMES SERVER RUNNING             ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}/codenames.html  ║`);
  console.log(`║  Network:  http://${ip}:${PORT}/codenames.html`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Share the Network URL with other players    ║');
  console.log('║  on your WiFi network.                       ║');
  console.log('║  Chess:    /chess.html                       ║');
  console.log('╚══════════════════════════════════════════════╝\n');
});
