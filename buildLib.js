'use strict'
var fs = require("fs");
var childProcess = require('child_process');
var path = require('path');
var crypto = require('crypto');
var zlib = require('zlib');

/*********************************************常量定义*****************************************************/

/**
 * flex sdk的bin的路径
 */
const FLEX_BIN_PATH = "D:/flex_sdks/4.6.0.23201/bin";

/**
 * 辅助用 7z  pngquant zswf 的exe的路径
 */
const OTHER_EXEC = "D:/Builder/exe/other";

/**
 * python3的路径
 */
const PYTHON_3 = "C:/Python34";

/**
 * python2的路径
 */
const PYTHON_2 = "C:/Python27";

/**
 * python脚本的根目录
 */
const PYTHON_SCRIPT_ROOT = "D:/Builder/py/";

/*******************************************辅助函数************************************************/

/**
 * 格式化日期
 */
Date.prototype.format = function (mask) {
    var d = this;
    var zeroize = function (value, length) {
        if (!length) length = 2;
        value = String(value);
        for (var i = 0, zeros = ''; i < (length - value.length); i++) {
            zeros += '0';
        }
        return zeros + value;
     
    };
    return mask.replace(/"[^"]*"|'[^']*'|(?:d{1,4}|m{1,4}|yy(?:yy)?|([hHMstT])\1?|[lLZ])/g, function ($0) {
        
        switch ($0) {      
     
            case 'd': return d.getDate();
     
            case 'dd': return zeroize(d.getDate());
     
            case 'ddd': return ['Sun', 'Mon', 'Tue', 'Wed', 'Thr', 'Fri', 'Sat'][d.getDay()];
     
            case 'dddd': return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
     
            case 'M': return d.getMonth() + 1;
     
            case 'MM': return zeroize(d.getMonth() + 1);
     
            case 'MMM': return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
     
            case 'MMMM': return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()];
     
            case 'yy': return String(d.getFullYear()).substr(2);
     
            case 'yyyy': return d.getFullYear();
     
            case 'h': return d.getHours() % 12 || 12;
     
            case 'hh': return zeroize(d.getHours() % 12 || 12);
     
            case 'H': return d.getHours();
     
            case 'HH': return zeroize(d.getHours());
     
            case 'm': return d.getMinutes();
     
            case 'mm': return zeroize(d.getMinutes());
     
            case 's': return d.getSeconds();
     
            case 'ss': return zeroize(d.getSeconds());
     
            case 'l': return zeroize(d.getMilliseconds(), 3);
     
            case 'L': {
                var m = d.getMilliseconds();
                
                if (m > 99) m = Math.round(m / 10);
                
                return zeroize(m);
            }
     
            case 'tt': return d.getHours() < 12 ? 'am' : 'pm';
     
            case 'TT': return d.getHours() < 12 ? 'AM' : 'PM';
     
            case 'Z': return d.toUTCString().match(/[A-Z]+$/);
     
            // Return quoted strings with the surrounding quotes removed      
     
            default: return $0.substr(1, $0.length - 2);
     
        }
     
    });
};

/**
 * 替换字符串中{0}{1}{2}{a} {b}这样的数据，用obj对应key替换，或者是数组中对应key的数据替换
 */
String.prototype.substitute = function () {
    var len = arguments.length;
    if (len > 0) {
        var obj;
        if (len == 1) {
            obj = arguments[0];
            if (typeof obj !== "object") {
                obj = arguments;
            }
        } else {
            obj = arguments;
        }
        
        if ((obj instanceof Object) && !(obj instanceof RegExp)) {
            return this.replace(/\{([^{}]+)\}/g, function (match, key) {
                var value = obj[key];
                return (value !== undefined) ? '' + value :'';
            });
        }
    }
    return this;
}

/**
 * 用于处理字符串或者文件的md5
 * @param {string}|{Buffer} 带处理的数据
 * @return {string} md5字符串
 */
function md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}



