var path = require('path');
var bodyParser = require('body-parser');
var _ = require('lodash');

var express = require('express');
var app = express();
var httpServer = exports.server = require('http').Server(app);
var io = require('socket.io').listen(httpServer);

app.set('port', process.env.PORT || 3000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './public')));

// Enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Credentials', 'true');

  next();
});

httpServer.listen(app.get('port'), function() {
  console.log("Le serveur est lancé à l'adresse suivante : http://localhost:" + app.get('port'));
});


var sockets = [];
var users = [];
var GameServer = require('./src/game.server.js');
var gameServer = new GameServer(io);

io.on('connection', function (socket) {
	gameServer.addSocket(socket);
});
