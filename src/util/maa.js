const util = require('util');
const exec = util.promisify(require("child_process").exec);

async function kill() {
    return new Promise((resolve, reject) => {
        exec(`taskkill /im MAA.exe /f`, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function restart() {
    try { await kill(); } catch (ignore) {}
    let options = await LiteLoader.api.config.get("arknights_plugin");
    const maaPath = options.maa_path;
    return new Promise((resolve, reject) => {
        exec(`${maaPath}`, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function change(config) {
    try { await kill(); } catch (ignore) {}
    let options = await LiteLoader.api.config.get("arknights_plugin");
    const maaPath = options.maa_path;
    return new Promise((resolve, reject) => {
        exec(`${maaPath} --config ${config}`, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = { restart, change }