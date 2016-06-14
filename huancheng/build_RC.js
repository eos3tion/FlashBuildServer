'use strict'
require('../buildLib.js');
require('buffer');
var path = require('path');
//var fs = require('fs');
var fs = require('fs-extra');
var childProcess = require('child_process');
var zlib = require('zlib');


/**
 * 默认语言
 */
const DEFAULT_LAN = "cn";

/**
 * 处理多语言的nodejs脚本路径
 */
const LANG_APP_PATH = "D:/Builder/nodejs/junyou/multilang/app.js";

/**
* 灵娱的SVN
*/
const SVN_REMOTE = "svn://192.168.1.5:3334";

/**
* 本地的SVN
*/
const SVN_LOCAL = "svn://192.168.0.5:3334";



//发布
/*
var argv = process.argv;
var pakApp = argv[2]!="false";
var pakCfg = argv[3]!="false";
var pakRes = argv[4]!="false";

buildApp(pakApp,pakCfg,pakRes);
*/
//var $ = init();
//$.plugins = {"_37":"37"};
//switchVersion($);
//buildPlugin($);




/***************************用于编写外调程序********************************/
console.log=function(){
    var msg="";
    for(let value of arguments){
        msg += "\t";
        if(typeof value === "object"){
            msg +=  JSON.stringify(value);
        }
        else{
            msg += String(value);
        }
    }
    process.stdout.write(msg+"\n");
}
/**
* 用于外部调用
*/
process.on("message", (m) => {
  var func = m.func;
  var params = m.params;
  console.log("buildRC onmessage",m);
  if(func=="help"){
	let handle = funcs[String(params)];
	if(handle){
		console.log(handle.desc);
	}
  }
  else if(func in funcs){
	let handle = funcs[func];
	if(params==null || params instanceof Array)
	{
		handle.func.apply(null,params);
	}
  }
});

var funcs ={
	buildApp:{func:buildApp,desc:`buildApp(pakApp,pakCfg,pakRes,createBranch,cfgs)
编译发行版程序
pakApp Boolean 是否打包上传程序,默认false
pakCfg Boolean 是否打包上传配置,默认false
pakRes Boolean 是否打包上传资源,默认false
createBranch Boolean 是否创建分支,默认true
cfgs Object 附加配置,要替换的配置内容
`},
	buildPlugins:{func:buildPlugins,desc:`buildPlugins(pak,cfgs)
编译发行版程序
pak Boolean 是否打包上传程序,默认false
cfgs Object 附加配置,要替换的配置内容
`},
buildNightly:{func:buildNightly,desc:`
`},
updataRes1:{func:updataRes1,desc:``},
buildPst1:{func:buildPst1,desc:``},
buildMapRes1:{func:buildMapRes1,desc:``}
}
/**
* 创建发行版
*/
function buildApp(pakApp,pakCfg,pakRes,createBranch,cfgs){
	var $ = init(cfgs);
	//addCfg($,cfgs);
	pakApp = Boolean(pakApp);
	pakCfg = Boolean(pakCfg);
	switchVersion($);
	build($);
	if(pakApp || pakCfg)
	{
		packageApp($,pakCfg,pakApp,createBranch);
	}
	if(pakRes)
	{
		packageRes($);
	}	
}

/**
* 创建插件
*/
function buildPlugins(pak,cfgs){
	pak = pak === false;
	var $=init(cfgs);
	//addCfg($,cfgs);
	buildPlugin($);
	if(pak)
	{
		packageApp($,false,pak,false);
	}
}

/**
* 覆盖配置
*/
function addCfg(to,from){
	for(var key in from){
		if(key in to){
			to[key]=from[key];
		}
	}
}

//替换junyou项目中的JResourceManager
var JRM_path = "/com/junyougame/engine/resource";
	
/**
 * 初始化属性和参数
 * @return 返回参数的域
 */