/**
 * 创建zip文件
 * @param {string}  sourceDir   要压缩的文件夹路径
 * @param {string}  zipFile     zip文件名
 */
function make7z(sourceDir, zipFile){
    var args = [];
    args[0] = "a";
    args[1] = "-mx=9";
    args[2] = "-ax!thumbs.db";
    args[3] = "-tzip";
    args[4] = zipFile;
    args[5] = sourceDir+"\\*";
    var obj = childProcess.spawnSync("7z", args, { stdio: 'inherit', cwd: OTHER_EXEC });
    if (obj.error) {
        throw obj.error;
    }
    return obj;
}

/******************************************ssh***********************************************/

/**
 * 执行212的ssh脚本
 */
function sshFor212(cmds, stdout) {
    return ssh("192.168.0.212", "root", "DD1mKfJAgXkw90o7", cmds, stdout);
}

/**
 * 使用plink执行远程指令
 */
function ssh(host, username, password, commands, stdout) {
    //plink -ssh root@192.168.0.202 -pw junyou_.com source /etc/profile;bash /data/script/sync_database_hqg.sh
    if (stdout == undefined) {
        stdout = "inherit";
    }
    var args = [];
    args[0] = "-ssh";
    args[1] = username + "@" + host;
    args[2] = "-pw";
    args[3] = password;
    args[4] = commands;
    var obj = childProcess.spawnSync("plink", args, { stdio: ['inherit', stdout, 'inherit'], cwd: OTHER_EXEC });
    if (obj.error) {
        throw obj.error;
    }
    return obj;
}
/******************************************处理配置*******************************************/
/**
 * 为了兼容之前的properties文件
 */
function getProsFromFile(file, domain) {
    domain = domain || $;
    var data = fs.readFileSync(file, "utf8");
    var reg = /^\s*(.*?)\s*=\s*(.*?)$/mg;
    var repFunc = function (match) {
        return domain[match] || "${"+match+"}";
    }
    while (true) {
        var result = reg.exec(data);
        if (result) {
            //将属性加到域中
            var value = result[2];
            value = value.replace(/[$][{](.+?)[}]/g, repFunc);
            domain[result[1]] = result[2];
        } else {
            break;
        }
    }
}

/**
 * 新的属性使用JSON
 */
function getProsFromJSON(file, domain) {
    domain = domain || $;
    var data = fs.readFileSync(file, "utf8");
    var obj = JSON.parse(data);
    for (let key of obj) {
        domain[key]=obj[key];
    }
}


/**************************************svn相关*****************************************/

/**
 * SVN 签出
 * 同步指令
 * @param {string} source   要签出的svn源路径
 * @param {string} distDir  要签出的本地路径
 * @return : {Object}
 * <ul>
 * <li>pid Number Pid of the child process</li>
 * <li>output Array Array of results from stdio output</li>
 * <li>stdout Buffer|String The contents of output[1]</li>
 * <li>stderr Buffer|String The contents of output[2]</li>
 * <li>status Number The exit code of the child process</li>
 * <li>signal String The signal used to kill the child process</li>
 * <li>error Error The error object if the child process failed or timed out</li>
 * </ul>
 */
function svnCheckout(source, distDir){
    console.log("try svn checkout,source:" + source + ",distDir:" + distDir);
    return svn("checkout", source, distDir);
}

/**
 * SVN 切换
 * 同步指令
 * @param {string} source   要切换的svn源路径
 * @param {string} distDir  要切换的本地路径
 * @return : {Object}
 * <ul>
 * <li>pid Number Pid of the child process</li>
 * <li>output Array Array of results from stdio output</li>
 * <li>stdout Buffer|String The contents of output[1]</li>
 * <li>stderr Buffer|String The contents of output[2]</li>
 * <li>status Number The exit code of the child process</li>
 * <li>signal String The signal used to kill the child process</li>
 * <li>error Error The error object if the child process failed or timed out</li>
 * </ul>
 */
function svnSwitch(source, distDir){
    console.log("try svn switch,source:" + source + ",distDir:" + distDir);
    return svn("sw", source, distDir);
}

