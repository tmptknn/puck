//const canvas = document.getElementById('canvas');
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer();
var controller1;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.body.appendChild( WEBVR.createButton( renderer ) );
renderer.vr.enabled = true;
const canvas = renderer.domElement;

const fd ={width:0.5, depth:5/6, height:0.75, distance:0.1};
//const ctx = canvas.getContext('2d');

class GameObject {
    constructor(id, size, x, y, color) {
        this.id = id;
        this.size = size;
        this.x = x;
        this.y = y;
        this.color = color;
    }

    move(socket, x, y) {
        this.localMove(x, y);
        this.networkMove(socket);
    }

    localMove(x, y) {
        this.x = x;
        this.y = y;
    }

    networkMove(socket) {
        socket.send(this.getJSON());
    }

    getJSON() {
        return JSON.stringify({ id: this.id, size: this.size, x: this.x, y: this.y, size: this.size });
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
        ctx.fill();
    }
}

const objects = [];
let socket;
const maxclients = 4;
let score = [0, 0];

for (let i = 0; i < maxclients; i++) {
    objects[i] = new GameObject(i, 50, 0, 0, (i % 2 === 0) ? "#ff0000" : "#0000ff");
}
objects[maxclients] = new GameObject(maxclients, 25, 400, 300, "#ffffff");
let myId = 0;

function mouseMove(e) {
    objects[myId].move(socket, (e.pageY)*1280/window.innerHeight, (window.innerWidth-e.pageX)*768/window.innerWidth);
}

controller1 = renderer.vr.getController( 0 );
controller1.userData.id = 0;
scene.add( controller1 );

function handleController( controller ) {
    var pivot = controller.getObjectByName( 'pivot' );
    if ( pivot ) {
        var id = controller.userData.id;
        var matrix = pivot.matrixWorld;
        var vector = new THREE.Vector3().setFromMatrixPosition( matrix );
        objects[myId].move(socket, (fd.distance+fd.depth+vector.z)/fd.depth*1280, (fd.width/2-vector.x)/fd.width*768);
    }
}

canvas.addEventListener("mousemove", mouseMove, true);

const ho = location.host.split(":")[0];
//const ho = "139.59.210.174";

socket = new WebSocket("ws://" + (ho ? ho : "localhost") + ":1337");

socket.onopen = function () {
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
    if (json) {
        if (json.yourId !== undefined) {
            console.log("got id " + json.yourId);
            myId = json.yourId;
        } else if (json.id !== undefined) {
            objects[json.id].localMove(json.x, json.y);
        } else if (json.team0Score !== undefined) {
            score[0] = json.team0Score;
            score[1] = json.team1Score;
            console.log("Score !!");
        } else {
            console.log("" + message.data);
        }
    }
};

socket.onclose = function () {

    // websocket is closed.
    console.log("Connection is closed...");
};

var bmaterial = new THREE.MeshStandardMaterial( {
    color: 0xffffff,
    // envMap: reflectionCube,
    roughness: 0.9,
    metalness: 0.0
} );
var pivot = new THREE.Mesh( new THREE.IcosahedronBufferGeometry( 0.002, 2 ), bmaterial );
					pivot.name = 'pivot';
					pivot.position.y = - 0.016;
					pivot.position.z = - 0.043;
					pivot.rotation.x = Math.PI / 5.5;


controller1.add(pivot);
scene.add( new THREE.AmbientLight( 0xAAAAAA ) );

const fieldGeo = new THREE.PlaneGeometry( fd.width,fd.depth);
const fieldMat = new THREE.MeshPhongMaterial({color: 0x00ff00, specular: 0x009900, shininess: 30, flatShading: true, side: THREE.DoubleSide });
const field = new THREE.Mesh( fieldGeo, fieldMat );
field.rotateX(Math.PI/2.0);
field.position.copy(new THREE.Vector3( 0, fd.height, -(fd.depth/2+fd.distance) ));
scene.add(field);

const goalGeo = new THREE.PlaneGeometry( fd.width/2,fd.width/20);
const goalMat = new THREE.MeshPhongMaterial({color: 0x222222, specular: 0x009900, shininess: 30, flatShading: true, side: THREE.DoubleSide });
const goal1 = new THREE.Mesh( goalGeo, goalMat );
goal1.rotateX(Math.PI/2.0);
goal1.position.copy(new THREE.Vector3( 0, fd.height+0.00001, -(fd.distance) ));
scene.add(goal1);

const goal2 = new THREE.Mesh( goalGeo, goalMat );
goal2.rotateX(Math.PI/2.0);
goal2.position.copy(new THREE.Vector3( 0, fd.height+0.00001, -(fd.depth+fd.distance) ));
scene.add(goal2);


let discs =[];
for(let i=0; i<=maxclients; i++){
    const mat = new THREE.MeshPhongMaterial({color: 0xaaaaaa, specular: 0x009900, shininess: 30, flatShading: true, side: THREE.DoubleSide });
    const geo = new THREE.CircleGeometry( objects[i].size*fd.depth/1280, 64 );
    const circ = new THREE.Mesh( geo, mat );
    scene.add( circ );
    circ.rotateX(-Math.PI/2.0);
    circ.position.copy(new THREE.Vector3( 0, 1, 0 ));
    discs.push(circ);
}

var directionalLight = new THREE.DirectionalLight( 0xaaaaaa, 0.125 );
				directionalLight.position.x = Math.random() - 0.5;
				directionalLight.position.y = Math.random() - 0.5;
				directionalLight.position.z = Math.random() - 0.5;
				directionalLight.position.normalize();
                scene.add( directionalLight );
                
camera.position.z = 1;

renderer.setAnimationLoop( function () {
    handleController( controller1 );
    for(let i=0; i<=maxclients; i++){
        if(objects[1]){
             const disc = objects[i];
             discs[i].position.copy(new THREE.Vector3( (fd.width-disc.y*fd.width)/768+fd.width/2, fd.height+0.0001, disc.x*fd.depth/1280-(fd.depth+fd.distance) ))
             discs[i].material.setValues({color:disc.color});
        }
      }

	renderer.render( scene, camera );

} );