function init($) {
    if(typeof $ !== "object"){
		$ = {};
	}
    var argv = process.argv;
    
    var aIdx = 2;
    
    //当前路径
    $.jsDir = __dirname;
    
    //基础路径
    $.baseDir = "d:/Builder";//0.5的基础路径
    
    //项目名称
    $.project = "huancheng";
    
    //用于切换分支 可外部设置
    $.buildVersion = $.buildVersion||"online";
    
    //语言 可外部设置
    $.lan = $.lan||DEFAULT_LAN;
    
    //运维脚本调用的语言(防止运维没有和程序统一命名)  可外部设置
    $.yunweiLan = $.yunweiLan||"";
    
    //运维使用的项目名称 可外部设置
    $.yunweiProject = $.yunweiProject||"hc";
    
    //创建时间用于创建版本号和zip目录名称
    $.buildTime = new Date().format("yyyyMMdd_HHmmss");
    
    //swf文件扩展名
    $.swfExt = ".mpq";
    
    getProsFromFile("//192.168.0.5/" + $.project + "/version/version.txt", $);
    
    //项目版本
    $.prjversion = $[$.buildVersion];
    
    
    //项目基础目录
    $.dir_bin = $.baseDir + "/bin/" + $.project + "/" + $.lan;
    
    //项目输出路径
    $.dir_deploy = $.dir_bin + "/" + $.buildVersion;
    
    //主版本号
    $.mainversion = $.lan + "." + $.prjversion + "." + $.buildTime;
    
    //发布版配置路径
    $.dir_pubConfig =$.dir_pubConfig || "d:/web/" + $.project + "/web/" + $.lan + "/config/publish/";
    
	//原始中文版的路径
	$.dir_srcCNConfig = "d:/web/" + $.project + "/web/" + DEFAULT_LAN + "/config/nightly/";
	
    //配置的原始路径
    $.dir_srcConfig = $.dir_srcConfig||"d:/web/" + $.project + "/web/" +  $.lan + "/config/nightly/";
    
    
    //设置临时文件夹路径
    $.dir_temp = $.baseDir + "/temp/" + $.project + "/" + $.lan;
	
    //源的临时路径
	$.dir_source_temp = "D:/Builder/source/" + $.project + "_temp";
	
    //设置rf_project的项目路径
    $.dir_rf =  $.dir_source_temp + "/rf_lib";
    
    //设置rf_project的SVN路径
    $.svn_rf = $.svn_junyou || SVN_LOCAL + "/junyou/trunk/RF_Lib/src";
		
    //设置 portal 项目路径
    $.dir_portal = $.dir_source_temp + "/portal";
    
    //设置 portal 项目的SVN路径
    $.svn_portal = SVN_LOCAL + "/junyou/trunk/junyou_portal/src";
	
    //设置君游项目的项目路径
    $.dir_junyou = $.dir_source_temp + "/junyou";
    
    //设置君游项目的SVN路径
    $.svn_junyou = $.svn_junyou || SVN_LOCAL + "/junyou/trunk/junyouV2/src";
    
    //主项目的路径
    $.dir_main = $.dir_source_temp + "/main";
	//主干
	$.svn_project_trunk = SVN_LOCAL + "/" + $.project + "/trunk";
    //主项目的SVN路径
    $.svn_main = $.svn_main || $.svn_project_trunk +"/flash/" + $.project + "/src";
    
    //主项目的分支路径
    $.svn_branches = SVN_LOCAL + "/" + $.project + "/branches/";
    
	//远程路径 可外部设置
	$.dir_remote = $.dir_remote || "//192.168.0.202/hc_version/online/";
	
    //资源的远程路径
    $.dir_res_remote = $.dir_remote + "res/";
	
	/**用于调试*/
	$.isDebug=$.isDebug||false;
    
    //最终发布的res路径
    $.dir_res_pub = "d:/web/" + $.project + "/web/res/" + DEFAULT_LAN ;
    
    //程序和配置的远程路径
    $.dir_app_remote = $.dir_remote + "web/";

    
    //conf文件名称
    $.file_conf = "conf.xml";
    
    //处理地图使用的key
    $.mapkey = "3tion";
    
    //名字库的路径地址
    $.nameLibUrl = "http://web." + $.project + ".jy/web/nl_{0}.xml";
    
    //当前语言默认字体 可外部设置
    $.font_default = $.font_default || "SimSun";
    
    //用来替换的语言 结构类似 {"LiSu":"Arial","Microsoft YaHei":"Arial"}
    $.font_replaced = $.font_replaced || null;
    
    //要编译的插件列表 {"_360":"360","_37":"37","yy":["yy",["//192.168.0.5/embed/libs/yy.swc"]]}
    $.plugins = $.plugins || null;
    
    //运维上传到测服的指令
    $.yunweiCmd = $.yunweiCmd || "source /etc/profile;bash /data/script/version_update/{yunweiLan}{yunweiProject}_update.sh {cmd} {yunweiLan}{yunweiProject}";
    
    //上传程序
    $.upload_app_cfg = $.upload_app_cfg||$.yunweiCmd.substitute({ yunweiLan: $.yunweiLan, yunweiProject: $.yunweiProject, cmd: "web" });
    
    //上传资源
    $.upload_res = $.upload_res||$.yunweiCmd.substitute({ yunweiLan: $.yunweiLan, yunweiProject: $.yunweiProject, cmd: "res" });
    
    //获取资源md5的指令
    $.get_res_md5 = $.get_res_md5|| "source /etc/profile;bash /data/script/get_client_md5.sh {yunweiLan}{yunweiProject} res".substitute({ yunweiLan: $.yunweiLan, yunweiProject : $.yunweiProject });
	
	$.mxmlcDefines = $.mxmlcDefines || { "CONFIG::debugging": false, "CONFIG::release": true, "CONFIG::SWF_EXT": "'"+$.swfExt+"'" };
	
	if(!fs.existsSync($.dir_temp)){
		fs.mkdirsSync($.dir_temp);
	}
	if(!fs.existsSync($.dir_deploy)){
		fs.mkdirsSync($.dir_deploy);
	}
    return $;
}
/**
*处理地图资源
*/
function buildMapRes1(){
    var $ = init();
	var m = "d:/web/" + $.project + "/web/res/"+$.lan+"/m";
	var m2 = "d:/web/" + $.project + "/web/res/"+$.lan+"/m2";
	var obj = buildMapRes(m,m2,$.swfExt);
	if (obj.error) {
        throw obj.error;
    }
	else{
		console.log("地图处理完成");
	}
}

