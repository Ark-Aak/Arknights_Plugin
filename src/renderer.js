import { ChatFuncBar, Contact, Image, MessageChain, PlainText, Group } from '../LiteLoaderQQNT-Euphony/src/index.js';
const pluginPath = LiteLoader.plugins["arknights_plugin"].path.plugin;
import { EventChannel } from '../LiteLoaderQQNT-Euphony/src/index.js';
const eventChannel = EventChannel.withTriggers();


const popupText = await (await fetch(`local:///${pluginPath}/static/popup.html`)).text();
document.body.insertAdjacentHTML('afterbegin', popupText);
const overlay = document.getElementById('ap-popup-overlay');
const popup = document.getElementById('ap-popup');
const closeButton = document.getElementById('ap-popup-closeBtn');

const showPopup = () => {
    overlay.style.display = 'flex';
    popup.style.display = 'flex';
};

const hidePopup = () => {
    overlay.style.display = 'none';
    popup.style.display = 'none';
};

closeButton.addEventListener('click', hidePopup);

function myAlert(content, title = "提示") {
    const formattedText = content.replace(/\n/g, '<br>');
    const titleElement = document.querySelector("#ap-popup-title");
    const contentElement = document.querySelector("#ap-popup-content");
    titleElement.innerHTML = title;
    contentElement.innerHTML = formattedText;
    showPopup();
}

const saveConfig = async(config) => {
    await LiteLoader.api.config.set("arknights_plugin", config);
}

export const onSettingWindowCreated = async (view) => {
	const html_file_path = `local:///${pluginPath}/static/settings.html`;
	const htmlText = await (await fetch(html_file_path)).text();
	view.insertAdjacentHTML('afterbegin', htmlText);
    let options = await LiteLoader.api.config.get("arknights_plugin");
    { // adb 设置部分
        const api_input = view.querySelector(".arknights_plugin .ap-adb-address");
        const reset = view.querySelector(".arknights_plugin .ap-adb-address-reset");
        const apply = view.querySelector(".arknights_plugin .ap-adb-address-apply");

        api_input.value = options.adb_address;

        reset.addEventListener("click", async () => {
            api_input.value = "127.0.0.1:16384";
            options.adb_address = api_input.value;
            await saveConfig(options);
            myAlert("adb 连接地址已恢复默认！");
        });

        apply.addEventListener("click", async () => {
            if (!await arknights_plugin.adb_test(api_input.value)) {
                myAlert("无法连接至 adb, 请检查设置！");
                api_input.value = options.adb_address;
                return;
            }
            options.adb_address = api_input.value;
            await saveConfig(options);
            myAlert("adb 连接地址成功设置！");
        });
    }
    { // MAA 设置部分
        const port_input = view.querySelector(".arknights_plugin .ap-maa-port");
        const userId_input = view.querySelector(".arknights_plugin .ap-maa-userId");
        const path_input = view.querySelector(".arknights_plugin .ap-maa-path");
        port_input.value = options.maa_port;
        userId_input.value = options.userId;
        path_input.value = options.maa_path;
        const port_apply = view.querySelector(".arknights_plugin .ap-maa-port-apply");
        port_apply.addEventListener("click", async () => {
            options.maa_port = Number(port_input.value);
            await saveConfig(options);
            myAlert("MAA API 监听端口成功设置！\n需要重启以应用更改！");
        });
        const userId_apply = view.querySelector(".arknights_plugin .ap-maa-userId-apply");
        userId_apply.addEventListener("click", async () => {
            options.userId = userId_input.value;
            await saveConfig(options);
            myAlert("MAA API 用户标识符成功设置！");
        });
        const path_apply = view.querySelector(".arknights_plugin .ap-maa-path-apply");
        path_apply.addEventListener("click", async () => {
            options.maa_path = path_input.value;
            await saveConfig(options);
            myAlert("MAA 可执行文件地址成功设置！");
        });
    }
    { // QQ 监听设置部分
        const groups_input = view.querySelector(".arknights_plugin .ap-groups");
        const groups_apply = view.querySelector(".arknights_plugin .ap-groups-apply");
        groups_input.value = options.allowed_group.join(',');
        groups_apply.addEventListener("click", async () => {
            options.allowed_group = groups_input.value.split(/\s*,\s*/).filter(item => item);
            groups_input.value = options.allowed_group.join(',');
            await saveConfig(options);
            myAlert("监听群聊列表成功设置！");
        });
    }
}

