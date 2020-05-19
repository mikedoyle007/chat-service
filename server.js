const path           = require('path');
const http           = require('http');
const express        = require('express');
const socketio       = require('socket.io');
const formatMessage  = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers }  = require('./utils/users');

/**
 * NOTE: Types of Emitters
 * 1. socket.emit() => emits to the single client that's connecting
 * 2. socket.broadcast.emit() => emits to everyone except the user that's connecting
 * 3. io.emit() => emits to everyone in general
 *
 * 4. socket.broadcast.to(--room--).emit(...) => emit to specific room
 */

const app     = express();
const server  = http.createServer(app);
const io      = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';

// Run when a client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit('message', formatMessage(botName, `${user.username} has joined the chat`));

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(`${user.username}`, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port PORT`));
