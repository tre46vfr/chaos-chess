const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', function(socket) {
  console.log('Connesso:', socket.id);

  socket.on('create_room', function(options) {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const mode = (options && options.mode) || 'pvp';
    const depth = (options && options.depth) || 10;
    rooms[roomId] = { players: [socket.id], mode: mode, depth: depth };
    socket.join(roomId);
    socket.emit('room_created', { roomId: roomId, color: 'w' });
    console.log('Stanza creata:', roomId, '| mode:', mode);
    if (mode === 'engine') {
      setTimeout(function() {
        io.to(roomId).emit('game_start', { roomId: roomId, mode: 'engine' });
      }, 500);
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
    console.log('Giocatore entrato:', roomId);
  });

  socket.on('move', function(data) {
    const room = rooms[data.roomId];
    if (!room) return;
    if (room.mode === 'pvp') {
      socket.to(data.roomId).emit('opponent_move', data.move);
    }
  });

  socket.on('disconnect', function() {
    console.log('Disconnesso:', socket.id);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players.includes(socket.id)) {
        socket.to(roomId).emit('opponent_left');
        delete rooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
  console.log('Server avviato su porta ' + PORT);
});
