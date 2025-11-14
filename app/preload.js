const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startTomcat: (path, type, port, selectedWebapp, autoLaunch) => ipcRenderer.invoke('start-tomcat', path, type, port, selectedWebapp, autoLaunch),
  stopTomcat: (path, type, port) => ipcRenderer.invoke('stop-tomcat', path, type, port),
  openLogWindow: (logPath) => ipcRenderer.send('open-log-window', logPath),
  onCatalinaData: (callback) => ipcRenderer.on('catalina-data', (event, data) => callback(data)),
  onStartTail: (callback) => ipcRenderer.on('start-tail', (event, logPath) => callback(logPath)),
  tailCatalina: (logPath) => ipcRenderer.send('tail-catalina', logPath),
  clearLogFile: (logPath) => ipcRenderer.invoke('clear-log-file', logPath),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkTomcatStatus: (path, type, port) => ipcRenderer.invoke('check-tomcat-status', path, type, port),
  scanWebapps: (path, type) => ipcRenderer.invoke('scan-webapps', path, type),
  launchWebapp: (webapp, port, launchAll, installPath, type) => ipcRenderer.invoke('launch-webapp', webapp, port, launchAll, installPath, type),
  quitApp: () => ipcRenderer.send('quit-app'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  toggleWindowVisibility: () => ipcRenderer.send('toggle-window-visibility'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  
  // Shortcut event listeners
  onShortcutStartTomcat: (callback) => ipcRenderer.on('shortcut-start-tomcat', callback),
  onShortcutStopTomcat: (callback) => ipcRenderer.on('shortcut-stop-tomcat', callback),
  onShortcutToggleLog: (callback) => ipcRenderer.on('shortcut-toggle-log', callback),
});