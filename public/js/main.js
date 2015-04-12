var socket = io();
var listPlayersInterval = null;
var user = {
	name : ''
};

humane.clickToClose = true;
faker.locale = 'fr';
$(document).ready(function() {
	// Homepage
	firstpage();

	// Direct join game with random name
	// Development only
	// user.name = faker.name.findName();
	// wantToPlay();
});

socket.on("disconnected player", onDisconnected);

socket.on('started', function() {
	socket.removeAllListeners("ready to play");
	clearInterval(listPlayersInterval);
	
	socket.on('player info', function(userData) {
		user = userData;
		displayName();
	});
	socket.emit('player info');

	socket.on('night votes open', nightVotesOpen);
	socket.on('night votes closed', nightVotesClosed);
	socket.on('day votes open', dayVotesOpen);
	socket.on('day votes closed', dayVotesClosed);
	socket.on('cannot vote', cannotVote);
	socket.on('player eliminated', onEliminated);

	socket.on('gameover', iLost)
	socket.on('ended', gameEnded);
});



function render(page, data) {
	var $main = $('#main');
	var currentPage = $main.attr("page");

	// Remove class of previous page
	if(currentPage) {
		$main.removeClass(currentPage);
	}

	// Render Template
	var template = $('#'+page+'Template').html();
	Mustache.parse(template);
	var rendered = Mustache.render(template, data || {});
	$main.html(rendered);

	// Add a page class and attribute
	$main.attr("page", page);
	$main.addClass(page);
}

function firstpage() {
	render('home');
	var $home = $(".home");
	$home.find("#play").on('click', function(e) {
		e.preventDefault();
		if(!$home.find("#name").val())
			return alert("Vous devez choisir un pseudo!");
		user.name = $home.find("#name").val();
		wantToPlay();
		return false;
	});
}


function displayName() {
	$(".nameDisplay").css('display', 'block');
	var template = $('#nameDisplayTemplate').html();
	Mustache.parse(template);
	var rendered = Mustache.render(template, user);
	$(".nameDisplay").html(rendered);
}

function wantToPlay() {

	socket.on('ready to play', readyToPlay);
	socket.emit('want to play', user.name);
	

	listPlayersInterval = setInterval(function() {
		socket.on('players list', function(players) {
			render('readyToPlay', {
				players : players,
				canStart: false
			})
		});
		socket.emit('get players');
	}, 1000);
}

function readyToPlay(players) {
	clearInterval(listPlayersInterval);
	render('readyToPlay', {
		players : players,
		canStart: true,
		title: 'Prêt a jouer'
	});
	$(".readyToPlay").find("#start").on('click', function(e) {
		e.preventDefault();
		start();
		return false;
	});
}

function start() {
	socket.emit('start');
}

var dayVotesOpen = function(players) {
	voteView('Jour', players)
}

var nightVotesOpen = function(players) {
	voteView('Nuit', players)
}

var voteView = function(turn, players) {
	var against = null;
	players = removeMySelfFromVotes(players);
	render('votes', {
		players: players,
		turn: turn
	});
	$voteView = $('.votes');
	$voteView.find('#vote').prop("disabled",true);

	$voteView.find("input[name=against]").change(function() {
		if($(this).is(':checked') && $(this).val()) {
			against = $(this).val();
			$voteView.find('#vote').prop("disabled",false);
		}
	});

	$voteView.find('#vote').on('click', function(e) {
		e.preventDefault();

		if(!against)
			return alert("Vous devez choisir quelqu'un à éliminer");
		console.log('Vote against ', against);
		socket.emit('vote', against);
		return false;
	});
}

var iLost = function(message) {
	removeAllListeners();
	render('iLost');
}

var removeAllListeners = function() {
		socket.removeAllListeners("night votes open");
		socket.removeAllListeners("night votes closed");
		socket.removeAllListeners("day votes open");
		socket.removeAllListeners("day votes closed");
		socket.removeAllListeners("cannot vote");
		socket.removeAllListeners("player eliminated");
		socket.removeAllListeners("ready to play");
}

var gameEnded = function (winner) {
	render('gameEnded', {
		winner: winner
	});
	$(".gameEnded").find("#playagain").on('click', function(e) {
		if(user.name)
			wantToPlay();
		else
			firstpage();
	});
}

var onEliminated = function(player) {
	humane.log(player.name + " est mort!");
}

function onDisconnected(player) {
	console.log("Disconnected: ", player)
	if(player)
		humane.log(player.name + " s'est déconnecté")
};

var nightVotesClosed = dayVotesClosed = function(looser) {
	// console.log('Eliminated player: ', looser);
};

var cannotVote = function(turn) {
	render('notMyTurn', {
		turn: turn === 'day' ? 'le jour' : 'la nuit'
	});
};

var removeMySelfFromVotes = function(players) {
	return players.filter(function(p) {
		return p.id !== socket.id;
	});
}
