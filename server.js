const express = require('express');
const http = require('http');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const DEFAULT_PORT = 3000;

//config
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

//route
app.get("/", (req, res) => {
    res.redirect(`/${uuidv4()}`);
});
  
app.get("/:room", (req, res) => {
    res.render("room", { roomId: req.params.room });
});

//socket
io.on('connection', (socket) => {
    console.log('User connected');
    socket.on('join-room', (roomId) => {        
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', socket.id);
    });

    socket.on('offer', (data) => {
        socket.to(data.socketId).emit('offer', socket.id, data.offer);
    });

    socket.on('candidate', (data) => {
        socket.to(data.socketId).emit('candidate', data.candidate);
    });

    socket.on('answer', (data) => {
        socket.to(data.socketId).emit('answer', data.answer);
    });
});

server.listen(DEFAULT_PORT, () => {
    console.log(`Server is listening on http://localhost:${DEFAULT_PORT}`);
});