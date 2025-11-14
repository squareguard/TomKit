const path = require('path');
const { BrowserWindow, globalShortcut } = require('electron');

let mainWindow = null;

// Create the main application window
const createWindow = (config) => {
  const win = new BrowserWindow({
    title: 'TomKit',
    width: 600,
    height: 400,
    transparent: true,
    frame: false,
    webPreferences: {
      // Preload script to securely expose APIs to renderer
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  mainWindow = win;

  // Load the main HTML file
  win.loadFile('public/index.html');

  // Handle window close - minimize to tray if enabled
  win.on('close', (event) => {
    const { app } = require('electron');
    if (config.minimizeToTray && !app.isQuitting) {
      event.preventDefault();
      win.hide();
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    }
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  // Register keyboard shortcuts
  registerShortcuts();

  return win;
};

// Register global keyboard shortcuts
function registerShortcuts() {
  // Start Tomcat (Cmd/Ctrl + R)
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut-start-tomcat');
    }
  });

  // Stop Tomcat (Cmd/Ctrl + S)
  globalShortcut.register('CommandOrControl+S', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut-stop-tomcat');
    }
  });

  // Toggle Log Window (Cmd/Ctrl + L)
  globalShortcut.register('CommandOrControl+L', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut-toggle-log');
    }
  });

  // Show/Hide Main Window (Cmd/Ctrl + Shift + T)
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

function getMainWindow() {
  return mainWindow;
}

function setMainWindow(window) {
  mainWindow = window;
}

module.exports = {
  createWindow,
  registerShortcuts,
  getMainWindow,
  setMainWindow
};
