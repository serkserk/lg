var shortId = require('shortid');
var util = require('util');


var Character = module.exports.Character = function(type) {
	this.voteTurn = "none";	
	this.type = "abstract";
};

Character.prototype.getVoteTurn = function() {
	return this.voteTurn;
};

Character.prototype.canVoteIn = function(turn) {
	return (this.voteTurn === "both") || (this.voteTurn === turn);
};

var Villageois = module.exports.Villageois = function() {
	this.voteTurn = "day";
	this.type = "villageois";
};
util.inherits(Villageois, Character);

var LoupGarou = module.exports.LoupGarou = function() {
	this.voteTurn = "both";
	this.type = "loup-garou";
};
util.inherits(LoupGarou, Character);

/**
 * CharacterManager: Is responsible for managing the creation of characters randomly or by type
 */
var CharacterManager = function() {
	this.characters = [];
};

CharacterManager.prototype.random = function() {
	var keys = Object.keys(this.characters)
	var type = keys[Math.floor(Math.random() * keys.length)]
	return this.generate(type);
};

CharacterManager.prototype.generate = function(type) {
	if(!(type in this.characters))
		throw new Error("This character type does not exist");
	var instance = new this.characters[type]();
	return instance;
};

CharacterManager.prototype.addCharacters = function() {
	for(ch in arguments){
		this.addCharacter(arguments[ch]);
	}
};

CharacterManager.prototype.addCharacter = function(ch) {
	var instance = new ch();
	this.characters[instance.type] = ch;
};

var characterManager = new CharacterManager();
// To add a new character just pass it as an argument
characterManager.addCharacters(LoupGarou, Villageois);

var Player = module.exports.Player = function(game, args) {
	var name = args['0'];
	var id = args.hasOwnProperty('1') ? args['1'].id : shortId.generate();
	
	this.id = id;
	this.name = name;
	this.game = game;
	this.character =  null;

	Object.defineProperty(this, 'game', {
		enumerable: false
	});
};

Player.prototype.vote = function(against) {
	this.game.emit('vote', {
		from: this.id,
		against: (against instanceof Player) ? against.id : against
	})
};

Player.prototype.canVoteIn = function(turn) {
	return this.character.canVoteIn(turn);
};

Player.prototype.generateCharacter = function(type) {
	this.character = characterManager.generate(type);
};