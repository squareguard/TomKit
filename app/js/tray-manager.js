const path = require('path');
const { Menu, Tray, nativeImage, app } = require('electron');

let tray = null;

// Create system tray
function createTray(mainWindow) {
  const iconPath = path.join(__dirname, '..', 'public', 'images', 'TomKit-icon.png');
  let icon;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      console.error('Failed to load tray icon from:', iconPath);
      // Try to create a simple fallback icon
      icon = nativeImage.createEmpty();
    }
    
    // Resize icon for tray (16x16 is standard for system tray)
    if (!icon.isEmpty()) {
      icon = icon.resize({ width: 16, height: 16 });
    }
  } catch (error) {
    console.error('Error creating tray icon:', error);
    icon = nativeImage.createEmpty();
  }
  
  try {
    tray = new Tray(icon);
    console.log('System tray created successfully');
    
    // Set up tray menu and events
    setupTrayMenu(mainWindow);
    
  } catch (error) {
    console.error('Failed to create system tray:', error);
    tray = null;
    return;
  }

  return tray;
}

// Set up tray menu and events
function setupTrayMenu(mainWindow) {
  if (!tray) return;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show TomKit',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          if (process.platform === 'darwin') {
            app.dock.show();
          }
        } else {
          const { createWindow } = require('./window-manager');
          const { loadConfig } = require('./config');
          createWindow(loadConfig());
        }
      }
    },
    {
      label: 'Start Tomcat',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('shortcut-start-tomcat');
        }
      }
    },
    {
      label: 'Stop Tomcat',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('shortcut-stop-tomcat');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('TomKit - Tomcat Manager');
  tray.setContextMenu(contextMenu);
  
  // Double-click to show window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (process.platform === 'darwin') {
        app.dock.show();
      }
    } else {
      const { createWindow } = require('./window-manager');
      const { loadConfig } = require('./config');
      createWindow(loadConfig());
    }
  });

  console.log('Tray menu and events set up successfully');
}

function getTray() {
  return tray;
}

module.exports = {
  createTray,
  setupTrayMenu,
  getTray
};