/**
*更新res资源
*/
function updataRes1(){
    console.log("更新res资源");
    var $ = init();
	var dirPath = "d:/web/" + $.project + "/web/res/" + $.lan;
	var svnPath = $.svn_project_trunk+"/res/" + $.lan;
	var resPath = "d:/web/" + $.project + "/web/"+$.lan+"/config/nightly/res.dat";
    var obj = updataRes(svnPath,dirPath,resPath);	
	if (obj.error) {
        throw obj.error;
    }
	else{
		console.log("生成res.dat");
		console.log("更新res资源  完成");
	}
	return $;
}

/**
*发布pst文件
*/
function buildPst1(){
    var $ = updataRes1();
	console.log("开始打包pst文件");
	var args = [];
    args[0] = "d:/web/" + $.project + "/web/res/"+$.lan+"/u/pst";
    args[1] = "d:/web/" + $.project + "/web/"+$.lan+"/config/nightly/pst.dat";
	var obj = childProcess.spawnSync("PackPst", args, { stdio: 'inherit', cwd: "d:/airtools/PackPst" });
	if (obj.error) {
        throw obj.error;
    }
	else{
		console.log("pst文件 发布完成",args[1]);
	}
}

/**
* 生成nightly版swf程序
*/
function buildNightly(){
    var $ = init();	
	//还原JResourceManager文件
	//发布正式版的时候，
	svnRevert( $.dir_junyou + JRM_path + "/JResourceManager.as");
	switchVersion($);
	
	$.swfExt=".swf";
	var n_mxmlcDefines = { "CONFIG::debugging": true, "CONFIG::release": false, "CONFIG::SWF_EXT": "'"+$.swfExt+"'" };
	var n_swf=$.baseDir + "/bin/" + $.project +"/"+$.lan+ "/nightly/"+"Main.swf";
	console.log("准备发布内网测试版");
	 //编译项目
    mxmlc($.dir_main + "/Main.as",
        n_swf,
        true,
        [$.dir_rf, $.dir_junyou],
        n_mxmlcDefines,
        ["CMD", "MVC"]);
	var nightly = $.baseDir + "/bin/" + $.project +"/"+$.lan+ "/nightly/";
	//拷贝data目录到nightly
	console.log("拷贝data目录到nightly");
    fs.copySync($.dir_main+"/data", nightly+"data");
	//拷贝asset目录到nightly
	console.log("拷贝asset目录到nightly");
	fs.copySync($.dir_main+"/assets", nightly+"assets");
	console.log("发布成功");
}


