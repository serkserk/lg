var GameCore = require('../src/game.core');
var faker = require('faker');


var game = new GameCore({
	debug: true,
	duration: {
		night: 1000
	}
});
var N = 8 + Math.floor(Math.random()*10);
for (var i = 0; i < N; i++) {
	game.addPlayer(faker.name.findName());
}


game.on('alert', function(msg) {
	console.warn("Alert: "+msg);
});

var nightVote;
var dayVote = nightVote = function() {
	setTimeout(function() {
		game.getPlayers().forEach(function(p) {
			if(p.canVoteIn(game.turn)) {
				p.vote(game.getPlayers()[Math.floor(Math.random()*game.getPlayers().length)]);
			}
		});
	}, 200);
};

game.on('night votes open', nightVote);
game.on('day votes open', dayVote);


var result = function() {
	// console.log('Number of players', game.getPlayers().length);
};
game.on('night votes closed', result);
game.on('day votes closed', result);
game.on('ended', function(winner) {
	console.log("End of game!!!");
	console.log('And the winner is:', winner);
});

game.start();
