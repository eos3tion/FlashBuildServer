let pid = process.pid;
console.log("fork Child", pid);
const fs = require("fs");
require("./buildLib");
process.on("message", (m) => {
    console.log("on message", pid);
    var fileList = m.fileList;
    var svnSourceDir = m.svnSourceDir;
    var dict = m.dict;
    var list = [];
    let counter = 0;

    for (let file of fileList) {
        let uri = file.replace(svnSourceDir, "");
        if (!(uri in dict)) {
            let data = fs.readFileSync(file);
            let hash = md5(data);
            list.push([uri, file, hash]);
        }
        counter++;
        if (counter % 1000 == 0) {
            console.log(pid, counter);
        }
    }
    process.send(list);
})