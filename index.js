var http = require('http');
var WebSocketServer = require('websocket').server;
var fs = require('fs');
var path = require('path');
var Jimp = require("jimp");
var RaspiCam = require("raspicam");
var dateFormat = require('dateformat');

var camera = new RaspiCam({ mode:"photo",t:0,output:"new.bmp",encoding:"bmp" });
var old_img;

http.createServer(function (request, response) {
    var filePath = '.' + request.url;
    if (filePath == './')
        filePath = './index.html';

    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;      
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
    }

    fs.readFile(filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./404.html', function(error, content) {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                response.end(); 
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });

}).listen(80);

var server = http.createServer(function(request, response) {});
var count = 0;
var clients = {};
var storedMessages = [];

server.listen(1012, function() {
    console.log((new Date()) + ' Server is listening on port 1012');
});


wsServer = new WebSocketServer({
    httpServer: server
});

wsServer.on('request', function(r){
    var connection = r.accept('echo-protocol', r.origin);
	var id = count++;
	clients[id] = connection;
	for(i=0;i<storedMessages.length;i++) connection.sendUTF(storedMessages[i]); // send old picture urls to new client
	console.log((new Date()) + ' Connection accepted [' + id + ']');
	
	connection.on('close', function(reasonCode, description) {
		delete clients[id];
		console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
	});	
});

camera.on("read", function(err,filename){
   Jimp.read('new.bmp', function (err, image) {
       new_img=image.clone();
       new_img.resize(160,120).greyscale().normalize(); 
       if (old_img&&(Jimp.distance(old_img,new_img)>=0.1)) { // distance is a measure on how much the new picture differs from the last
			var now = new Date();
			var f='./action/'+dateFormat(now, "yyyymmdd_HHMMss")+'.jpg';
			image.write(f);
	
			storedMessages.push(f);  
			if (storedMessages.length>3) storedMessages.shift();
			for(var i in clients){
				clients[i].sendUTF(f);
			}
		}
       old_img=new_img.clone();
       });
   });

camera.start();
