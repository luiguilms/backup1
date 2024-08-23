const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  connectToServer: (ip, port, username, password) => ipcRenderer.invoke('connect-to-server', { ip, port, username, password }),
  getLogDetails: (directoryPath, ip, port, username, password, targetOS) => ipcRenderer.invoke('get-log-details', { directoryPath, ip, port, username, password,targetOS }),
  saveLogToDatabase: (logDetails, dumpFileInfo, targetOS,logFileName) => ipcRenderer.invoke('save-log-to-database', { logDetails, dumpFileInfo, targetOS,logFileName }),
});
