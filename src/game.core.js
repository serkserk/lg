var _ = require('lodash');
_.mergeDefaults = require('merge-defaults');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var shortId = require('shortid');
var Player = require('./player').Player;

/**
 * GameCore Class used to create a new game independently of WebSockets
 * @param  {Object} options Options that overrides default settings
 */
var GameCore = module.exports = function(options) {  //parametre du jeux
	this.id = shortId.generate();
	this.options = _.mergeDefaults(options || {}, {
		duration: {
			night: 1000,
			day: 1000,
			interTurn: 1000
		},
		debug: false, //affiche les messages
		min: 6,
		max: 12,
		character: {
			loupGarous: 20 // Limite en pourcentage du nombre de Loups-Garous
		}
	});
	this.players = [];
	this.status = "pending";
	this.turn = "night";
	this.turnsCount = 0;
	this.votes = {};
	this.registerEvents();
	_.bindAll(this);
};

// Inherit from EventEmitter - Gives the ability to the class to receive and emit events
util.inherits(GameCore, EventEmitter);

/**
 * Register events of GameCore class
 */
GameCore.prototype.registerEvents = function() {
	this.on("vote", this.onVote);
};


GameCore.prototype.log = function() {
	if(this.options.debug)
		console.log.apply(console, arguments);
};

/**
 * Vote function
 * @param  {Object} data { from: ID, against: ID}
 */
GameCore.prototype.onVote = function(data) {  //vote contre against
	var player = this.getPlayer(data.from);
	if(player && player.canVoteIn(this.turn))
	{
		this.votes[this.turnsCount].push({
			from: data.from,
			against: data.against
		});
	} else {
		this.emit('alert', 'You cannot vote!');
	}
};

/**
 * Get the player with id = id
 * @param  {String} id User id
 */
GameCore.prototype.getPlayer = function(id) {  //Verifie la présence du joueur id
	for (var i = 0; i < this.players.length; i++)
		if(this.players[i].id === id)
			return this.players[i];
	return false;
};

/**
 * @return {Array} List of all the players
 */
GameCore.prototype.getPlayers = function() {
	return this.players;
};

GameCore.prototype.addPlayer = function(name) { //ajout d'un joueur dans la salle
	if(this.getPlayers().length > this.options.max)
		return false;
	var player = new Player(this, arguments);
	this.players.push(player);

	if(this.getPlayers().length >= this.options.min)
		this.emit('ready to play', this.getPlayers().length);
	return player;

};

GameCore.prototype.start = function() { //changement statut : debut de la partie
	this.setType();
	this.emit('started');
	this.status = "playing"
	this.firstTurn();
};

GameCore.prototype.setType = function() { //attribution de roles

	var playerNB = this.players.length;
	var lgNB = Math.round((playerNB * this.options.character.loupGarous) / 100);
	
	for (var i = 0 ; i < playerNB ; i++) {

		var rndNB = Math.floor((Math.random() * 4) + 1);
		if (rndNB == 4 && lgNB != 0) {
			this.players[i].generateCharacter("loup-garou");
			lgNB--;
		}
		else if ((playerNB - (i+1)) == lgNB && lgNB != 0) {
			this.players[i].generateCharacter("loup-garou");
			lgNB--;
		}
		else
			this.players[i].generateCharacter("villageois");
	}
}

/*	var pctL = Math.round( this.players.length * (20 / 100) );

	for(var i=0; i<this.players.length - pctL; i++) {
		this.players[i].generateCharacter("villageois");
	}

	for(var i=0; i<this.players.length; i++) {
		if (this.players[i].character === null)
			this.players[i].generateCharacter("loup-garou");
	}
}*/



GameCore.prototype.stop = function(winner) { //fin de partie, renvoi le gagnant
	this.status = "end";
	this.emit('ended', winner);
};

GameCore.prototype.firstTurn = GameCore.prototype.nightTurn = function() { //premier tour de vote : la nuit
	var self = this;
	this.startVotes("night");
	setTimeout(function() {
		self.stopVotes("night");
	}, this.options.duration.night);
};
GameCore.prototype.startVotes = function(period) {
	this.votes[this.turnsCount] = [];
	this.emit(period+' votes open', this.getPlayers());  //Trouve les joueurs qui votent ds la periode courante
};
GameCore.prototype.stopVotes = function(period) {	//fin du vote en cours
	this.emit(period+' votes closed');
	this.nextTurn();
};

