const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Configuration file management
function getConfigPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config.json');
}

function loadConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  
  // Return default configuration
  return {
    installType: 'homebrew',
    installLocation: '',
    tomcatPort: '8080',
    theme: 'dark',
    notifications: true,
    autoStart: false,
    minimizeToTray: true,
    autoLaunch: false
  };
}

function saveConfig(config) {
  try {
    const configPath = getConfigPath();
    const userDataPath = path.dirname(configPath);
    
    // Ensure the user data directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Configuration saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Error saving config:', error);
    return { success: false, error: error.message };
  }
}

// Get version from package.json
function getAppVersion() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
  } catch (error) {
    console.error('Error reading version from package.json:', error);
    return '0.0.0';
  }
}

module.exports = {
  getConfigPath,
  loadConfig,
  saveConfig,
  getAppVersion
};