/**
 * SVN创建分支
 * 同步指令，指令执行完毕后才会继续执行后续指令
 * @param   {string} source 原版本路径
 * @param   {string} dist   要创建的分支路径
 * @return : {Object}
 * <ul>
 * <li>pid Number Pid of the child process</li>
 * <li>output Array Array of results from stdio output</li>
 * <li>stdout Buffer|String The contents of output[1]</li>
 * <li>stderr Buffer|String The contents of output[2]</li>
 * <li>status Number The exit code of the child process</li>
 * <li>signal String The signal used to kill the child process</li>
 * <li>error Error The error object if the child process failed or timed out</li>
 * </ul>
 */
function svnBranch(source, dist){
    console.log("try svnBranch,source:" + source + ",dist:" + dist);
    return svn("copy", source, dist, "-m", "create a branch");
}

/**
* SVN 查看信息
* 同步指令，指令执行完毕后才会继续执行后续指令
* @param   {string} source 原版本路径
* @return : {Object}
*/
function svnInfo(source){
    var obj=svn("info", source);
    if (obj.error) {
        console.error(obj.stderr);
        throw obj.error;
    }
    var data = obj.stdout.toString();
    var info = {};
    var lines = data.split("\r\n");
    for (let line of lines){
        if(line){
            let lineData=line.split(":");
            if(lineData.length==2){
                info[lineData[0].trim()]=lineData[1].trim();
            }
        }
    }
    return info;
}


/**
* SVN 更新
* 同步指令，指令执行完毕后才会继续执行后续指令
* @param   {string} distDir 目标路径
* @param   {string}	stdout	输出的方式,默认继承
* @return : {Object}
* <ul>
* <li>pid Number Pid of the child process</li>
* <li>output Array Array of results from stdio output</li>
* <li>stdout Buffer|String The contents of output[1]</li>
* <li>stderr Buffer|String The contents of output[2]</li>
* <li>status Number The exit code of the child process</li>
* <li>signal String The signal used to kill the child process</li>
* <li>error Error The error object if the child process failed or timed out</li>
* </ul>
*/
function svnUpdate(distDir,stdout) {
	stdout = stdout || 'inherit';
    console.log("try svnUpdate:", distDir);
    var args = [];
    args[0] = "update";
    args[1] = "--username";
    args[2] = "buider";
    args[3] = "--password";
    args[4] = "buider";
    args[5] = distDir;
    return childProcess.spawnSync("svn", args , { stdio:['inherit', stdout , 'inherit']});
}

/**
* SVN 清理
* 同步指令，指令执行完毕后才会继续执行后续指令
* @param   {string} distDir 目标路径
* @return : {Object}
* <ul>
* <li>pid Number Pid of the child process</li>
* <li>output Array Array of results from stdio output</li>
* <li>stdout Buffer|String The contents of output[1]</li>
* <li>stderr Buffer|String The contents of output[2]</li>
* <li>status Number The exit code of the child process</li>
* <li>signal String The signal used to kill the child process</li>
* <li>error Error The error object if the child process failed or timed out</li>
* </ul>
*/
function svnCleanup(distDir){
    console.log("try svnCleanup", distDir);
    return svn("cleanup", distDir);
}

/**
* SVN 还原
* 同步指令，指令执行完毕后才会继续执行后续指令
* @param   {string} dist 目标路径
*/
function svnRevert(dist){
	console.log("try svnRevert",dist);
	return svn("revert",dist);
}

/**
 * 执行svn命令
 */
function svn(){
    var args = [];
    args[0] = arguments[0];
    args[1] = "--username";
    args[2] = "buider";
    args[3] = "--password";
    args[4] = "buider";
    //目前nodejs还没很好支持ES6的可选参数
    var len = arguments.length;
    for (var i = 1; i < len; i++) {
        args.push(arguments[i]);
    }
    return childProcess.spawnSync("svn", args , { stdio: 'inherit' });
}


