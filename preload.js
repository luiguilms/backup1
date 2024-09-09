//preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  connectToServer: (ip, port, username, password) => 
    ipcRenderer.invoke('connect-to-server', { ip, port, username, password }),

  getLogDetails: (directoryPath, ip, port, username, password, targetOS) => 
    ipcRenderer.invoke('get-log-details', { directoryPath, ip, port, username, password, targetOS }),

  saveLogToDatabase: (logDetails, dumpFileInfo, targetOS, logFileName, ip, backupPath) => 
    ipcRenderer.invoke('save-log-to-database', { logDetails, dumpFileInfo, targetOS, logFileName, ip, backupPath }),

  verifyCredentials: (ip, username, password) => 
    ipcRenderer.invoke('verify-credentials', { ip, username, password }),

  getServers: () => ipcRenderer.invoke('get-servers'),
  addServer: (serverData) => ipcRenderer.invoke('add-server', serverData),
});
