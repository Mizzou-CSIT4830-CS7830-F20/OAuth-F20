var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var port = 8080;


function handler(req, res) {
    fs.readFile("client.html", function(err, data) {
        if (err) {
            res.writeHead(500);
            res.end("Error loading client.html");
        }
        else {
            res.writeHead(200);
            res.end(data);
        }
    });
};


app.listen(port, function() {
    console.log("Running on port: " + port);
});


var state = {
    started: false,
    health: 0,
    players: {},
    baddies: []
};

io.on("connection", function(socket) {
    console.log("A user (" + socket.id + ") connected");
    
    // When a player joins...
    socket.on("join", function(player) {
        console.log(player.name + " joined the game!");
        // Add them to the game state
        state.players[socket.id] = player;
        
        // And tell the clients
        io.sockets.emit("updatePlayers", state.players);
        
        // If this is the first client to connect...
        if (Object.keys(state.players).length == 1) {
            // Let them know that they are the host
            io.to(socket.id).emit("isHost");
        }
        
        // Check if the game has already started
        if (state.started) {
            io.to(socket.id).emit("startGame", state);
        }
    });
    
    // If a client disconnects
    socket.on("disconnect", function() {
        console.log(state.players[socket.id].name + " disconnected");
        
        // Remove the client from server's memory
        delete state.players[socket.id];
        
        // Tell the other clients that there's been an update
        socket.broadcast.emit("updatePlayers", state.players);
    });
    
    // If the host sets up a new game...
    socket.on("setupGame", function(props) {
        // Setup fort health
        state.health = props.health;
        
        // Remember the baddies
        state.baddies = props.baddies;
        
        // Tell all clients to start
        state.started = true;
        io.sockets.emit("startGame", state);
    });
    
    // Whe the host's baddies move...
    socket.on("updateBaddies", function(baddies) {
        // Remember the moves
        state.baddies = baddies;
        
        // Tell the other clients about the changes
        socket.broadcast.emit("updateBaddies", state.baddies);
    });
    
    // Just update the health of the baddies
    /*
    socket.on("updateBaddiesHealth", function(baddies) {
        for (var i in baddies) {
            if (state.baddies[i]) {
                state.baddies[i].health = baddies[i].health;
            }
        }
        socket.broadcast.emit("updateBaddies", state.baddies);
    });
    */
    
    // If the user scores...
    socket.on("score", function() {
        state.players[socket.id].score++;
        io.sockets.emit("updatePlayers", state.players);
    });
    
    
    // If a baddie hits the base...
    socket.on("damageBase", function() {
        state.health -= 1;
        io.sockets.emit("baseDamaged", state.health);
    });
});