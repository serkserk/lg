

var chai = require('chai'),
    mocha = require('mocha'),
    should = chai.should();

var io = require('socket.io-client');
var faker = require('faker');

describe("Game", function () {

    var server,
        options ={
            transports: ['websocket'],
            'force new connection': true
        };
	
	var numClients = 10;
    var clients = [];
    
	beforeEach(function (done) {
        // start the server
        server = require('../server').server;

        
        done();
    });

    function newUser() {
        var user = {};
        user.name = faker.name.findName();
        return user;
    }

    function playerWantsToPlay(i, numClients, clients, callback) {
        var client = io.connect("http://localhost:3000", options);

        var user = newUser();
        client.once("connect", function () {
            clients.push(client);

            client.on('ready to play', function(players) {
                // client.disconnect();
                if (i==numClients-1) {
                    callback(null, clients, i);
                }
            });
            client.emit('want to play', {
                name: user.name
            });

        });
    }
	
	function disconnectClients(callback) {
		clients.forEach(function(client, i, a) {
			client.disconnect();
			if(i==a.length-1)
				callback();
		});
	}

    it("should add player to a new or existing game", function(done) {
        this.timeout(5000);

		for (var i = 1; i <= numClients; i++) {
			playerWantsToPlay(i, numClients, clients, function(err, clients, idx) {
				if(idx==numClients-1)
					done();
			});
		}
    });

    it('should fetch current list of players', function(done) {
    	var client = clients[0];
    	client.on('players list', function(players) {
    		players.should.not.be.empty();
    		players.should.be.an('array');
    		done();
    	});
    	client.emit('get players');
    });



	it("should play until a team looses", function(done) {
		this.timeout(20000);

		clients[0].on("started", function() {
			console.log('Game started');
		});
		clients[4].on('ended', 	function(winner) {
			console.log('Game ended with a winner', winner);
			done();
		});
		clients.forEach(function(client) {
			var dayTimeout, nightTimeout;
			client.on('night votes open', function(players) {
				players.should.be.instanceof(Array)
				players.length.should.be.not.equal(0);

				// Timeout to simulate asynchronous replies
				nightTimeout = setTimeout(function() {
					// Vote against a random player
					client.emit('vote', players[Math.floor(Math.random()*players.length)].id);
				}, 1500*Math.random());
			});
			client.on('night votes closed', function() {
				clearTimeout(nightTimeout);
			});
			client.on('day votes open', function(players) {
				players.should.be.instanceof(Array)
				players.length.should.be.not.equal(0);

				// Timeout to simulate asynchronous replies
				dayTimeout = setTimeout(function() {
					// Vote against a random player
					client.emit('vote', players[Math.floor(Math.random()*players.length)].id);
				}, 1500*Math.random());
				
			});
			client.on('day votes closed', function() {
				clearTimeout(dayTimeout);
			});

			client.on('player eliminated', function(player) {
				player.should.not.be.empty();
			});
		});	

		clients[2].emit("start");
	});

	after( function(done) {
		disconnectClients(function() {
			done();
		});
	});
});
