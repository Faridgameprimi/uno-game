// Modern split app.js — Game logic + simple PeerJS multiplayer
const UI = {
  playersEl: document.getElementById('players'), hand: document.getElementById('hand'), deckCount: document.getElementById('deckCount'), discardTop: document.getElementById('discardTop'),
  currentPlayer: document.getElementById('currentPlayer'), log: document.getElementById('log'), scoreboard: document.getElementById('scoreboard'), roomCode: document.getElementById('roomCode'), status: document.getElementById('status')
};

const COLORS = ['red','green','blue','yellow'];
const ACTIONS = ['skip','reverse','draw2'];
let state = {deck:[],discard:[],players:[],turn:0,dir:1,mode:'classic',isGame:false,scores:{}};

function log(msg){ const el = document.createElement('div'); el.textContent = msg; UI.log.appendChild(el); UI.log.scrollTop = UI.log.scrollHeight }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
function makeDeck(mode='classic'){ const d=[]; for(const c of COLORS){ d.push({type:'number',color:c,value:0}); for(let n=1;n<=9;n++){ d.push({type:'number',color:c,value:n}); d.push({type:'number',color:c,value:n}); } for(const a of ACTIONS){ d.push({type:a,color:c}); d.push({type:a,color:c}); } } for(let i=0;i<4;i++){ d.push({type:'wild'}); d.push({type:'wild4'}); } return shuffle(d) }
function describeCard(c){ if(!c)return '-'; if(c.type==='number')return `${c.color} ${c.value}`; if(c.type==='wild')return 'WILD'; if(c.type==='wild4')return 'WILD+4'; return `${c.color} ${c.type}` }

function startGame(mode='classic',names=['You','Bot 1','Bot 2']){
  state.mode=mode; state.deck=makeDeck(mode); state.discard=[]; state.players=[]; state.turn=0; state.dir=1; state.isGame=true;
  names.forEach(n=> state.players.push({id:generateId(),name:n,hand:[]}));
  for(let i=0;i<7;i++) state.players.forEach(p=> p.hand.push(state.deck.pop()));
  let top = state.deck.pop(); while(top && top.type==='wild4'){ state.deck.unshift(top); top = state.deck.pop() }
  if(top) state.discard.push(top);
  renderAll(); log('Game started ('+mode+')');
}
function generateId(){ return Math.random().toString(36).slice(2,9) }

function renderAll(){ UI.deckCount.textContent = state.deck.length; UI.discardTop.textContent = describeCard(state.discard[state.discard.length-1]); UI.currentPlayer.textContent = state.players[state.turn]?.name || '-'; renderPlayers(); renderHand(); renderScoreboard(); }
function renderPlayers(){ UI.playersEl.innerHTML=''; state.players.forEach((p,idx)=>{ const el = document.createElement('div'); el.className='player-row'; el.innerHTML = `<div class="avatar">${p.name.slice(0,2).toUpperCase()}</div><div style="flex:1"><div style="font-weight:700">${p.name}</div><div class="meta">${p.hand.length} kad</div></div>${idx===state.turn?'<div class="pill">Giliran</div>':''}`; UI.playersEl.appendChild(el) }) }
function renderHand(){ UI.hand.innerHTML=''; const me = state.players[0]; if(!me) return; me.hand.forEach((card, idx)=>{ const c = document.createElement('div'); c.className='card'; c.innerText = card.type==='number'?card.value:(card.type==='wild'?'WILD':card.type); c.onclick = ()=> tryPlay(0, idx); UI.hand.appendChild(c) }) }

function canPlay(card){ const top = state.discard[state.discard.length-1]; if(!top) return true; if(card.type==='wild' || card.type==='wild4') return true; if(card.type==='number' && top.type==='number') return card.color===top.color || card.value===top.value; if(card.color && top.color && card.color===top.color) return true; if(card.type===top.type && (card.type==='skip' || card.type==='reverse' || card.type==='draw2')) return true; return false }

function tryPlay(playerIdx, cardIdx){ if(state.turn!==playerIdx){ log('Bukan giliran anda'); return } const card = state.players[playerIdx].hand[cardIdx]; if(canPlay(card)){ playCard(playerIdx,cardIdx); } else log('Kad tak boleh main') }
function playCard(playerIdx, cardIdx){ const p = state.players[playerIdx]; const card = p.hand.splice(cardIdx,1)[0]; state.discard.push(card); log(p.name+' main '+describeCard(card)); if(card.type==='reverse') state.dir*=-1; if(card.type==='skip') state.turn = nextTurn(state.turn); if(card.type==='draw2'){ const t = nextTurn(state.turn); drawMultiple(t,2) } if(card.type==='wild4'){ const color = prompt('Pilih warna: red green blue yellow') || 'red'; state.discard[state.discard.length-1].chosen=color; const t = nextTurn(state.turn); drawMultiple(t,4) } if(p.hand.length===1) log(p.name+' tinggal 1 kad — tekan UNO!'); if(p.hand.length===0){ state.isGame=false; log(p.name+' menang!'); state.scores[p.name] = (state.scores[p.name]||0)+1 } if(state.isGame) state.turn = nextTurn(state.turn); renderAll(); broadcastState(); }
function drawMultiple(playerIdx,count){ for(let i=0;i<count;i++){ if(state.deck.length===0) refillDeck(); state.players[playerIdx].hand.push(state.deck.pop()) } log(state.players[playerIdx].name+' draw '+count) }
function nextTurn(i){ const n=state.players.length; return ((i+state.dir+n)%n) }
function refillDeck(){ const top = state.discard.pop(); state.deck = shuffle(state.discard); state.discard = [top]; }