GameCore.prototype.dayTurn = function() { //Debut du jour 
	var self = this;
	this.startVotes("day");
	setTimeout(function() {
		self.stopVotes("day");
	}, this.options.duration.day);
};
/**
 * Find the looser of the last session of votes
 * @return {Player} Return a Player object of the looser
 */
GameCore.prototype.findLooser = function() {	//Choix du joueur éliminé
	var votes = this.votes[this.turnsCount];
	var total = {};

	for (var i = 0; i < votes.length; i++) {
		if(total.hasOwnProperty(votes[i].against)) {
			total[votes[i].against]++;
		} else {
			total[votes[i].against] = 1;
		}
	}

	// Reverse sorted list of highest votes for a player
	var sorted = _.sortBy(Object.keys(total), function(against) {
		return total[against];
	}).reverse();

	// If not votes are registered
	//		it should end the game ?
	if(Object.keys(total).length == 0) {
		this.log("Zero votes (Normally end of game)");
		return null;
	}
	else if (Object.keys(total).length == 1) // If all players voted for a single player
		return this.getPlayer(Object.keys(total)[0]);
	else {
		var last = total[sorted[0]];
		var duplicateScores = [];
		for (var i = 1; i < sorted.length; i++) {
			if(last === total[sorted[i]]) // If two or more players have an equal number of votes, it should add it to the collection of duplicates
				duplicateScores.push(sorted[i]);
			else if (last>total[sorted[i]]) // Stop when no more total votes are in conflict
				break;
		}
		if(duplicateScores.length) // If has duplicates choose a random player to be elminated
			return this.getPlayer(duplicateScores[Math.floor(Math.random() * duplicateScores.length)]);
		else // If one player has the majority of votes against him
			return this.getPlayer(sorted[0]);
	}
};

GameCore.prototype.showDebugInfos = function() {
	this.log('Game ID: ', this.id)
	this.log('----> Tour:', this.turn);
	this.log('Nombre de joueurs', this.players.length);
	this.log('Nombre loup-garou', this.numberOfCharacterType("loup-garou"));
	this.log('Nombre villageois', this.numberOfCharacterType("villageois"));
};

GameCore.prototype.detectEndOfGame = function() {	//detecte si il y a des villageois/loups en jeu
	if(this.numberOfCharacterType("villageois") === 0) {
		this.log('Winner is Loups Garous');
		this.stop('loup-garou');
	} else if (this.numberOfCharacterType("loup-garou") === 0) {
		this.log('Winner is Villageois');
		this.stop('villageois');
	}

};

GameCore.prototype.eliminateLooser = function(callback) { 	//enleve le joueur éliminé des prochains votes
	var player = this.findLooser();
	if(!player && this.turn === "night")
		return this.stop('villageois');
	else if(player) {
		this.removePlayer(player);
	}
	this.showDebugInfos();
	this.detectEndOfGame();
	// Set timeout to allow display of intermediate results
	setTimeout(callback.bind(this), this.options.duration.interTurn);
};

GameCore.prototype.findPlayersOfType = function(type) {	//renvoi les joueurs type
	return this.players.filter(function(p) {
		return p.character.type === type;
	});
};

GameCore.prototype.findPlayersOfPeriod = function(period) { //Renvoi le type de joueur qui joue pdt cette periode
	var type = period === "day" ? "villageois" : "loup-garou";
	return this.findPlayersOfType(type);
};


GameCore.prototype.numberOfCharacterType = function(type) {	//nb de chaque joueur type
	var characterTypeNumber = this.findPlayersOfType(type).length;
	var count = 0;
	for (var i = 0; i < this.players.length; i++) {
		if(this.players[i].character.type === type)
			count++;
	}
	return count;
};

GameCore.prototype.removePlayer = function(player) {	
	var index = this.players.indexOf(player);
	if(index === -1)
		throw new Error("User inexistant");
	else {
		this.emit('player eliminated', player);
		return this.players.splice(index, 1);
	}
};
GameCore.prototype.nextTurn = function() {	//Tour suivant
	this.eliminateLooser(function() {
		if(this.status != "playing")
			return false;
		this.turn = this.turn === "night" ? "day" : "night";
		this.turnsCount++;
		if(this.turn === "night") {
			this.nightTurn();
		} else {
			this.dayTurn();
		}
	});

};

GameCore.prototype.update = function(time) {
	this.time = new Date().getTime();
};

GameCore.prototype.availableSpace = function() { //place disponible pour la partie
	return this.options.max - this.players.length;
};