/**
 * 生成发布版swf程序
 */
function build($) {
    //拆分主文件用的前缀
    var fname = "m";
    
    var portalFileName = "Main.swf";
    
    //先处理portal项目，替换常量
    antCopyFile($.dir_portal + "/JConst.as.template", $.dir_portal + "/JConst.as" , { "kvalue": $.mainversion, "fname": fname });
    
    //portal原始 CWS的swf
    var portal_o = $.dir_temp + "/p.swf";
    
    //portal cut 后FWS的swf
    var portal_c = $.dir_temp + "/p_cut.swf";
    
    //portal最终文件的名称
    var portal_z = $.dir_temp + "/" + portalFileName;
    
    //编译项目
    mxmlc($.dir_portal + "/Platform.as",
        portal_o,
        $.isDebug,
        [$.dir_rf, $.dir_junyou],
        $.mxmlcDefines,
        ["CMD", "MVC"]);
    
    //去除portal文件多余的tag
    var md5Str = cutSWF(portal_o, portal_c);
    
    //使用LZMA方式压缩swf
    lzmaSWF(portal_c, portal_z);
    
    console.log("portal处理完成，开始处理主文件");
    
    //开始处理主文件
    
    var mainPath = $.dir_main + "/RC.as";
    //替换RC
    antCopyFile($.dir_main + "/RC.as.template", mainPath , { "md5": md5Str });
    
    
    antCopyFile( $.dir_junyou + JRM_path + "/JResourceManager.template.as",  $.dir_junyou + JRM_path + "/JResourceManager.as",{"mapkey":$.mapkey,"ext":$.swfExt});
    
    //开始编译
    console.log("开始编译" + $.prjversion);
    
    //主文件原始 CWS的swf
    var main_o = $.dir_temp + "/m.swf";
    
    //主文件混淆后的swf
    var main_en = $.dir_temp + "/m_en.swf";
    
    //主文件 cut 后FWS的swf
    var main_c = $.dir_temp + "/m_cut.swf";
    
    //主文件使用LZMA方式压缩swf
    var main_z = $.dir_temp + "/m_z.swf";
    
    //编译主程序
    mxmlc(mainPath,
        main_o,
        $.isDebug,
        [$.dir_rf, $.dir_junyou],
        $.mxmlcDefines,
        ["CMD", "MVC"],
        ["//192.168.0.5/embed/libs/protect.swc"],
        $.dir_temp + "/pluginLink.xml");
    
    console.log("编译主文件结束，开始混淆主文件");
    
    //混淆文件
    obfuscation(main_o, main_en, $.dir_temp, true);
    
    //裁剪主文件
    cutSWF(main_en, main_c);
    
    lzmaSWF(main_c, main_z);
    
    //将文件拆分并加密成两个文件
    splitSwf(portal_c, main_z, fname, $);
    
    //解析配置文件
    var strConf = fs.readFileSync($.dir_main + "/data/" + $.file_conf).toString();
    //var DOMParser = require('xmldom').DOMParser;
    
    //将地图路径由m改为使用m2
    strConf = strConf.replace('value="m/"', 'value="m2/"');	
    fs.mkdirsSync($.dir_pubConfig);
    //其他语言版本
    if ($.lan != DEFAULT_LAN) {
        
        //处理配置文件语言
        replaceCfgLan($.dir_srcConfig, $.dir_pubConfig, "");

        //替换资源路径
        strConf = strConf.replace('web/res/' + DEFAULT_LAN, 'web/res/' + $.lan);
        //替换配置路径
        strConf = strConf.replace('web/' + DEFAULT_LAN + '/config/nightly', 'web/' + $.lan + '/config/publish');
        //替换名字库
        strConf = strConf.replace($.nameLibUrl.substitute(DEFAULT_LAN), $.nameLibUrl.substitute($.lan));
        //替换默认语言
        strConf = strConf.replace('face="SimSun"', 'face="' + $.defaultFont + '"');

        //TODO 后续做多字体替换
		
		//拷贝文件到发布路径
		copyFiles(["pst.dat", "maps.dat", "emotion.dat", "res.dat"], $.dir_srcCNConfig , $.dir_pubConfig);
    }
	else{
		//默认语言将路径配置变成原始配置路径
		$.dir_pubConfig = $.dir_srcConfig;
	}
    
   
	//将json文件写入
	fs.copySync($.dir_main + "/data/" ,$.dir_deploy + "/data/",{filter:(src)=>/.*[.]json/ig.test(src)});
	 //将config写入目标路径
    fs.outputFileSync($.dir_deploy + "/data/" + $.file_conf, strConf);
    
	  //拷贝一个空的lib
    fs.copySync("//192.168.0.5/embed/lib.swf", $.dir_deploy + "/lib.swf");

    fs.mkdirsSync($.dir_deploy + "/assets");
	
    //原本有拷贝swfobject.js到目标目录
    //由于新的swfobject.js在外网使用百度CDN//libs.baidu.com/swfobject/2.2/swfobject.js
    //内网也使用别的模板页，所以不再执行swfobject.js的拷贝操作
    
    //使用王锐编写的python脚本，处理swf皮肤文件
	let assetsSource = $.dir_main + "/assets/" ;
	if($.lan != DEFAULT_LAN){
		assetsSource += $.lan + "/";
	}
    processDir(assetsSource, $.dir_deploy + "/assets/", $.dir_temp, $.swfExt);
    
    
    
    //拷贝主文件到发布目录
    copyFiles([portalFileName, fname + "1.mpq", fname + "2.mpq"], $.dir_temp, $.dir_deploy);
    
    //处理插件    
    buildPlugin($);

    console.log(Date.now(), "发布版文件处理完成!", $.dir_deploy);
}