// events
document.getElementById('newGameBtn').onclick = ()=>{ const mode = document.getElementById('modeSelect').value; const name = document.getElementById('playerName').value || 'You'; startGame(mode, [name,'Bot A','Bot B']) }
document.getElementById('drawBtn')?.addEventListener('click', ()=>{ if(state.turn!==0){ log('Bukan giliran anda'); return } if(state.deck.length===0) refillDeck(); state.players[0].hand.push(state.deck.pop()); state.turn = nextTurn(state.turn); renderAll(); broadcastState(); })
document.getElementById('passBtn')?.addEventListener('click', ()=> document.getElementById('drawBtn')?.click())
document.getElementById('unoBtn')?.addEventListener('click', ()=> log((document.getElementById('playerName').value||'You')+' tekan UNO!'))

// chat
document.getElementById('sendChat')?.addEventListener('click', ()=>{ const msg = document.getElementById('chatIn').value.trim(); if(!msg) return; log('You: '+msg); connections.forEach(c=> c.send({type:'chat',msg})); document.getElementById('chatIn').value=''; })

// scoreboard
function renderScoreboard(){ let s=''; for(const k in state.scores) s+=`${k}: ${state.scores[k]}\n`; UI.scoreboard.textContent = s||'Belum ada pemenang' }

// --- Multiplayer (PeerJS basic host-authoritative)
let peer=null, connections=[], isHost=false;

document.getElementById('createRoomBtn').onclick = ()=>{
  const name = document.getElementById('playerName').value || 'Host'; if(peer){ peer.destroy(); peer=null; connections=[] }
  peer = new Peer(); peer.on('open', id=>{ isHost=true; UI.roomCode.textContent = id; UI.status.textContent='hosting'; log('Host: '+id); if(!state.players.length) startGame(state.mode, [name]); else state.players[0].name=name; renderAll(); });
  peer.on('connection', conn=>{ connections.push(conn); updatePeers(); conn.on('open', ()=> conn.send({type:'welcome',state:serialize()})); conn.on('data', d=> handlePeer(conn,d)); log('Conn from '+conn.peer) });
}

document.getElementById('joinRoomBtn').onclick = ()=>{
  const code = document.getElementById('joinCode').value.trim(); const name = document.getElementById('playerName').value || 'Player'; if(!code) return; if(peer){ peer.destroy(); peer=null; connections=[] }
  peer = new Peer(); peer.on('open', ()=>{ UI.status.textContent='joined'; log('Peer ready: '+peer.id); const conn = peer.connect(code); conn.on('open', ()=>{ connections.push(conn); updatePeers(); conn.on('data', d=> handlePeer(conn,d)); conn.send({type:'hello',name}); log('Connected to host'); }); });
}

function updatePeers(){ UI.status.textContent = isHost? 'hosting' : 'connected'; UI.roomCode.textContent = isHost? peer.id : (peer?peer.id:'-'); if(isHost) broadcastState(); }
function serialize(){ return {players: state.players.map(p=>({id:p.id,name:p.name,handCount:p.hand.length})),deckCount:state.deck.length,discardTop:state.discard[state.discard.length-1]} }

function handlePeer(conn,data){ if(!data) return; if(data.type==='hello'){ log(conn.peer+' says hello: '+data.name); if(isHost){ state.players.push({id:generateId(),name:data.name,hand:Array(7).fill({type:'unknown'})}); updatePeers(); broadcastState(); } }
  if(data.type==='state'){ if(!isHost){ state.players = [{id:generateId(),name:document.getElementById('playerName').value||'You',hand:[]}]; data.state.players.forEach(p=> state.players.push({id:p.id,name:p.name,hand:Array(p.handCount).fill({type:'unknown'})})); state.deck = Array(data.state.deckCount).fill(null); state.discard = [data.state.discardTop]; renderAll(); } }
  if(data.type==='chat'){ log('['+conn.peer+'] '+data.msg) }
}

function broadcastState(){ if(!isHost) return; const s = serialize(); connections.forEach(c=> c.send({type:'state',state:s})); }

// small init
startGame('classic', [document.getElementById('playerName').value || 'You']);