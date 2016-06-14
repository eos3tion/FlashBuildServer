"use strict";

const cp = require('child_process');
var util = require("util");

/**
 * 项目锁
 */
const projectLock = {};

var WebSocket = require('faye-websocket'),
    http      = require('http');

var server = http.createServer();


server.on('upgrade', function(request, socket, body) {
  if (WebSocket.isWebSocket(request)) {
    let ws = new WebSocket(request, socket, body);
    ws.on('message', (event)=>{
       let data = JSON.parse(event.data);       
       let out = build(data.project,data.func,data.params,ws);
    });

    ws.on('close', (event) =>{
      console.log('close', event.code, event.reason);
      ws = null;
    });
  }
});

server.listen(3721);

function build(projectName, func, params ,ws) {
	ws.send("开始尝试构建");
    var project = projectLock[projectName];
    if(!project){
        var n=createChild(projectName,ws);
        project = new ProjectInfo(projectName,n);    
        projectLock[projectName]=project;
    }
    else{
        n = project.process;
    }
    if(project.building)
    {
        ws.send("正在构建项目！");
    }
    else{
        if(!n.connected){
			ws.send("子进程未连接,重新创建连接");
            n=createChild(projectName,ws);
            project.process=n;
        }
		n.stdout.pipe(ws);
		n.stderr.pipe(ws);
        n.send({
            func: func,
            params: params
        });
		ws.send("尝试让子进程执行"+func);
    }
}

function createChild(projectName,ws){
    var n = cp.fork([__dirname + "/" + projectName + "/build_RC.js"], {silent:true });
    return n;
}

class ProjectInfo{
    constructor(name,process){
        this.name = name + "";
        this.process = process;
        /**
         * 是否正在编译
         */
        this.building = false;
        
    }
}


//build("tiantian","help","buildApp")