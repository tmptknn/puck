const canvas = document.getElementById('canvas');

const ctx = canvas.getContext('2d');

class GameObject{
  constructor(id, size, x, y, color){
    this.id = id;
    this.size =size;
    this.x = x;
    this.y = y;
    this.color = color;
  }

  move(socket, x, y){
    this.localMove(x,y);
    this.networkMove(socket);
  }

  localMove(x,y){
    this.x = x;
    this.y = y;
  }

  networkMove(socket){
    socket.send(this.getJSON());
  }

  getJSON() {
    return JSON.stringify({id:this.id, size:this.size, x:this.x, y:this.y, size:this.size });
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, 2*Math.PI);
    ctx.fill();
  }
}

const objects = [];
let socket;
const maxclients = 4;
let score =[0,0];

for(let i=0; i< maxclients; i++){
  objects[i] = new GameObject(i,50,canvas.width/2,canvas.height/2,(i%2===0)?"red":"blue");
}
objects[maxclients] = new GameObject(maxclients,25,400,300, "white");
let myId = 0;

function mouseMove(e){
  // console.log("event "+e.pageX+" "+e.pageY);
  objects[myId].move(socket, e.pageX, e.pageY);
}

function touchMove(event) {
  const x = (event.touches[0].clientX - canvas.offsetLeft);
  const y = (event.touches[0].clientY - canvas.offsetTop);
  mouseMove({pageX:x,pageY:y})
}

function refresh(){
  ctx.fillStyle = "lightGreen";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = "black";

  ctx.fillRect(0,canvas.height/4,10,canvas.height/2);
  ctx.fillRect(canvas.width-10,canvas.height/4,canvas.width,canvas.height/2);

  for(let i=0; i<=maxclients; i++){
    if(objects[1]) objects[i].draw(ctx);
  }
  ctx.fillStyle = "white";
  ctx.font = "40px Arial";
  ctx.fillText(""+score[0],canvas.width/4,canvas.height/2);
  ctx.fillText(""+score[1],canvas.width*3/4,canvas.height/2);
  requestAnimationFrame(refresh);
}

canvas.addEventListener("mousemove",mouseMove,true);

document.body.addEventListener('touchmove', (e) => { // eslint-disable-line no-undef
        if (e.target === canvas) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, false);

canvas.addEventListener('touchmove', touchMove,false);

refresh();

const ho = location.host.split(":")[0];

socket = new WebSocket("ws://"+(ho?ho:"localhost")+":1337");

socket.onopen = function() {
   console.log("connection open");
};

socket.onmessage = function (message) {

   let json;
   //console.log(""+message.data);
   try {
   json = JSON.parse(message.data);
   } catch (e) {
     console.log('This doesn\'t look like a valid JSON: ',
         message.data);
     return;
   }
   if(json){
     if(json.yourId !== undefined){
       console.log("got id "+json.yourId);
       myId = json.yourId;
     } else if(json.id !== undefined){
       objects[json.id].localMove(json.x, json.y);
     } else if(json.team0Score !== undefined){
        score[0] = json.team0Score;
        score[1] = json.team1Score;
        console.log("Score !!");
     } else {
       console.log(""+message.data);
     }
   }
};

socket.onclose = function() {

   // websocket is closed.
   console.log("Connection is closed...");
};