/**
 * 打包程序(或者配置)
 * @param {Object}  $
 * @param {boolean} pakCfg          是否打包资源
 * @param {boolean} pakApp          是否打包程序 默认打包程序
 * @param {boolean} createBranch    是否创建分支 默认打包
 */
function packageApp($, pakCfg, pakApp, createBranch) {
    createBranch = createBranch !== false;	
	pakApp = pakApp !== false;	
	 if (createBranch) {
            svnBranch($.svn_project_trunk,  $.svn_branches + $.mainversion);
            console.log("程序分支创建成功", $.svn_branches + $.mainversion);
    }
    
    //打包程序
    var pakTemp = $.dir_bin + "/tempclient";
    //先删除临时文件夹
    fs.removeSync(pakTemp);
    //创建打包用的临时文件夹
    fs.mkdirsSync(pakTemp);
    
	var yunweiVersion = $.buildTime;
    //生成一个版本文件到目录
    fs.outputFileSync(pakTemp + "/version.txt",yunweiVersion);
    
    if (pakApp) {       
        //拷贝程序到临时文件夹中
        fs.copySync($.dir_deploy, pakTemp);
    }
    
    if (pakCfg) {
        //拷贝配置到临时文件夹中
        fs.copySync($.dir_pubConfig, pakTemp + "/config/");
    }
    var zipFile = "web_" + yunweiVersion + ".zip";
    var zip = $.dir_bin + "/zipclient/" + zipFile;
    //打包
    make7z(pakTemp, zip );
    
    //拷贝到远程服务器
    fs.copySync(zip, $.dir_app_remote + zipFile);
    
    //上传程序和配置到测试服
    sshFor212($.upload_app_cfg);
}

/**
 * 打包资源
 * @param {Object}  $
 * @param {boolean} createBranch    是否创建分支 默认打包
 */
