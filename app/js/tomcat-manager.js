const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { shell } = require('electron');

// Function to update Tomcat port in server.xml
async function updateTomcatPort(installPath, port) {
  const serverXmlPath = path.join(installPath, 'conf', 'server.xml');
  
  if (!fs.existsSync(serverXmlPath)) {
    throw new Error(`server.xml not found at ${serverXmlPath}`);
  }

  try {
    const data = fs.readFileSync(serverXmlPath, 'utf8');
    
    // Replace the HTTP connector port (find the first HTTP connector)
    const updatedData = data.replace(
      /<Connector\s+port="\d+"\s+protocol="HTTP\/1\.1"/,
      `<Connector port="${port}" protocol="HTTP/1.1"`
    );
    
    fs.writeFileSync(serverXmlPath, updatedData);
    console.log(`Updated Tomcat port to ${port} in ${serverXmlPath}`);
  } catch (error) {
    throw new Error(`Failed to update server.xml: ${error.message}`);
  }
}

// Function to configure webapp deployment in server.xml
async function configureWebappDeployment(installPath, selectedWebapp, type) {
  const serverXmlPath = path.join(installPath, 'conf', 'server.xml');
  
  if (!fs.existsSync(serverXmlPath)) {
    throw new Error(`server.xml not found at ${serverXmlPath}`);
  }

  try {
    let data = fs.readFileSync(serverXmlPath, 'utf8');
    
    // Remove any existing custom context configurations we added
    data = data.replace(/<!-- TomKit webapp configuration start -->[\s\S]*?<!-- TomKit webapp configuration end -->/g, '');
    
    // Restore autoDeploy to true (remove any autoDeploy="false" we added)
    data = data.replace(/(\s+autoDeploy="false")/g, '');
    
    // If "ALL" is selected, restore all webapps and use default behavior
    if (selectedWebapp === 'ALL') {
      await restoreAllWebapps(installPath, type);
      fs.writeFileSync(serverXmlPath, data);
      console.log('Configured Tomcat to deploy all webapps');
      return;
    }
    
    // For specific webapp selection, disable others but keep selected webapp enabled
    await disableUnselectedWebapps(installPath, selectedWebapp, type);
    
    fs.writeFileSync(serverXmlPath, data);
    console.log(`Configured Tomcat to deploy only: ${selectedWebapp}`);
  } catch (error) {
    throw new Error(`Failed to configure webapp deployment: ${error.message}`);
  }
}

// Function to disable unselected webapps by renaming them
async function disableUnselectedWebapps(installPath, selectedWebapp, type) {
  try {
    let webappsPath;
    
    if (type === 'homebrew') {
      webappsPath = '/usr/local/opt/tomcat/libexec/webapps';
    } else {
      webappsPath = path.join(installPath, 'webapps');
    }
    
    if (!fs.existsSync(webappsPath)) {
      return;
    }
    
    const items = fs.readdirSync(webappsPath);
    
    for (const item of items) {
      // Skip already disabled items
      if (item.endsWith('.disabled')) {
        continue;
      }
      
      const itemPath = path.join(webappsPath, item);
      const stat = fs.statSync(itemPath);
      
      // Handle both directories and WAR files
      if (stat.isDirectory() || item.endsWith('.war')) {
        const appName = item.replace(/\.war$/, '');
        
        // Disable webapp if it's not the selected one
        const shouldDisable = (selectedWebapp === 'ROOT' && appName !== 'ROOT') || 
                             (selectedWebapp !== 'ROOT' && appName !== selectedWebapp && appName !== 'ROOT');
        
        if (shouldDisable) {
          const disabledName = item + '.disabled';
          const disabledPath = path.join(webappsPath, disabledName);
          
          // Only rename if not already disabled
          if (!fs.existsSync(disabledPath)) {
            fs.renameSync(itemPath, disabledPath);
            console.log(`Disabled webapp: ${item} -> ${disabledName}`);
          }
        }
      }
    }
    
    // Also restore the selected webapp if it was previously disabled
    await restoreSelectedWebapp(installPath, selectedWebapp, type);
    
  } catch (error) {
    console.error('Error disabling webapps:', error);
    throw error;
  }
}

