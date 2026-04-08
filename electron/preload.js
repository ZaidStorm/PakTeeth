"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("__pakteeth__", {
    version: "1.0.0",
    selectReportFiles: (patientId) => ipcRenderer.invoke('select-report-files', patientId),
    readReportFile: (filePath) => ipcRenderer.invoke('read-report-file', filePath),
    linkSyncFolder: (patientId) => ipcRenderer.invoke('link-sync-folder', patientId),
    getSyncFolder: (patientId) => ipcRenderer.invoke('get-sync-folder', patientId),
    processSyncFiles: (patientId, fileObjs) => ipcRenderer.invoke('process-sync-files', patientId, fileObjs),
    quitApp: () => ipcRenderer.send('quit-app'),
    restartApp: () => ipcRenderer.send('restart-app')
});
