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
app.get("/broadcaster", (req, res) => {
    res.redirect(`/broadcaster/${uuidv4()}`);
});
  
app.get("/broadcaster/:room", (req, res) => {
    res.render("room_broadcaster", { roomId: req.params.room });
});

app.get("/viewer", (req, res) => {
    res.redirect(`/viewer/${uuidv4()}`);
});
  
app.get("/viewer/:room", (req, res) => {
    res.render("room_viewer", { roomId: req.params.room });
});

//socket
var rooms = {}
io.on('connection', (socket) => {
    console.log('Client connected: ', socket.id);
    socket.on('broadcaster-join', (roomId) => {    
        socket.join(roomId);
        if(!rooms[roomId]){
            rooms[roomId] = {};
        }
        rooms[roomId]['broadcaster'] = socket.id;
        const viewers = rooms[roomId]['viewers'];
        if(viewers) {
            viewers.forEach(viewer => {
                socket.to(viewer).emit('broadcaster-join', socket.id);
                socket.emit('viewer-join', viewer);
            });
        }
    });
    socket.on('viewer-join', (roomId) => {        
        socket.join(roomId);
        if(!rooms[roomId]){
            rooms[roomId] = {};
        }
        let viewers = rooms[roomId]['viewers'];
        if(!viewers) viewers = [];
        viewers.push(socket.id);
        let broadcaster = rooms[roomId]['broadcaster'];
        if(broadcaster) {
            socket.to(broadcaster).emit('viewer-join', socket.id);
            socket.emit('broadcaster-join', broadcaster);
        }
    });

    socket.on('offer', ({offer, receiver}) => {
        socket.to(receiver).emit('offer', {
            offer: offer,
            sender: socket.id
        });
    });

    socket.on('candidate', ({candidate, receiver}) => {  
        socket.to(receiver).emit('candidate', {
            candidate: candidate,
            sender: socket.id
        });
    });

    socket.on('answer', ({answer, receiver}) => {
        socket.to(receiver).emit('answer', {
            answer: answer,
            sender: socket.id
        });
    });
});

server.listen(DEFAULT_PORT, () => {
    console.log(`Server is listening on http://localhost:${DEFAULT_PORT}`);
});