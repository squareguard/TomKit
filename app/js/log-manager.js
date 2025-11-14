const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { BrowserWindow } = require('electron');
const { loadConfig } = require('./config');

let logWindow = null;
let logTailProcess = null;

function openLogWindow(logPath) {
  if (logWindow) {
    logWindow.focus();
    return;
  }
  logWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });
  logWindow.loadFile('public/log.html');
  logWindow.on('closed', () => {
    logWindow = null;
    if (logTailProcess) {
      logTailProcess.kill();
      logTailProcess = null;
    }
  });

  logWindow.webContents.on('did-finish-load', () => {
    // Send the log path to the renderer so it knows which file to clear
    logWindow.webContents.send('start-tail', logPath);
    
    if (logTailProcess) {
      logTailProcess.kill();
      logTailProcess = null;
    }
    if (!fs.existsSync(logPath)) {
      logWindow.webContents.send('catalina-data', '[Log file does not exist]');
      return;
    }
    logTailProcess = spawn('tail', ['-n', '100', '-f', logPath]);
    logTailProcess.stdout.on('data', (data) => {
      logWindow.webContents.send('catalina-data', data.toString());
    });
    logTailProcess.stderr.on('data', (data) => {
      logWindow.webContents.send('catalina-data', '[stderr] ' + data.toString());
    });
    logTailProcess.on('close', () => {
      if (logWindow) logWindow.webContents.send('catalina-data', '[tail stopped]');
    });
    logTailProcess.on('error', (err) => {
      console.error('Tail process error:', err);
    });
  });
}

// Handle clear log file request
async function clearLogFile(logPath) {
  try {
    // If no specific path is provided, try to determine the catalina log path
    if (!logPath) {
      const config = loadConfig();
      let catalinaLogPath;
      
      if (config.installType === 'homebrew') {
        catalinaLogPath = '/usr/local/opt/tomcat/libexec/logs/catalina.out';
      } else if (config.installLocation) {
        catalinaLogPath = path.join(config.installLocation, 'logs', 'catalina.out');
      } else {
        throw new Error('Unable to determine log file path');
      }
      
      logPath = catalinaLogPath;
    }
    
    // Check if the log file exists
    if (!fs.existsSync(logPath)) {
      throw new Error('Log file does not exist');
    }
    
    // Clear the log file by writing an empty string to it
    fs.writeFileSync(logPath, '');
    
    console.log(`Log file cleared: ${logPath}`);
    
    return { success: true, message: 'Log file cleared successfully' };
  } catch (error) {
    console.error('Error clearing log file:', error);
    throw error;
  }
}

function stopTailing() {
  if (logTailProcess) {
    logTailProcess.kill();
    logTailProcess = null;
  }
}

function getLogWindow() {
  return logWindow;
}

module.exports = {
  openLogWindow,
  clearLogFile,
  stopTailing,
  getLogWindow
};
