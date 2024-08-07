const fs = require('fs')
const os = require('os');
const path = require("path");
const { ipcMain } = require("electron");
const { getRandomString } = require('./util/string.js');
const { connect, pull, shell } = require('./util/adb.js');
const maa = require('./util/maa.js');
const util = require('util');
const exec = util.promisify(require("child_process").exec);
const dataPath = LiteLoader.plugins["arknights_plugin"].path.data;
const dbPath = path.join(LiteLoader.plugins["arknights_plugin"].path.data, "data.json");
const pluginPath = LiteLoader.plugins["arknights_plugin"].path.plugin;
const picPath = path.join(dataPath, "pic-temp");
const adbPath = path.join(pluginPath, "adb", "platform-tools", "adb.exe");
const express = require('express');
const app = express();

let waitForReport = [];
let tasksInQueue = [];

const addTask = (taskType, contact, param = null) => {
    const taskId = getRandomString(15, '0123456789');
    tasksInQueue.push(param ? {id: taskId, type: taskType, params: param, contact: contact } : {id: taskId, type: taskType, contact: contact });
    return taskId;
}

function finish(taskId, status) {
    let flag = 0;
    let type = null, contact = "";
    for (let i = 0; i < tasksInQueue.length; i++) {
        if (tasksInQueue[i].id === taskId) {
            type = tasksInQueue[i].type;
            contact = tasksInQueue[i].contact;
            tasksInQueue.splice(i, 1);
            flag = 1;
            break;
        }
    }
    // 汇报会出错吗？会出错罢。
    if (flag) {
        waitForReport.push({ id: taskId, type: type, status: status, contact: contact });
    }
}

async function initExpress() {
    let options = await LiteLoader.api.config.get("arknights_plugin");
    app.use(express.json());
    app.get('/get', (req, res) => res.status(200).json({ tasks: tasksInQueue }));
    app.post('/get', async (req, res) => {
        const { user } = req.body;
        let options = await LiteLoader.api.config.get("arknights_plugin");
        if (user !== options.userId) {
            res.status(400).json({ message: 'UserId does not match' });
        }
        else {
            res.status(200).json({ tasks: tasksInQueue });
            clearTasks();
        }
    });
    app.post('/report', async (req, res) => {
        const { user } = req.body;
        let options = await LiteLoader.api.config.get("arknights_plugin");
        if (user !== options.userId) {
            res.status(400).json({ message: 'UserId does not match' });
        }
        else {
            const { task, status } = req.body;
            finish(task, status);
        }
    });
    app.listen(options.maa_port);
}

exports.onBrowserWindowCreated = (window) => {
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
    }
    let sourceFile = path.join(LiteLoader.plugins["arknights_plugin"].path.plugin, "config", "config.json");
    let configFile = path.join(LiteLoader.plugins["arknights_plugin"].path.data, "config.json");
    if (!fs.existsSync(configFile)) {
        fs.copyFileSync(sourceFile, configFile);
    }
    if (!fs.existsSync(picPath)) {
        fs.mkdirSync(picPath, { recursive: true });
    }
    initExpress();
}

async function shot() {
    let options = await LiteLoader.api.config.get("arknights_plugin");
    const deviceAddress = options.adb_address;
    const screenshotFileName = `${getRandomString(10)}.png`;
    const screenshotFilePath = path.join(picPath, screenshotFileName);
    try {
        if (!await connect(deviceAddress)) throw new Error("Could not connect to the adb daemon.");
        await shell(`screencap -p /sdcard/${screenshotFileName}.png`);
        await pull(`/sdcard/${screenshotFileName}.png`, screenshotFilePath);
        return screenshotFilePath;
    }
    catch (err) { throw new Error("Unexpected error: " + err); }
}

ipcMain.handle(
    'LiteLoader.arknights_plugin.getScreenshot',
    async (event) => {
        return await shot();
    }
);

ipcMain.handle(
    'LiteLoader.arknights_plugin.adb_test',
    async (event, address) => { return await connect(address); }
);

ipcMain.handle(
    'LiteLoader.arknights_plugin.maa_getTasks',
    async (event) => {
        return tasksInQueue;
    }
);

ipcMain.handle(
    'LiteLoader.arknights_plugin.maa_addTask',
    async (event, type, contact, param) => {
        return addTask(type, contact, param);
    }
);

ipcMain.handle(
    'LiteLoader.arknights_plugin.maa_changeProfile',
    async (event, profile) => {
        return await maa.change(profile);
    }
)

ipcMain.handle(
    'LiteLoader.arknights_plugin.maa_getReport',
    async (event) => {
        const res = waitForReport;
        waitForReport = [];
        return res;
    }
);