/**************************************处理swf相关**********************************************/

/**
* 编译as文件
* @param {string}   flexBinPath     flexSDK的bin路径
* @param {string}   source          入口as文件
* @param {string}   output          文件输出路径
* @param {boolean}  isDebug         是否编译为调试版本，默认为false
* @param {Array}    sources         其他源文件路径的数组 -source-path
* @param {Object}   defines         Key为定义的常量名称  Value为常量的值
* @param {Array}    metaDatas       定义的keep-as3-meta值的数组
* @param {Array}    linkLibs        链接的SWC的路径地址 -include-libraries
* @param {string}   linkReports     链接的报告地址，默认没有，如果配置了，会输出一个xml文件 -link-report
* @param {number}   swfVersion      swf版本 默认为19
* @return {Object} 
* <ul>
* <li>pid Number Pid of the child process</li>
* <li>output Array Array of results from stdio output</li>
* <li>stdout Buffer|String The contents of output[1]</li>
* <li>stderr Buffer|String The contents of output[2]</li>
* <li>status Number The exit code of the child process</li>
* <li>signal String The signal used to kill the child process</li>
* <li>error Error The error object if the child process failed or timed out</li>
* </ul>
*/
function mxmlc(source, output, isDebug, sources, defines, metaDatas, linkLibs, linkReports, loadExterns, swfVersion) {
    console.log("try build swf:", output);
    swfVersion = swfVersion || 19;
    var args = [];
    var idx = 0;
    args[idx++] = source;
    args[idx++] = "-output";
    args[idx++] = output;
    args[idx++] = "-optimize=true";
    args[idx++] = "-debug=" + Boolean(isDebug).toString();
    args[idx++] = "-swf-version=" + swfVersion;
    if (linkReports) {
        args[idx++] = "-link-report=" + linkReports;
    }
	if(loadExterns){
		args[idx++] = "-load-externs=" + loadExterns;
	}
    if (sources && sources.constructor == Array) {
        for (let source of sources){
            //-source-path=D:/workspace/rf_project/src
            args[idx++] = "-source-path=" + source;
        }
    }
    if (typeof defines === "object") {
        for (let key in defines) {
            //-define=CONFIG::SWF_EXT,'.swf'
            args[idx++] = "-define=" + key + "," + defines[key];
        }
    }
    if (metaDatas && metaDatas.constructor == Array) {
        for (let meta of metaDatas) {
            //-keep-as3-metadata=CMD
            args[idx++] = "-keep-as3-metadata=" + meta;
        }
    }
    if (linkLibs && linkLibs.constructor==Array) {
        for (let linklib of linkLibs) {
            //-include-libraries=\\192.168.0.5\embed\libs\protect.swc
            args[idx++] = "-include-libraries=" + linklib;
        }
    }
    var len = arguments.length;
    for (var i = mxmlc.length; i < len; i++) {
        args[idx++] = arguments[i];
    }
    var obj = childProcess.spawnSync("mxmlc", args , { stdio: 'inherit', cwd: FLEX_BIN_PATH });
    if (obj.error) {
        throw obj.error;
    }
	else{
		console.log(Date.now(), output, "编译完成");
	}
    return obj;
}


/**
 * 使用zswf.exe将swf转化为使用LZMA压缩，ZWS头的swf
 * @param {string} 原始CWS的swf路径
 * @param {string} 去除标签后的FWS的swf路径
 */
function lzmaSWF(source, dist) {
    var args = [];
    args[0] = source;
    args[1] = "-f";
    args[2] = dist;
    var obj = childProcess.spawnSync("zswf.exe", args , { stdio: 'inherit', cwd: OTHER_EXEC });
    if (obj.error) {
        throw obj.error;
    }
	else{
		console.log(Date.now(), dist, "进行zswf处理完成");
	}
    return obj;
}

/**
 * 去除没有什么作用的标签，并将CWS头的SWF转为FWS头的SWF
 * @param {string} 原始CWS的swf路径
 * @param {string} 去除标签后的FWS的swf路径
 * @return {string} FWS的swf文件的md5值
 */