// Function to restore a specific webapp if it was disabled
async function restoreSelectedWebapp(installPath, selectedWebapp, type) {
  try {
    let webappsPath;
    
    if (type === 'homebrew') {
      webappsPath = '/usr/local/opt/tomcat/libexec/webapps';
    } else {
      webappsPath = path.join(installPath, 'webapps');
    }
    
    if (!fs.existsSync(webappsPath)) {
      return;
    }
    
    const items = fs.readdirSync(webappsPath);
    
    for (const item of items) {
      if (item.endsWith('.disabled')) {
        const originalName = item.replace(/\.disabled$/, '');
        const appName = originalName.replace(/\.war$/, '');
        
        // Restore if this is the selected webapp
        if (appName === selectedWebapp) {
          const itemPath = path.join(webappsPath, item);
          const originalPath = path.join(webappsPath, originalName);
          
          // Only restore if original doesn't exist
          if (!fs.existsSync(originalPath)) {
            fs.renameSync(itemPath, originalPath);
            console.log(`Restored selected webapp: ${item} -> ${originalName}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error restoring selected webapp:', error);
    throw error;
  }
}

// Function to restore all webapps by renaming .disabled files back
async function restoreAllWebapps(installPath, type) {
  try {
    let webappsPath;
    
    if (type === 'homebrew') {
      webappsPath = '/usr/local/opt/tomcat/libexec/webapps';
    } else {
      webappsPath = path.join(installPath, 'webapps');
    }
    
    if (!fs.existsSync(webappsPath)) {
      return;
    }
    
    const items = fs.readdirSync(webappsPath);
    
    for (const item of items) {
      if (item.endsWith('.disabled')) {
        const itemPath = path.join(webappsPath, item);
        const originalName = item.replace(/\.disabled$/, '');
        const originalPath = path.join(webappsPath, originalName);
        
        // Only restore if original doesn't exist
        if (!fs.existsSync(originalPath)) {
          fs.renameSync(itemPath, originalPath);
          console.log(`Restored webapp: ${item} -> ${originalName}`);
        }
      }
    }
  } catch (error) {
    console.error('Error restoring webapps:', error);
    throw error;
  }
}

// Helper functions for Tomcat operations
async function handleStartTomcat(installPath, type, port, selectedWebapp = 'ALL', autoLaunch = false) {
  let scriptPath = '';
  let args;

  // Determine the actual install path for configuration
  let actualInstallPath = installPath;
  if (type === 'homebrew') {
    actualInstallPath = path.join('/', 'usr', 'local', 'opt', 'tomcat', 'libexec');
  }

  // If a custom port is specified, update server.xml before starting
  if (port && port !== '') {
    try {
      console.log(`Updating Tomcat port to ${port} in ${actualInstallPath}`);
      await updateTomcatPort(actualInstallPath, port);
    } catch (error) {
      console.error('Error updating Tomcat port:', error);
      throw error;
    }
  }

  // Configure webapp deployment based on selection
  try {
    console.log(`Configuring webapp deployment for: ${selectedWebapp}`);
    await configureWebappDeployment(actualInstallPath, selectedWebapp, type);
  } catch (error) {
    console.error('Error configuring webapp deployment:', error);
    throw error;
  }

  // If using Homebrew, start Tomcat as a service
  if (type === 'homebrew') {
    scriptPath = 'brew';
    args = ['services', 'start', 'tomcat'];
  } else {
    // Otherwise, run the startup.sh in the bin dir from the manual install path
    scriptPath = path.join(installPath, 'bin', 'startup.sh');
    args = [];
  }

  console.log('Attempting to start Tomcat with:', scriptPath);

  return new Promise((resolve, reject) => {
    execFile(scriptPath, args, (error, stdout, stderr) => {
      if (error) {
        console.error('Error starting Tomcat:', error);
        reject({ success: false, error: error.message });
      } else {
        console.log('Tomcat started successfully:', stdout);
        
        // Auto-launch webapp if enabled
        if (autoLaunch) {
          console.log('Auto-launching webapp after startup delay...');
          setTimeout(() => {
            try {
              const launchAll = selectedWebapp === 'ALL';
              const webapp = launchAll ? null : selectedWebapp;
              launchWebapp(webapp, port, launchAll, actualInstallPath, type);
              console.log(`Auto-launched webapp: ${selectedWebapp}`);
            } catch (launchError) {
              console.error('Error auto-launching webapp:', launchError);
            }
          }, 3000); // 3 second delay to allow Tomcat to fully start
        }
        
        resolve({ success: true, message: 'Server started successfully' });
      }
    });
  });
}

async function handleStopTomcat(installPath, type, port) {
  let scriptPath = '';
  let args;

  // If using Homebrew, stop Tomcat as a service
  if (type === 'homebrew') {
    scriptPath = 'brew';
    args = ['services', 'stop', 'tomcat'];
  } else {
    // Otherwise, run the shutdown.sh from bin dir in manual install path
    scriptPath = path.join(installPath, 'bin', 'shutdown.sh');
    args = [];
  }

  console.log('Attempting to stop Tomcat with:', scriptPath);

  return new Promise((resolve, reject) => {
    execFile(scriptPath, args, (error, stdout, stderr) => {
      if (error) {
        console.error('Error stopping Tomcat:', error);
        reject({ success: false, error: error.message });
      } else {
        console.log('Tomcat stopped successfully:', stdout);
        resolve({ success: true, message: 'Server stopped successfully' });
      }
    });
  });
}

// Check Tomcat status
function checkTomcatStatus(installPath, type, port) {
  return new Promise((resolve) => {
    // Check if Tomcat is running by attempting to connect to the specified port
    const net = require('net');
    const client = new net.Socket();
    
    const checkPort = port || '8080'; // Default to 8080 if no port specified
    
    client.setTimeout(2000); // 2 second timeout
    
    client.connect(checkPort, 'localhost', () => {
      client.destroy();
      resolve({ running: true, port: checkPort });
    });
    
    client.on('error', () => {
      client.destroy();
      resolve({ running: false, port: checkPort });
    });
    
    client.on('timeout', () => {
      client.destroy();
      resolve({ running: false, port: checkPort });
    });
  });
}

// Function to scan webapps folder
function scanWebapps(installPath, type) {
  try {
    let webappsPath;
    
    if (type === 'homebrew') {
      webappsPath = '/usr/local/opt/tomcat/libexec/webapps';
    } else if (installPath) {
      webappsPath = path.join(installPath, 'webapps');
    } else {
      throw new Error('Unable to determine webapps path');
    }
    
    if (!fs.existsSync(webappsPath)) {
      return [];
    }
    
    const items = fs.readdirSync(webappsPath);
    const webapps = new Set();
    
    for (const item of items) {
      const itemPath = path.join(webappsPath, item);
      const stat = fs.statSync(itemPath);
      
      // Include directories and WAR files (both active and disabled)
      if (stat.isDirectory() || (stat.isFile() && item.endsWith('.war'))) {
        // Remove .war extension and .disabled suffix for display
        let appName = item.replace(/\.war$/, '').replace(/\.disabled$/, '');
        
        if (appName !== 'ROOT') { // Skip ROOT as it's the default context
          webapps.add(appName);
        }
      }
    }
    
    return Array.from(webapps).sort();
  } catch (error) {
    console.error('Error scanning webapps:', error);
    return [];
  }
}

// Function to launch webapp(s) in browser
function launchWebapp(webapp, port, launchAll = false, installPath, type) {
  try {
    const baseUrl = `http://localhost:${port || '8080'}`;
    
    if (launchAll) {
      // Launch all webapps
      const webapps = scanWebapps(installPath, type);
      
      // Launch ROOT context first
      shell.openExternal(baseUrl);
      
      // Launch each webapp
      webapps.forEach(app => {
        const url = `${baseUrl}/${app}`;
        shell.openExternal(url);
      });
      
      return { success: true, message: `Launched ${webapps.length + 1} webapps` };
    } else {
      // Launch specific webapp
      const url = webapp === 'ROOT' ? baseUrl : `${baseUrl}/${webapp}`;
      shell.openExternal(url);
      return { success: true, message: `Launched ${webapp}` };
    }
  } catch (error) {
    console.error('Error launching webapp:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  updateTomcatPort,
  configureWebappDeployment,
  startTomcat: handleStartTomcat,
  stopTomcat: handleStopTomcat,
  checkTomcatStatus,
  scanWebapps,
  launchWebapp
};
