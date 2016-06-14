'use strict'
require('./buildLib');
const fs = require("fs-extra");

/**
 * 用于存放资源的uri，原始路径，以及hash值
 * @class
 */
function ResInfo(path, uri, hash) {
    this.path = path;
    this.uri = uri;
    this.hash = hash;
}

ResInfo.prototype.toString = function() {
    return "path:" + this.path + "\turi:" + this.uri + "\thash:" + this.hash;
}

/*
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
    for (let file of fileList) {
        let uri = file.replace(svnLanDir, "");
        let data = fs.readFileSync(file);
        let hash = md5(data);
        dict[uri] = new ResInfo(file, uri, hash);
    }
    console.log(Date.now(), "遍历指定语言的目录完成", fileList.length);

    //如果和原始文件是同资源
    if (svnLanDir != svnSourceDir) {
        //获取不在指定语言的目录中原始路径的文件
        fileList.length = 0;
        walkDirSync(svnSourceDir, fileList);
        console.log(Date.now(), "遍历原始语言的目录完成", fileList.length);
        for (let file of fileList) {
            let uri = file.replace(svnSourceDir, "");
            if (!(uri in dict)) {
                let data = fs.readFileSync(file);
                let hash = md5(data);
                dict[uri] = new ResInfo(file, uri, hash);
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
    for (let file of fileList) {
        let uri = file.replace(resTarget, "");
        if (uri in dict) {
            //比对hash
            let data = fs.readFileSync(file);
            let hash = md5(data);
            let res = dict[uri];
            if (res.hash == hash) //文件相同，干掉路径
            {
                delete dict[uri];
            }
        } else { //删除
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

resolveLanRes("D:/junyou2015/huaqiangu/res", "D:/junyou2015/huaqiangu/res-vn", "D:/junyou2015/huaqiangu/temp");