function packageRes($){
    var willPackedRes = checkFile($);
    //创建资源打包用临时文件夹
	if(willPackedRes.length){//没有资源变更则不打包资源
		//打包程序
		var pakTemp = $.dir_bin + "/tempres";
		//先删除临时文件夹
		fs.removeSync(pakTemp);
		//创建打包用的临时文件夹
		fs.mkdirsSync(pakTemp);

		//将列表中文件拷贝到临时文件夹中
		for (let resInfo of willPackedRes) {
			let source = resInfo.path;
			let dist = pakTemp + resInfo.uri;		
			fs.copySync(source, dist);
		}

		var zipFile = "res_" + $.buildTime + ".zip";
		var zip = $.dir_bin + "/zipres/" + zipFile;
		//打包
		make7z(pakTemp, zip);
		
		//拷贝到远程服务器
		fs.copySync(zip, $.dir_res_remote + zipFile);
		
		//上传程序和配置到测试服
		sshFor212($.upload_res);
	}
	else{
		console.log("资源文件没有任何变更");
	}
}

/**
 * 获取远程资源的hash
 * 会throw Error
 */
function getRemoteResHash($,result){
    if (result == undefined) {
        result = { lines: null, retry: 0 };
    }
	console.log("执行脚本",$.get_res_md5);
    var obj = sshFor212($.get_res_md5, "pipe");
    //获取到流
    //流数据的结构是和运维协商的，如下所示
    //a043f6d64b582d16a9deb137bfd4b5f2  ./qd/qiri1.ani
    //e3f3fa33f178a4d1325ed7769ec4b1da  ./qd/qdname6.png
    //06c546dde9a47914cd1d970089fca71e  ./qd/qiri6.ani
    //c37faa7971fc2cdaee61d8097c258c5e  ./qd/qiri5.ani
    //xuke success
    //
    //32位文件的md5值 空格 res下的路径
    //
    //最终以 xuke success作为脚本执行完成的标识符
    var remoteString = obj.stdout.toString();   
    var lines = remoteString.split("\n");
    var len = lines.length - 1;
    if (lines[len] == "xuke success") {
        lines.pop();
        var remoteDict = {};
        for (let line of lines){
            let dat = line.split("  ");
            if(dat.length==2){
                let path = dat[1];
                //去掉./
                path = path.substring(1);
                //和客户端的hash处理成一致
                path = path.replace("\\","/");
                remoteDict[path] = dat[0];
            }
        }
        return remoteDict;
    }
    else {
        //没有得到结尾标识符，认为此脚本获取失败
        result.retry++;        
        if (result.retry < 3) {
            console.log("获取远程res的hash失败，重数次数：", result.retry);
            return getRemoteResHash($,result);
        }
        else {
            //throw new Error("获取远程hash文件失败次数超过3次");
        }
    }
}

/**
 * 检查远程文件，获取到需要打包的文件列表
 */
function checkFile($){
    //获取远程输出
    var result = getRemoteResHash($);
	var hashPath = $.dir_res_pub;
    //处理本地的hash
    var fileList = [];
    //需要被打包的资源
    var willPackedRes = [];
    //排除m文件夹，使用m1这种hash之后的文件夹
    //如果采用最新方案以后，可能直接是没有m文件夹，发布目录里的地图直接是处理之后的文件
    walkDirSync(hashPath, fileList,new RegExp("^" + hashPath + "\/m\/.*"));
    for (let file of fileList){
        let uri = file.replace(hashPath,"");
        let data = fs.readFileSync(file);
        let hash = md5(data);
		let flag = false;
		if(result){
			if(uri in result){
				if(hash!=result[uri]){//hash值不同，修改过的资源      
				   console.log("变更:",uri);
				   flag = true;
				}
			}else{//新增资源
				console.log("新增:",uri);
				flag = true;
			}
		}
		else{
			flag = true;
		}
		if(flag){
			let res = new ResInfo(file,uri);
			willPackedRes.push(res);
		}
    }
    return willPackedRes;
}


//切换SVN版本
function switchVersion($){
    svnSwitch($.svn_rf, $.dir_rf);
    svnCleanup($.dir_junyou);
    svnSwitch($.svn_junyou, $.dir_junyou);
    svnSwitch($.svn_main, $.dir_main);
    svnSwitch($.svn_portal, $.dir_portal);
}

 

/**
 * 编译插件
 */
