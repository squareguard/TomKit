// Configuration management module
class ConfigManager {
  constructor() {
    this.config = null;
    this.setupSystemThemeListener();
  }

  // Listen for system theme changes
  setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener(() => {
      // Only react to system theme changes if using 'auto' theme
      if (this.config && this.config.theme === 'auto') {
        this.applyTheme('auto');
      }
    });
  }

  // Load configuration and populate fields
  async loadConfiguration() {
    try {
      this.config = await window.api.loadConfig();
      this.populateFields();
      this.applyTheme(this.config.theme || 'dark');
      console.log('Configuration loaded:', this.config);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  populateFields() {
    const installType = document.getElementById('installType');
    const installLocation = document.getElementById('installLocation');
    const tomcatPort = document.getElementById('tomcatPort');
    const themeSelect = document.getElementById('themeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const autoStartToggle = document.getElementById('autoStartToggle');
    const minimizeToTrayToggle = document.getElementById('minimizeToTrayToggle');
    const autoLaunchToggle = document.getElementById('autoLaunchToggle');

    installType.value = this.config.installType || 'homebrew';
    installLocation.value = this.config.installLocation || '';
    tomcatPort.value = this.config.tomcatPort || '8080';
    
    // Load settings
    themeSelect.value = this.config.theme || 'dark';
    notificationsToggle.checked = this.config.notifications !== false;
    autoStartToggle.checked = this.config.autoStart === true;
    minimizeToTrayToggle.checked = this.config.minimizeToTray !== false;
    autoLaunchToggle.checked = this.config.autoLaunch === true;
    
    // Update install location field state based on install type
    if (installType.value === 'homebrew') {
      installLocation.disabled = true;
      installLocation.value = '';
    } else {
      installLocation.disabled = false;
    }
  }

  // Apply theme
  applyTheme(theme) {
    const body = document.body;
    const iconImg = document.querySelector('.title img');
    body.classList.remove('light-theme', 'dark-theme');
    
    let isDark = false;
    
    if (theme === 'light') {
      body.classList.add('light-theme');
      isDark = false;
    } else if (theme === 'dark') {
      body.classList.add('dark-theme');
      isDark = true;
    } else if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
      isDark = prefersDark;
    }
    
    // Update icon based on theme
    if (iconImg) {
      iconImg.src = isDark ? 'images/TomKit-icon-white.png' : 'images/TomKit-icon.png';
    }
  }

  // Save configuration
  async saveConfiguration() {
    try {
      const installType = document.getElementById('installType');
      const installLocation = document.getElementById('installLocation');
      const tomcatPort = document.getElementById('tomcatPort');
      const themeSelect = document.getElementById('themeSelect');
      const notificationsToggle = document.getElementById('notificationsToggle');
      const autoStartToggle = document.getElementById('autoStartToggle');
      const minimizeToTrayToggle = document.getElementById('minimizeToTrayToggle');
      const autoLaunchToggle = document.getElementById('autoLaunchToggle');

      const config = {
        installType: installType.value,
        installLocation: installLocation.value,
        tomcatPort: tomcatPort.value,
        theme: themeSelect.value,
        notifications: notificationsToggle.checked,
        autoStart: autoStartToggle.checked,
        minimizeToTray: minimizeToTrayToggle.checked,
        autoLaunch: autoLaunchToggle.checked
      };
      
      const result = await window.api.saveConfig(config);
      if (result.success) {
        console.log('Configuration saved successfully');
        this.config = config;
      } else {
        console.error('Failed to save configuration:', result.error);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }
}

// Export for use in main app
window.ConfigManager = ConfigManager;