function cutSWF(source, dist) {
    var buffer = fs.readFileSync(source);
    //获取swf头，由于使用mxmlc进行优化编译成CWS，所以不做头部检测
    var header = buffer.slice(0, 8);
    //获取压缩后的swf主内容
    var z = buffer.slice(8);
    //解压swf的主数据
    buffer = zlib.unzipSync(z);
    var len = buffer.length;
    //处理FrameSize RECT Frame size in twips
    var temp = buffer[0];
    var os = 1;
    var nb = temp >> 3 & 0xff;
    os += Math.ceil((nb * 4) / 8);
    //FrameRate 2bytes  FrameCount 2bytes;
    os += 4;
    //设置tmpBuffer的起始偏移
    
    var fileLength = header.readInt32LE(4);
    //创建新的buffer，用于接收处理后的文件
    var tmpBuffer = new Buffer(fileLength);
    tmpBuffer[0] = 0x46;//F
    tmpBuffer[1] = 0x57;//W
    tmpBuffer[2] = 0x53;//S
    tmpBuffer[3] = header[3];
    
	buffer.copy(tmpBuffer,8,0,os);
    
    //可以干掉的标签
    const CAN_CUT_TAG = [77/*XML Metadata*//* , 64 EnableDebugger2*/, 65/*ScriptLimits*/,63,41,43];
    var tos = 8 + os;
    while (os < len) {
        let begin = os;
        //处理记录的头部
        //TagCodeAndLength UI16 Upper 10 bits: tag type    Lower 6 bits: tag length
        let recordheader = buffer.readUInt16LE(os);//2字节
        os += 2;
        let tagtype = recordheader >> 6 & 0xff;
        let shortLen = recordheader & 0x3f;
        //整段标签的长度 不包括recordheader的2字节
        let taglen = shortLen;
        if (shortLen == 0x3f) {
            taglen = buffer.readInt32LE(os);//4字节
            os += 4;
        }
        os += taglen;
        if (CAN_CUT_TAG.indexOf(tagtype) == -1) {
            buffer.copy(tmpBuffer, tos, begin, os);					
            tos += os - begin;
			
        }
    }
    //写入总长度
    tmpBuffer.writeInt32LE(tos, 4);    
    tmpBuffer = tmpBuffer.slice(0, tos);
	console.log("swf文件长度",tos);
    fs.writeFileSync(dist, tmpBuffer);
    var md5Str = md5(tmpBuffer);
    console.log("swf文件cut操作处理完成", source, dist, md5Str);
    return md5Str;
}

/**
 * 混淆主文件
 * @param {string}  oswf    原始swf的文件名
 * @param {string}  dswf    目标swf的文件名
 * @param {string}  dir     处理目录
 * @param {boolean} isMain  是否为主文件
 */
function obfuscation(oswf, dswf , dir ,isMain) {
    if (dir.charAt(dir.length - 1) != "/") {
        dir += "/";
    }
    var args = [];
    args[0] = Boolean(isMain)?"-bjym":"-bjyp";
    args[1] = oswf;
    args[2] = dswf;
    args[3] = dir + "main.dic";
    args[4] = dir + "main.lst";
    args[5] = dir + "main.ali";
    args[6] = dir + "main.scl";
    args[7] = "//192.168.0.5/embed/junyou/junyou.cls";
    args[8] = "//192.168.0.5/embed/junyou/airglobal.bf";
    args[9] = "//192.168.0.5/embed/junyou/core.bf";
    args[10] = "//192.168.0.5/embed/junyou/playerglobal.bf";
    args[11] = "//192.168.0.5/embed/junyou/filter.txt";
	args[12] = "//192.168.0.5/embed/junyou/guidefilter.txt";	
    var obj = childProcess.spawnSync("as3cJY.exe", args , { stdio: 'inherit', cwd: OTHER_EXEC });
    if (obj.error) {
        throw obj.error;
    }
	else{
		console.log(Date.now(), oswf, "混淆生成", dswf);
	}
    return obj;
}

