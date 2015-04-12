//Liaison entre gamecore et gameserver

var _ = require('lodash');

var SocketHandler = module.exports = function(gameServer, socket, io) {  //socket actuellement conecté
	this.gameServer = gameServer;
	this.socket = socket;
	this.io = io;
	this.game = null;
	this.room = {};

	this.attachSocketEvents();
};

SocketHandler.prototype.attachSocketEvents = function() {
	this.socket.on('want to play', this.onWantToPlay.bind(this));
};

SocketHandler.prototype.attachRoomEvents = function() {
	this.socket.join(this.room.id);
	this.socket.on('start', this.onStartToPlay.bind(this));
	this.socket.on('disconnect', this.onDisconnect.bind(this));
	this.socket.on('vote', this.onVote.bind(this));
	this.socket.on('get players', this.onGetPlayers.bind(this));
	this.socket.on('player info', this.onPlayerInfo.bind(this));
};

SocketHandler.prototype.detachRoomEvents = function() {
	this.socket.leave(this.room.id);
};

SocketHandler.prototype.attachGameEvents = function() {
	this.game.on('ready to play', this.onReadyToPlay.bind(this));
	this.game.on('started', this.onGameStarted.bind(this));
	this.game.on('day votes open', this.onDayVotesOpen.bind(this));
	this.game.on('day votes closed', this.onDayVotesClosed.bind(this));
	this.game.on('night votes open', this.onNightVotesOpen.bind(this));
	this.game.on('night votes closed', this.onNightVotesClosed.bind(this));
	this.game.on('player eliminated', this.onPlayerEliminated.bind(this));
	this.game.on('ended', this.onGameEnded.bind(this));
};

SocketHandler.prototype.onReadyToPlay = function(numberOfPlayers) {
	var self = this;
	process.nextTick(function() {
		//self.socket.emit('ready to play', self.game.getPlayers());
		self.io.sockets.in(self.room.id).emit('ready to play', self.game.getPlayers());
	});
};

SocketHandler.prototype.onWantToPlay = function(name) {
	this.game = this.gameServer.findOrCreateFor(this.socket, name);
	this.room.id = "game:" + this.game.id;
	this.player = this.game.getPlayer(this.socket.id);

	this.attachRoomEvents();
	this.attachGameEvents();
};

SocketHandler.prototype.onStartToPlay = function() {
	if(this.game.status!="playing")
		this.game.start();
};

SocketHandler.prototype.onGetPlayers = function(){
	if(!this.game)
		return this.socket.emit('game error', {
			status: 404,
			message: 'You are not playing a game'
		});
	this.socket.emit('players list', this.game.getPlayers());
};

SocketHandler.prototype.onGameStarted = function() {
	this.socket.emit('started');
};

SocketHandler.prototype.onVote = function(against) {
	if(this.game)
		this.game.emit('vote', {
			from: this.socket.id,
			against: against
		});
};

SocketHandler.prototype.onNightVotesOpen = function(players) {
	if(this.player && this.player.canVoteIn('night'))
		this.socket.emit('night votes open', players);
	else
		this.socket.emit('cannot vote', 'night');
};

SocketHandler.prototype.onNightVotesClosed = function() {
	this.socket.emit('night votes closed');
};

SocketHandler.prototype.onDayVotesOpen = function(players) {
	this.socket.emit('day votes open', players);
};

SocketHandler.prototype.onDayVotesClosed = function() {
	this.socket.emit('day votes closed');
};

SocketHandler.prototype.onPlayerEliminated = function(player) {
	if(player.id === this.socket.id)
		return this.socket.emit('gameover', 'You have been eliminated!')
	this.socket.emit('player eliminated', player);
};

SocketHandler.prototype.onGameEnded = function(winner) {
	this.socket.emit('ended', winner);
	this.gameServer.removeGame(this.game.id);
};

SocketHandler.prototype.onPlayerInfo = function() {
	this.socket.emit('player info', this.player);
};

SocketHandler.prototype.onDisconnect = function() {
	if(this.room.id) {
		this.io.sockets.in(this.room.id).emit('disconnected player', this.player);	
	} else {
		this.socket.broadcast.emit('disconnected player', this.player);
	}
	if(this.player && this.game && this.game.getPlayer(this.socket.id))
		this.game.removePlayer(this.game.getPlayer(this.socket.id));
	this.gameServer.removeSocket(this.socket.id);
};
