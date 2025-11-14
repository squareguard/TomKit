// Tomcat control and status management module
class TomcatController {
  constructor(configManager) {
    this.configManager = configManager;
    this.elStatus = document.getElementById('status');
    this.setupEventListeners();
    this.startStatusChecking();
  }

  setupEventListeners() {
    // Start button handler
    document.getElementById('btnStart').addEventListener('click', () => this.startTomcat());
    
    // Stop button handler
    document.getElementById('btnStop').addEventListener('click', () => this.stopTomcat());
    
    // Log button handler
    document.getElementById('openLog').addEventListener('click', () => this.openLogWindow());
    
    // Launch webapp button handler
    document.getElementById('launchWebappBtn').addEventListener('click', () => this.launchWebapp());
    
    // Install type change handler to refresh webapps
    document.getElementById('installType').addEventListener('change', () => this.refreshWebapps());
    
    // Install location change handler to refresh webapps
    document.getElementById('installLocation').addEventListener('input', () => this.refreshWebapps());
    
    // Webapp selection change handler
    document.getElementById('webappSelect').addEventListener('change', (e) => {
      const launchBtn = document.getElementById('launchWebappBtn');
      launchBtn.disabled = e.target.value === '';
    });
  }

  startStatusChecking() {
    // Check status when app loads
    setTimeout(() => this.checkTomcatStatus(), 1000);
    
    // Check status every 10 seconds
    setInterval(() => this.checkTomcatStatus(), 10000);
  }

  // Function to check Tomcat status
  async checkTomcatStatus() {
    const installLocation = document.getElementById('installLocation');
    const installType = document.getElementById('installType');
    const tomcatPort = document.getElementById('tomcatPort');

    const path = installLocation.value.trim();
    const type = installType.value.trim().toLowerCase();
    const port = tomcatPort.value.trim();
    
    try {
      const status = await window.api.checkTomcatStatus(path, type, port);
      if (status.running) {
        this.setStatus(`Running on port ${status.port}`, 'ok');
      } else {
        this.setStatus('Idle', '');
      }
    } catch (error) {
      console.error('Error checking Tomcat status:', error);
      this.setStatus('Status check failed', '');
    }
  }

  // Update the status display
  setStatus(label, kind) {
    this.elStatus.textContent = '';
    const dot = document.createElement('span');
    dot.className = 'status-dot';
    dot.setAttribute('aria-hidden', 'true');
    this.elStatus.className = `status ${kind || ''}`.trim();
    this.elStatus.appendChild(dot);
    this.elStatus.append(' ', label);
    
    // Update button states based on Tomcat running status
    const startButton = document.getElementById('btnStart');
    const logButton = document.getElementById('openLog');
    
    if (kind === 'ok' && label.includes('Running')) {
      // Tomcat is running - make start button green and log button blue
      startButton.classList.add('running');
      logButton.classList.add('running');
    } else {
      // Tomcat is not running - return to default grey state
      startButton.classList.remove('running');
      logButton.classList.remove('running');
    }
  }

  async startTomcat() {
    const installLocation = document.getElementById('installLocation');
    const installType = document.getElementById('installType');
    const tomcatPort = document.getElementById('tomcatPort');
    const webappSelect = document.getElementById('webappSelect');

    const path = installLocation.value.trim();
    const type = installType.value.trim().toLowerCase();
    const port = tomcatPort.value.trim();
    const selectedWebapp = webappSelect.value || 'ALL';
    const autoLaunch = this.configManager.config?.autoLaunch === true;
    
    if (type === 'manual' && !path) {
      this.setStatus('Manual mode requires install location', '');
      return;
    }
    
    this.setStatus('Starting...', 'ok');
    
    try {
      const result = await window.api.startTomcat(path, type, port, selectedWebapp, autoLaunch);
      if (result.success) {
        // Check status after a brief delay to confirm
        setTimeout(() => this.checkTomcatStatus(), 2000);
      } else {
        this.setStatus('Failed to start', 'bad');
      }
    } catch (error) {
      console.error('Error starting Tomcat:', error);
      this.setStatus('Failed to start', 'bad');
    }
  }

