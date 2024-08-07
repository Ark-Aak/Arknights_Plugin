const pluginPath = LiteLoader.plugins["arknights_plugin"].path.plugin;
const path = require("path");
const adbPath = path.join(pluginPath, "adb", "platform-tools", "adb.exe");
const util = require('util');
const exec = util.promisify(require("child_process").exec);

async function connect(address) {
    return new Promise((resolve, reject) => {
        exec(`${adbPath} connect ${address}`, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve(stdout.indexOf(`connected to ${address}`) === -1 ? 0 : 1);
        })
    });
}

async function shell(command) {
    return new Promise((resolve, reject) => {
        exec(`${adbPath} shell ${command}`, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve(stdout);
        })
    });
}

async function pull(source, dest) {
    return new Promise((resolve, reject) => {
        exec(`${adbPath} pull ${source} ${dest}`, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve();
        })
    });
}

module.exports = { connect, shell, pull }