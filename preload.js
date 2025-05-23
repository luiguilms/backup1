//preload.js
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electron", {
  connectToServer: (ip, port, username, password) =>
    ipcRenderer.invoke("connect-to-server", { ip, port, username, password }),
  getLogDetails: (directoryPath, ip, port, username, password, targetOS) =>
    ipcRenderer.invoke("get-log-details", {
      directoryPath,
      ip,
      port,
      username,
      password,
      targetOS,
    }),
  saveLogToDatabase: (
    logDetails,
    dumpFileInfo,
    targetOS,
    logFileName,
    ip,
    backupPath,
    totalFolderSize,    // Nuevo campo
    backupStatus,       // Nuevo campo
    groupControlInfo,    // Nuevo campo
    lastLine
  ) =>
    ipcRenderer.invoke("save-log-to-database", {
      logDetails,
      dumpFileInfo,
      targetOS,
      logFileName,
      ip,
      backupPath,
      totalFolderSize,    // Pasamos el valor de totalFolderSize
      backupStatus,       // Pasamos el valor de backupStatus
      groupControlInfo,    // Pasamos el valor de groupControlInfo
      lastLine
    }),
  verifyCredentials: (ip, username, password) =>
    ipcRenderer.invoke("verify-credentials", { ip, username, password }),
  getServers: () => ipcRenderer.invoke("get-servers"),
  addServer: (serverData) => ipcRenderer.invoke("add-server", serverData),
  updateServer: (serverData) => ipcRenderer.invoke("update-server", serverData),
  deleteServer: (serverId) => ipcRenderer.invoke("delete-server", serverId),
  getServerDetails: (id) => ipcRenderer.invoke("get-server-details", id),
  getBackupRoutesByIP: (ip) => ipcRenderer.invoke("getBackupRoutesByIP", ip),
  processAllServers: () => ipcRenderer.invoke("process-all-servers"),
  getBackupStatistics: () => ipcRenderer.invoke("get-backup-statistics"),
  exportToExcel: (data) => ipcRenderer.invoke("export-to-excel", data),
  getDmpSizeData: (days) => ipcRenderer.invoke('get-dmp-size-data', days),
  addBackupRoute: (ip, backupPath) =>
    ipcRenderer.invoke("addBackupRoute", ip, backupPath),
  updateBackupRoute: (ip, oldPath, newPath) =>
    ipcRenderer.invoke("updateBackupRoute", ip, oldPath, newPath),
  deleteBackupRoute: (ip, backupPath) =>
    ipcRenderer.invoke("deleteBackupRoute", ip, backupPath),
  getVerificationHistory: (date) => ipcRenderer.invoke("get-verification-history", date),
  getPostgresHistory: (date) => ipcRenderer.invoke("get-postgres-history", date),
  send: (channel, data) => ipcRenderer.send(channel, data),
  sendEmailWithImages: (data) => ipcRenderer.invoke('send-email-with-images', data),
  checkNetworkerConflicts: (backupData) => 
    ipcRenderer.invoke("check-networker-conflicts", backupData),
  // Escuchar el evento 'start-processing' del main process
  startProcessingIfScheduled: (callback) => {
    ipcRenderer.on('start-processing', () => {
      console.log("Recibida señal de inicio automático");
      callback();
    });
  }
});