  async stopTomcat() {
    const installLocation = document.getElementById('installLocation');
    const installType = document.getElementById('installType');
    const tomcatPort = document.getElementById('tomcatPort');

    const path = installLocation.value.trim();
    const type = installType.value.trim().toLowerCase();
    const port = tomcatPort.value.trim();
    
    if (type === 'manual' && !path) {
      this.setStatus('Manual mode requires install location', '');
      return;
    }
    
    this.setStatus('Stopping...', 'bad');
    
    try {
      const result = await window.api.stopTomcat(path, type, port);
      if (result.success) {
        // Check status after a brief delay to confirm
        setTimeout(() => this.checkTomcatStatus(), 2000);
      } else {
        this.setStatus('Failed to stop', 'bad');
      }
    } catch (error) {
      console.error('Error stopping Tomcat:', error);
      this.setStatus('Failed to stop', 'bad');
    }
  }

  openLogWindow() {
    const installLocation = document.getElementById('installLocation');
    const installType = document.getElementById('installType');

    const installPath = installLocation.value.trim();
    const type = installType.value.trim().toLowerCase();

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;

    let logPath;
    if (type === 'homebrew') {
      // For Homebrew, the log path is fixed but uses the date
      logPath = `/usr/local/opt/tomcat/libexec/logs/catalina.${dateString}.log`;
    } else if (type === 'manual' && installPath) {
      // For manual installs, construct the log path based on user input and date
      logPath = (installPath.endsWith('/') ? installPath : installPath + '/') + `logs/catalina.${dateString}.log`;
    } else {
      alert('Please provide a valid Tomcat install path.');
      return;
    }

    window.api.openLogWindow(logPath);
  }

  async refreshWebapps() {
    const installLocation = document.getElementById('installLocation');
    const installType = document.getElementById('installType');
    const webappSelect = document.getElementById('webappSelect');
    const launchBtn = document.getElementById('launchWebappBtn');

    const path = installLocation.value.trim();
    const type = installType.value.trim().toLowerCase();

    try {
      const webapps = await window.api.scanWebapps(path, type);
      
      // Clear existing options except the default ones
      webappSelect.innerHTML = `
        <option value="ALL" selected>All</option>
        <option value="ROOT">ROOT</option>
      `;
      
      // Add discovered webapps
      webapps.forEach(webapp => {
        const option = document.createElement('option');
        option.value = webapp;
        option.textContent = webapp;
        webappSelect.appendChild(option);
      });
      
      // Enable the dropdown and update button state
      webappSelect.disabled = false;
      launchBtn.disabled = webappSelect.value === '';
      
    } catch (error) {
      console.error('Error refreshing webapps:', error);
      // Disable dropdown and button on error
      webappSelect.disabled = true;
      launchBtn.disabled = true;
    }
  }

  async launchWebapp() {
    const installLocation = document.getElementById('installLocation');
    const installType = document.getElementById('installType');
    const tomcatPort = document.getElementById('tomcatPort');
    const webappSelect = document.getElementById('webappSelect');

    const path = installLocation.value.trim();
    const type = installType.value.trim().toLowerCase();
    const port = tomcatPort.value.trim();
    const selectedWebapp = webappSelect.value;

    if (!selectedWebapp) {
      alert('Please select a webapp to launch');
      return;
    }

    try {
      const launchAll = selectedWebapp === 'ALL';
      const webapp = launchAll ? null : selectedWebapp;
      
      const result = await window.api.launchWebapp(webapp, port, launchAll, path, type);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error launching webapp:', error);
      alert(`Failed to launch webapp: ${error.message}`);
    }
  }
}

// Export for use in main app
window.TomcatController = TomcatController;
