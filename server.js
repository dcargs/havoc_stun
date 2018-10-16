'use strict';

var os = require('os');
var express = require('express');
var https = require('https');
var fs = require('fs');//needed for https
var socketIO = require('socket.io');

// this allows cross origin access (you need this for mobile apps)
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    }
    else {
      next();
    }
};

//Creating an instance of of the Express server
var app = express();

app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });

// app.use(allowCrossDomain);//uses the above cors function

app.use(express.static('./public'))

var options = {
  passphrase: 'express_https_example',
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

var server = https.createServer(options, app).listen(8081);

var io = socketIO.listen(server);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('newUser', function(user){
    socket.user = {
      id: user
    }

    socket.broadcast.emit('newUser', socket.user);
  });

  socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    console.log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    // var numClients = clientsInRoom.sockets.length; // has to be Object.keys
    console.log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      console.log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
      var clientsInRoom = io.sockets.adapter.rooms[room];
      console.log("CLIENTSINROOM: "+JSON.stringify(clientsInRoom));

    } else if (numClients === 1) {
      console.log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
      console.log("CLIENTSINROOM: "+JSON.stringify(clientsInRoom));

    } else if (numClients === 2) {
      console.log('Client ID ' + socket.id + ' joined room ' + room);
      // console.log(io.sockets.in(room));
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      // io.sockets.in(room).emit('ready');
      console.log("CLIENTSINROOM: "+JSON.stringify(clientsInRoom));

    } else if (numClients === 3) {
      console.log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      // io.sockets.in(room).emit('ready');
      console.log("CLIENTSINROOM: "+JSON.stringify(clientsInRoom));
    }   else { // max 4 clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