function buildPlugin($) {
	let configs = $.plugins;
    if (configs) {
        for (let asFile in configs) {
            let cfg = configs[asFile];
            let output,extLibs;
			let outName = null;
            if (cfg instanceof Array) {
                outName = cfg[0];
                extLibs = cfg[1];
            }
            else if (typeof cfg === "string") {
                outName = cfg;
            }
            else {
                console.error("插件设置有误，无法编译" + asFile);
                continue;
            }
            
            buildOnePlugin(asFile, outName, extLibs, $);       
        }
		if(fs.existsSync($.dir_temp + "/pingtai")){
			//将插件copy到目标路径
			fs.copySync($.dir_temp + "/pingtai", $.dir_deploy + "/pingtai");
		}
    }
}

/**
 * 编译单个插件
 */
function buildOnePlugin(asFile, outName, extLibs, $){
    //编译的原始文件
    var plugin_o = $.dir_temp + "/" + outName + "_o.swf";
    //混淆后的文件
    var plugin_en = $.dir_temp + "/" + outName + "_en.swf";
    //干掉一些无用tag
    var plugin_c = $.dir_temp + "/" + outName + "_c.swf";
    //最终输出文件
    var plugin_output = $.dir_temp + "/pingtai/" + outName + $.swfExt;
    mxmlc($.dir_main + "/pingtai/" + asFile + ".as", 
            plugin_o, 
            $.isDebug,
            [$.dir_rf, $.dir_junyou, $.dir_main],
            $.mxmlcDefines,
            ["CMD", "MVC"],
            extLibs,
			null,
            $.dir_temp + "/pluginLink.xml"
    );

    //混淆插件
    obfuscation(plugin_o, plugin_en, $.dir_temp);
    
    //裁剪插件
    cutSWF(plugin_en, plugin_c);
    
    lzmaSWF(plugin_c, plugin_output);
}

/**
 * 处理配置语言
 */
function replaceCfgLan(cfgSource, publishDir, excRegStr, exclude, langXmlPath) {
    exclude = exclude || "res|pst|maps|emotion";
    if (excRegStr == undefined) {
        excRegStr = "^common_.*$";
    }
    langXmlPath = langXmlPath || "lang.xml";
    var args = [];
    args[0] = LANG_APP_PATH;
    args[1] = cfgSource;
    args[2] = langXmlPath;
    args[3] = exclude;
    args[4] = excRegStr;
    args[5] = publishDir;

    var obj = childProcess.spawnSync("node", args , { stdio: 'inherit'});
    if (obj.error) {
        throw obj.error;
    }
    console.log(Date.now(), obj.output, "配置按语言处理完成");
    return obj;

}

/**
 * 向指定路径拷贝指定的文件
 * @param {Array}   files       要拷贝的文件列表
 * @param {string}  source      原始路径
 * @param {string}  dist        目标路径
 */
function copyFiles(files, source, dist){
	source = source.replace(/\\/g,"/");
	dist = dist.replace(/\\/g,"/");
	if(source.charAt(source.length-1)!="/"){
		source += "/";
	}
	if(dist.charAt(dist.length-1)!="/"){
		dist += "/";
	}
    for (let key of files) {
        console.log("copy", source + key, "to", dist + key);
        fs.copySync(source + key, dist + key);
    }
}



/**
 * 将主文件拆分成两个文件并加密
 * @param {string}|{Buffer} portal   Portal swf的路径
 * @param {string}|{Buffer} main     主文件路径
 * @param {string}          fname    目标路径
 * @param {Object}          $     	 处理目录
 * 
 */
function splitSwf(portal, main, fname, $){
    if (typeof portal === "string") {
        portal = fs.readFileSync(portal);
    }
    if (typeof main === "string") {
        main = fs.readFileSync(main);
    }
	var path = $.dir_temp;
    var plen = portal.length;
    var kba1 = portal.slice(8, 20);
    var kba2 = portal.slice(plen - 28);
    var sba = portal.slice((plen >> 1) - 16, (plen >> 1) + 16);
    
    var hlen = main.length >> 1;
    var ba1 = main.slice(0, hlen);
    var ba2 = main.slice(hlen);
    
    enc(ba1, kba1, sba, path + "/" + fname + "1");
    enc(ba2, kba2, sba, path + "/" + fname + "2");
    
    /**
     * 将数据加密，并存储成原始文件和处理后文件
     */
    function enc(ba, kba, sba, outputName){
        let l = ba.length;
        let kl = kba.length;
        let sl = sba.length;
        let i = 0;
        let ki = 0;
        let si = 0;
		console.log(l,kl,sl);
        //备份一个原始文件
        fs.outputFileSync(outputName + "org", ba);
        let tmpBa = new Buffer(l);
        while (i < l) {			
            tmpBa[i] = (ba[i] - kba[ki % kl] + sba[si % sl]) & 0xff;
            i++;
            ki++;
            si++;
        }
        fs.outputFileSync(outputName + $.swfExt, tmpBa);
    }

}

