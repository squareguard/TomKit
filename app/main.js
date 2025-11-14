const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');

// Import modules
const { getAppVersion, loadConfig, saveConfig } = require('./js/config');
const { startTomcat, stopTomcat, checkTomcatStatus, scanWebapps, launchWebapp } = require('./js/tomcat-manager');
const { createWindow, registerShortcuts } = require('./js/window-manager');
const { createTray } = require('./js/tray-manager');
const { openLogWindow, clearLogFile } = require('./js/log-manager');
const { showNotification } = require('./js/notifications');

// Set the app name
app.setName('TomKit');

// Set app user model ID for Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.josephtuckwell.tomkit');
}

// Global variables
let mainWindow = null;

// Called when Electron has finished initialization
app.whenReady().then(() => {
  const config = loadConfig();
  
  // Create window first
  mainWindow = createWindow(config);
  
  // Then create tray with window reference
  createTray(mainWindow);

  // Set auto-launch
  if (config.autoStart) {
    app.setLoginItemSettings({
      openAtLogin: true
    });
  }

  // On macOS, re-create a window when the dock icon is clicked and there are no other windows open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const config = loadConfig();
      mainWindow = createWindow(config);
    }
  })
})

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', (event) => {
  const config = loadConfig();
  if (process.platform !== 'darwin' && !config.minimizeToTray) {
    app.quit();
  }
})

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// Handle "start-tomcat" requests from the renderer process
ipcMain.handle('start-tomcat', async (event, installPath, type, port, selectedWebapp, autoLaunch) => {
  try {
    const result = await startTomcat(installPath, type, port, selectedWebapp, autoLaunch);
    showNotification('TomKit', 'Tomcat started successfully');
    return result;
  } catch (error) {
    showNotification('TomKit Error', 'Failed to start Tomcat');
    throw error;
  }
});

// Handle "stop-tomcat" requests from the renderer process
ipcMain.handle('stop-tomcat', async (event, installPath, type, port) => {
  try {
    const result = await stopTomcat(installPath, type, port);
    showNotification('TomKit', 'Tomcat stopped successfully');
    return result;
  } catch (error) {
    showNotification('TomKit Error', 'Failed to stop Tomcat');
    throw error;
  }
});

// Handle version request
ipcMain.handle('get-app-version', async () => {
  return getAppVersion();
});

// Handle configuration saving
ipcMain.handle('save-config', async (event, config) => {
  return saveConfig(config);
});

// Handle configuration loading
ipcMain.handle('load-config', async () => {
  return loadConfig();
});

// Handle auto-start setting
ipcMain.handle('set-auto-start', async (event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled
    });
    return { success: true };
  } catch (error) {
    console.error('Error setting auto-start:', error);
    return { success: false, error: error.message };
  }
});

// Handle show/hide window
ipcMain.on('toggle-window-visibility', () => {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  }
});

// Handle minimize window
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    const config = loadConfig();
    console.log('Minimize window requested. Config minimizeToTray:', config.minimizeToTray);
    
    if (config.minimizeToTray) {
      console.log('Hiding window to tray');
      mainWindow.hide();
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
      
      // Show notification to let user know app is in tray
      if (config.notifications) {
        showNotification('TomKit', 'Application minimized to system tray');
      }
    } else {
      console.log('Minimizing window normally');
      mainWindow.minimize();
    }
  }
});

// Handle Tomcat status check
ipcMain.handle('check-tomcat-status', async (event, installPath, type, port) => {
  return checkTomcatStatus(installPath, type, port);
});

// Handle quit request
ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('open-log-window', (event, logPath) => {
  openLogWindow(logPath);
});

// Handle clear log file request
ipcMain.handle('clear-log-file', async (event, logPath) => {
  try {
    const result = await clearLogFile(logPath);
    showNotification('TomKit', 'Log file cleared successfully');
    return result;
  } catch (error) {
    showNotification('TomKit Error', `Failed to clear log file: ${error.message}`);
    throw error;
  }
});

// Handle scan webapps request
ipcMain.handle('scan-webapps', async (event, installPath, type) => {
  try {
    return scanWebapps(installPath, type);
  } catch (error) {
    console.error('Error scanning webapps:', error);
    return [];
  }
});

// Handle launch webapp request
ipcMain.handle('launch-webapp', async (event, webapp, port, launchAll, installPath, type) => {
  try {
    const result = launchWebapp(webapp, port, launchAll, installPath, type);
    if (result.success) {
      showNotification('TomKit', result.message);
    }
    return result;
  } catch (error) {
    showNotification('TomKit Error', 'Failed to launch webapp');
    throw error;
  }
});