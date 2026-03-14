const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

function createStockfish() {
  try {
    const sfBin = require('path').join(__dirname, 'node_modules/stockfish/bin/stockfish.js');
    const sf = spawn('node', [sfBin]);
    sf.on('error', function(e) { console.log('Stockfish error:', e.message); });
    sf.stdin.write('uci\n');
    sf.stdin.write('isready\n');
    console.log('Stockfish avviato');
    return sf;
  } catch(e) {
    console.log('Stockfish non disponibile:', e.message);
    return null;
  }
}

function askStockfish(sf, fen, depth, callback) {
  if (!sf) return;
  let buffer = '';
  let responded = false;
  const handler = function(data) {
    buffer += data.toString();
    const lines = buffer.split('\n');
    for (var i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('bestmove') && !responded) {
        responded = true;
        sf.stdout.removeListener('data', handler);
        const parts = line.split(' ');
        if (parts[1] && parts[1] !== '(none)') {
          console.log('Stockfish risponde:', parts[1]);
          callback(parts[1]);
        }
        return;
      }
    }
  };
  sf.stdout.on('data', handler);
  sf.stdin.write('position fen ' + fen + '\n');
  sf.stdin.write('go depth ' + depth + '\n');
}

io.on('connection', function(socket) {
  console.log('Connesso:', socket.id);

  socket.on('create_room', function(options) {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const mode = (options && options.mode) || 'pvp';
    const depth = (options && options.depth) || 10;
    const sf = mode === 'engine' ? createStockfish() : null;
    rooms[roomId] = { players: [socket.id], mode: mode, depth: depth, sf: sf };
    socket.join(roomId);
    socket.emit('room_created', { roomId: roomId, color: 'w' });
    console.log('Stanza creata:', roomId, '| mode:', mode, '| depth:', depth);
    if (mode === 'engine') {
      setTimeout(function() {
        io.to(roomId).emit('game_start', { roomId: roomId, mode: 'engine' });
      }, 800);
    }
  });

  socket.on('join_room', function(roomId) {
    const room = rooms[roomId];
    if (!room) { socket.emit('error', 'Stanza non trovata'); return; }
    if (room.mode === 'engine') { socket.emit('error', 'Stanza engine'); return; }
    if (room.players.length >= 2) { socket.emit('error', 'Stanza piena'); return; }
    room.players.push(socket.id);
    socket.join(roomId);
    socket.emit('room_joined', { roomId: roomId, color: 'b' });
    io.to(roomId).emit('game_start', { roomId: roomId, mode: 'pvp' });
  });

  socket.on('move', function(data) {
    const room = rooms[data.roomId];
    if (!room) return;
    if (room.mode === 'pvp') {
      socket.to(data.roomId).emit('opponent_move', data.move);
    } else if (room.mode === 'engine' && room.sf) {
      console.log('FEN ricevuto:', data.fen);
      askStockfish(room.sf, data.fen, room.depth, function(bestmove) {
        socket.emit('engine_move', { move: bestmove });
      });
    }
  });

  socket.on('disconnect', function() {
    console.log('Disconnesso:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players.includes(socket.id)) {
        socket.to(roomId).emit('opponent_left');
        if (room.sf) { try { room.sf.kill(); } catch(e) {} }
        delete rooms[roomId];
      }
    }
  });
});

const PORT = 3000;
server.listen(PORT, function() {
  console.log('Server avviato su http://localhost:' + PORT);
});