/**
 * 按ant方式拷贝文件，并替换字符串
 * @param {string} source   源文件路径
 * @param {string} dist     目标文件路径
 * @param {Object} repc     要替换的内容，key为替换标识，value为替换的内容
 */
function antCopyFile(source, dist, repc){
    var data = fs.readFileSync(source).toString();
    if (repc) {
        for (let key in repc) {
            data = data.replace(new RegExp("@" + key + "@", "g"), repc[key]);
        }
    }
    fs.outputFileSync(dist, data, "utf8");   
}




/**
 * 处理资源
 * @param {string} svnSourceDir     默认语言的资源的SVN路径
 * @param {string} svnLanDir        指定语言的资源SVN路径
 * @param {string} resTarget        最终输出的资源路径
 */
function resolveLanRes(svnSourceDir, svnLanDir, resTarget) {
    
    var starttime = Date.now();
    console.log(starttime, "更新替代版本资源", svnSourceDir, svnLanDir, resTarget);
    
    
    //更新cn版本原始路径        
    var obj = svnUpdate(svnSourceDir);
    if (obj.error) {
        throw obj.error;
    }
    
    //更新指定语言
    obj = svnUpdate(svnLanDir);
    if (obj.error) {
        throw obj.error;
    }
    
    //遍历指定语言的目录
    var fileList = [];
    walkDirSync(svnLanDir, fileList);
    var dict = {};
    for (let file of fileList){
            let uri = file.replace(svnLanDir,"");
            let data = fs.readFileSync(file);
            let hash = md5(data);
            dict[uri]=new ResInfo(file,uri,hash);
        }
    console.log(Date.now(), "遍历指定语言的目录完成", fileList.length);
    
    //如果和原始文件是同资源
    if (svnLanDir != svnSourceDir) {
        //获取不在指定语言的目录中原始路径的文件
        fileList.length = 0;
        walkDirSync(svnSourceDir, fileList);
        for (let file of fileList){
        let uri = file.replace(svnSourceDir,"");
        if(!(uri in dict)){
            let data = fs.readFileSync(file);
            let hash = md5(data);
            dict[uri]=new ResInfo(file,uri,hash);
        }
    }
        console.log(Date.now(), "获取不在指定语言的目录中原始路径的文件完成", fileList.length);
    }
    //找到目标目录
    //检查是否已经有目标目录
    if (!fs.existsSync(resTarget)) {
        fs.mkdirSync(resTarget);
    }
    //检查目标目录的hash
    fileList.length = 0;
    walkDirSync(resTarget, fileList);
    for (let file of fileList){
        let uri = file.replace(resTarget,"");
        if(uri in dict){
            //比对hash
            let data = fs.readFileSync(file);
            let hash = md5(data);
            let res = dict[uri];                
            if(res.hash==hash)//文件相同，干掉路径
            {
                delete dict[uri];
            }
        }
        else{//删除
            //不做文件删除处理
        }
    }
    console.log(Date.now(), "检查目标目录的hash完成");
    
    
    var hashDat = {};
    
    //遍历变化列表
    for (let uri in dict) {
        let res = dict[uri];
        //拷贝文件到目录中
        fs.copySync(res.path, resTarget + uri);
        hashDat[uri] = res.hash.substring(0, 8);
    }
    console.log(Date.now(), "拷贝有变化的文件完成");
    console.log("处理总时间：", Date.now() - starttime);
    return hashDat;

}



/**
 * 用于存放资源的uri，原始路径，以及hash值
 * @class
 */
function ResInfo(path,uri,hash){
    this.path = path;
    this.uri = uri;
    this.hash = hash;
}

ResInfo.prototype.toString = function (){
    return "path:" + this.path + "\turi:" + this.uri + "\thash:" + this.hash;
}