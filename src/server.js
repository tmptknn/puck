'use strict';

const express = require('express');

// Constants
const PORT = 80;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  res.sendFile('/html/index.html');
});

app.get('/pong.js', (req, res) => {
  res.sendFile('/html/pong.js');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);

var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
});
server.listen(1337, function() { });


var listenserver = http.createServer(function(request, response) {
});
listenserver.listen(57331, function() { });

class ServerObject{
  constructor(id, size, x, y){
    this.id = id;
    this.size =size;
    this.x = x;
    this.y = y;
    this.speedX = 0;
    this.speedY = 0;
  }

  move(x, y) {
    this.x = x;
    this.y = y;
  }

  getJSON() {
    return JSON.stringify({id:this.id, size:this.size, x:this.x, y:this.y, size:this.size });
  }

  toJSON() {
    return {id:this.id, size:this.size, x:this.x, y:this.y, size:this.size };
  }
}

// create the server
const wsServer = new WebSocketServer({
  httpServer: server
});

const listenWsServer = new WebSocketServer({
  httpServer: listenserver
});

const clients = [];
let listenclient = null;
let clientId = 0;
const maxclients = 4;
const width = 1280;
const height = 768;

const objects = [];
let socket;
let puck;

for(let i=0; i< maxclients; i++){
  objects[i] = new ServerObject(i,100,-500,-50);
}
objects[maxclients] = puck = new ServerObject(maxclients,75,width/2,height/2);

const damping = 0.01;
let scoreRed = 0;
let scoreBlue = 0;

function sendScore(){
  const data = JSON.stringify({team0Score:scoreBlue, team1Score:scoreRed });
  for(let i=0; i<maxclients; i++) {
    if(clients[i]) clients[i].connection.sendUTF(data);
  }
  if(scoreRed>=9 || scoreBlue>=9){
    scoreRed = 0;
    scoreBlue = 0;
  }
}

function goal() {
  sendScore();
  puck.speedX = 0;
  puck.speedY = 0;
  puck.x = width/2+(Math.random()-0.5)*puck.size;
  puck.y = height/2+(Math.random()-0.5)*puck.size;
}

function updateScore() {
  if(puck.x< 0){
     scoreBlue+=1;
     goal();
  }
  if(puck.x> width){
     scoreRed+=1;
     goal();
   }
}

function sendGameOn() {
  let allout=true;
  for(let i=0; i< maxclients; i++){
    if(clients[i]){
       allout =false;
    }
  }
  if(listenclient){
    if(allout){
      listenclient.connection.sendUTF(JSON.stringify({gameOn:0}));
    }else{
      listenclient.connection.sendUTF(JSON.stringify({gameOn:1}));
    }
  }
}

function update(){
  let dx = puck.speedX*(1.0 - damping);
  let dy = puck.speedY*(1.0 - damping);
  for(let i =0; i< maxclients; i++){
    const o = objects[i];
    const xd = (puck.x+dx)-o.x;
    const yd = (puck.y+dy)-o.y;
    const len =Math.sqrt(xd*xd+yd*yd);
    if(len<puck.size+o.size) {
      const inside = (puck.size+o.size)-len;
      const nn = xd*xd+yd*yd;
      const vn = xd*dx+yd*dy;
      if(vn <= 0){
        dx -= (2*(vn/nn))*xd;
        dy -= (2*(vn/nn))*yd;
      }
      dx += xd*inside/(len*2);
      dy += yd*inside/(len*2);
    }
  }

  if((puck.x+dx < puck.size ||
      puck.x+dx > width - puck.size)
      && (puck.y + dy < height/4 -puck.size ||
        puck.y + dx > height*3/4+puck.size)) {
    dx = -dx
  }

  if(puck.y+dy < puck.size || puck.y+dy > height - puck.size){
    dy = -dy
  }

  puck.speedX = dx;
  puck.speedY = dy;

  puck.move(puck.x+puck.speedX, puck.y+puck.speedY);

  updateScore();
  move(puck.toJSON());
}

function move(object){
  if(object.id < maxclients) objects[object.id].move(object.x, object.y);
  const data = JSON.stringify(object);
  for(let i=0; i<maxclients; i++) {
    if(clients[i] && (i !== object.id)) clients[i].connection.sendUTF(data);
  }
  if(listenclient) listenclient.connection.sendUTF(data)
}

// WebSocket server
wsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin);
  const id = clientId;
  if(clients[id]){
    console.log("Dropping old connection "+id);
    clients[id].connection.close();
  }
  connection.sendUTF(JSON.stringify({yourId:id}));
  for(let i=0; i<=maxclients; i++){
    connection.sendUTF(objects[i].getJSON())
  }
  clients[id] = {connection:connection};
  sendScore();
  sendGameOn();
  clientId+=1;
  if(clientId >=maxclients) clientId = 0;
  connection.on('message', function(message) {
    let json;
    if (message.type === 'utf8') {
      try {
      json = JSON.parse(message.utf8Data);
      } catch (e) {
        console.log('This doesn\'t look like a valid JSON: ',
            message.utf8Data);
        return;
      }
      if(json){
        if(json.id !== undefined){
          move(json);
        }
      }
    }
  });

  connection.on('close', function(connection) {
    console.log("bye "+id);
    clients[id] = null;
    sendGameOn();
    objects[id].move(-50,-50);
    move(objects[id]);
  });
});


listenWsServer.on('request', function(request) {
  var connection = request.accept(null, request.origin);
  const id = 9;
  if(listenclient){
    console.log("Dropping old connection "+id);
    listenclient.connection.close();
  }
  connection.sendUTF(JSON.stringify({yourId:id}));
  listenclient = {connection:connection};
  sendScore();
  sendGameOn();
  connection.on('message', function(message) {
    console.log("Listener send message??!")
  });

  connection.on('close', function(connection) {
    console.log("bye listener "+id);
  });
});
setInterval(update,30);