function valid(command, rcommand, args, len) {
    if (command !== rcommand) return false;
    return args.length == len + 1;
}

async function sendMessage(contact, msg) {
    await contact.sendMessage(new MessageChain().append(new PlainText("[MAA Report]\n")).append(new PlainText(msg)));
}

async function reportError(contact, taskName, id, err) {
    await sendMessage(contact, "任务 [" + taskName + "(#" + id + ")] 发生错误：\n" + err);
}

async function reportResult(contact, taskName, id) {
    console.log("任务 [" + taskName + "(#" + id + ")] 执行完成！");
    await sendMessage(contact, "任务 [" + taskName + "(#" + id + ")] 执行完成！");
}

async function sendImage(contact, path, content = null) {
    let msg = new MessageChain();
    if (content) msg.append(new PlainText(content));
    msg.append(new Image(path));
    await contact.sendMessage(msg);
}

const allowedTasks = [
    'LinkStart',
    'LinkStart-Base',
    'LinkStart-WakeUp',
    'LinkStart-Combat',
    'LinkStart-Recruiting',
    'LinkStart-Mall',
    'LinkStart-Mission',
    'LinkStart-AutoRoguelike',
    'LinkStart-ReclamationAlgorithm',
    'Toolbox-GachaOnce',
    'Toolbox-GachaTenTimes',
    'StopTask'
];

const nameTranslate =  {
    "LinkStart": "开始长草",
    "LinkStart-Base": '基建换班',
    "LinkStart-WakeUp": '开始唤醒',
    "LinkStart-Combat": '清理智',
    "LinkStart-Recruiting": '公招',
    "LinkStart-Mall": '信用购物',
    "LinkStart-Mission": '领取奖励',
    "LinkStart-AutoRoguelike": '自动肉鸽',
    "LinkStart-ReclamationAlgorithm": '生息演算',
    "Toolbox-GachaOnce": '抽卡',
    "Toolbox-GachaTenTimes": '十连抽',
    "StopTask": '停止任务'
}

async function processMessage(msg, contact) {
    if (msg.indexOf("[MAA Report]") === 0) {
        return;
    }
    // TODO: 支持私聊
    if (contact.constructor.getChatType() !== 2) return;
    let options = await LiteLoader.api.config.get("arknights_plugin");
    let flag = 0;
    for (let i = 0; i < options.allowed_group.length; i++) {
        const val = options.allowed_group[i];
        console.log(val + "<->" + contact.getId());
        if (val === contact.getId()) {
            flag = 1;
            break;
        }
    }
    if (flag !== 1) {
        return;
    }
    if (msg.indexOf("[MAA]") != 0 || msg === "[MAA]") {
        return;
    }
    const str = msg.split("[MAA]")[1];
    const args = str.split(/\s+/);
    const command = args[0];
    if (valid(command, "changeProfile", args, 1)) {
        try {
            await arknights_plugin.maa_changeProfile(args[1]);
            reportResult(contact, "切换配置", 0);
        }
        catch (err) {
            reportError(contact, "切换配置", 0, err);
        }
        return;
    }
    if (valid(command, "addTask", args, 1)) {
        for (let val of allowedTasks) {
            if (args[1] === val) {
                const id = await arknights_plugin.maa_addTask(args[1], contact.getId());
                await sendMessage(contact, "任务添加成功！任务 ID (#" + id + ")。");
                return;
            }
        }
        await sendMessage(contact, "任务添加失败！找不到任务类型 [" + args[1] + "]！");
        return;
    }
    if (valid(command, "screenshot", args, 0)) {
        sendImage(contact, await arknights_plugin.getScreenshot());
    }
}

// 上报已经完成的任务
setInterval(async () => {
    const report = await arknights_plugin.maa_getReport();
    if (!report.length) return;
    for (let task of report) {
        const group = Group.make(task.contact);
        reportResult(group, nameTranslate[task.type], task.id);
        if (task.type === "Toolbox-GachaOnce" || task.type === "Toolbox-GachaTenTimes") {
            await sendImage(group, await arknights_plugin.getScreenshot(), "抽卡结果如下：");
        }
    }
}, 200);

eventChannel.subscribeEvent('receive-message', (message, source) => { processMessage(message.contentToString(), source.getContact()) });
eventChannel.subscribeEvent('send-message', (message, source) => { processMessage(message.contentToString(), source.getContact()) });