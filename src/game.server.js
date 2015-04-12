var shortId = require('shortid');
var GameCore = require('./game.core.js');
var SocketHandler = require('./socket.handler.js');

var GameServer = module.exports = function(io) {
	this.games = {};
	this.sockets = [];
	this.io = io;
};

GameServer.prototype.createGame = function(creator) {
	var game = new GameCore({ debug: true, min: 4, max: 6,
		duration: {
			night: 10000,
			day: 10000,
			interTurn: 1000
		}});

	this.games[game.id] = game;
	return game;
};


GameServer.prototype.removeGame = function(gameId) {
	if(this.games.hasOwnProperty(gameId))
		return delete this.games[gameId];
};

GameServer.prototype.addSocket = function(socket) {
	this.sockets.push(new SocketHandler(this, socket, this.io));
};


GameServer.prototype.removeSocket = function(socket) {
	console.log("Not yet implemented");
};


GameServer.prototype.findGameOfSocket = function(socketId) {
	var players;
	for(var game in this.games) {
		players = game.getPlayers();
		for(var i = 0; i<players.length; i++)
			if(players[i] === socketId)
				return game;
	}
	return false;
};


GameServer.prototype.findOrCreate = function() {
	for(var game in this.games) {
		if(this.games[game].availableSpace()  && this.games[game].status === "pending") //si place dispo
			return this.games[game];
	}
	return this.createGame();  //creer un jeu
};

GameServer.prototype.findOrCreateFor = function(socket, name) {
	var game = this.findOrCreate();

	game.addPlayer(name, socket);
	return game;
};
