const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arknights_plugin", {
    getScreenshot: () => ipcRenderer.invoke("LiteLoader.arknights_plugin.getScreenshot"),
    adb_test: (address) => ipcRenderer.invoke("LiteLoader.arknights_plugin.adb_test", address),
    maa_changeProfile: (profile) => ipcRenderer.invoke("LiteLoader.arknights_plugin.maa_changeProfile", profile),
    maa_addTask: (type, contact, param = null) => ipcRenderer.invoke("LiteLoader.arknights_plugin.maa_addTask", type, contact, param),
    maa_getTasks: () => ipcRenderer.invoke("LiteLoader.arknights_plugin.maa_getTasks"),
    maa_getReport: () => ipcRenderer.invoke("LiteLoader.arknights_plugin.maa_getReport")
}, { readonly: true });