/**
 * 使用王锐编写的python脚本批量处理皮肤的swf文件
 * @param {string}  source  原始文件路径
 * @param {string}  target  目标文件路径
 * @param {string}  tempDir 用于存放中间文件的临时文件路径
 * @param {string}  ext     输出的swf文件扩展名
 */
function processDir(source, target, tempDir, ext){
	var args = [];
    args[0] = PYTHON_SCRIPT_ROOT + "ProcessDir.py";
    args[1] = source;
    args[2] = target;
    args[3] = tempDir;
    args[4] = ext;
    var obj = childProcess.spawnSync("python", args , { stdio: 'inherit', cwd: PYTHON_2 });
    if (obj.error) {
        throw obj.error;
    }
	else{
		console.log(Date.now(), target, "processDir完成");
	}
    return obj;
}


/********************************************文件操作相关********************************************/

/**
 * 同步遍历文件夹，将文件路径放入数组，默认不拷贝.svn文件夹和thumbs.db
 * @param {string} path
 * @return {Array} 文件列表
 */
function walkDirSync(path, fileList , excludeReg) {
    var dirList = fs.readdirSync(path);
    dirList.forEach(function (item) {
        var lowerItem = item.toLowerCase();
        if (lowerItem != ".svn" && lowerItem != "thumbs.db") {
            var tpath = path + '/' + item;
            if (!excludeReg || tpath.search(excludeReg) == -1) {
                if (fs.statSync(tpath).isDirectory()) {
                    walkDirSync(tpath, fileList, excludeReg);
                } else {
                    fileList.push(tpath);
                }
            }
        }
    });
}

/********************************************发布操作相关********************************************/
/**
*更新res资源
* @param {string}  svnPath     原始文件路径
* @param {string}  dirPath     目标文件路径
* @param {string}  resPath     输出res.dat的路径
*/
function updataRes(svnPath,dirPath,resPath){
    svnSwitch(svnPath, dirPath);

	//hash资源，生成res.dat文件
	var args=[];
	args[0]=PYTHON_SCRIPT_ROOT+"junyou/hashRes.py";
	args[1]=dirPath+"/";
	args[2]=resPath;
	args[3]="m";	
	var obj = childProcess.spawnSync("python", args , { stdio: 'inherit', cwd: PYTHON_2 });
	return obj;
}
/**
* 处理地图资源
* @param {string}  mPath     地图路径
* @param {string}  m2Path    地图路径2
* @param {string}  ext       资源后缀名
*/
function buildMapRes(mPath,m2Path,ext){
	var args=[];
	args[0]=PYTHON_SCRIPT_ROOT+"junyou/parseMap.py";
	args[1]=mPath;
	args[2]=m2Path;
	args[3]="3tion";
	args[4]=ext;
	var obj = childProcess.spawnSync("python", args , { stdio: 'inherit', cwd: PYTHON_3 });
	return obj;	
}



global.getProsFromFile = getProsFromFile;
global.getProsFromJSON = getProsFromJSON;

global.md5 = md5;
global.ssh = ssh;
global.sshFor212 = sshFor212;

//svn相关
global.svnInfo = svnInfo;
global.svnUpdate = svnUpdate;
global.svnCheckout = svnCheckout;
global.svnBranch = svnBranch;
global.svnCleanup = svnCleanup;
global.svnSwitch = svnSwitch;
global.svnRevert = svnRevert;

//处理swf相关
global.mxmlc = mxmlc;
global.lzmaSWF = lzmaSWF;
global.cutSWF = cutSWF;
global.obfuscation = obfuscation;
global.processDir = processDir;

//文件操作相关
global.walkDirSync = walkDirSync;
//global.copySync = copySync;
//global.mkdirsSync = mkdirsSync;

global.make7z = make7z;
global.updataRes=updataRes;
global.buildMapRes=buildMapRes;