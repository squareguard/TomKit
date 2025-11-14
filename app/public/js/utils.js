// Keyboard shortcuts and utility functions module
class ShortcutManager {
  constructor(tomcatController) {
    this.tomcatController = tomcatController;
    this.setupShortcutListeners();
  }

  setupShortcutListeners() {
    // Set up shortcut event listeners
    window.api.onShortcutStartTomcat(() => {
      this.showShortcutIndicator('Starting Tomcat...');
      document.getElementById('btnStart').click();
    });

    window.api.onShortcutStopTomcat(() => {
      this.showShortcutIndicator('Stopping Tomcat...');
      document.getElementById('btnStop').click();
    });

    window.api.onShortcutToggleLog(() => {
      this.showShortcutIndicator('Opening logs...');
      document.getElementById('openLog').click();
    });
  }

  // Function to show brief shortcut indicator
  showShortcutIndicator(message) {
    // Remove any existing indicator
    const existingIndicator = document.querySelector('.shortcut-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create and show new indicator
    const indicator = document.createElement('div');
    indicator.className = 'shortcut-indicator';
    indicator.textContent = message;
    document.body.appendChild(indicator);

    // Remove after 2 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 2000);
  }
}

// Utility functions
class Utils {
  static async loadAppVersion() {
    try {
      const version = await window.api.getAppVersion();
      const versionElement = document.getElementById('version');
      versionElement.textContent = `v${version}`;
    } catch (error) {
      console.error('Failed to load version:', error);
      const versionElement = document.getElementById('version');
      versionElement.textContent = 'v0.0.0';
    }
  }

  static setupBasicEventListeners(configManager) {
    const installType = document.getElementById('installType');
    const installLocation = document.getElementById('installLocation');
    const tomcatPort = document.getElementById('tomcatPort');
    const minimizeButton = document.getElementById('minimizeButton');
    const quitButton = document.getElementById('quitButton');

    // Enable/disable install location based on install type selection
    installType.addEventListener('change', () => {
      if (installType.value === 'homebrew') {
        installLocation.disabled = true;
        installLocation.value = '';
      } else {
        installLocation.disabled = false;
      }
      configManager.saveConfiguration();
    });

    // Save configuration when install location changes
    installLocation.addEventListener('input', () => {
      configManager.saveConfiguration();
    });

    // Save configuration when port changes
    tomcatPort.addEventListener('input', () => {
      configManager.saveConfiguration();
    });

    // Minimize button functionality
    minimizeButton.addEventListener('click', () => {
      window.api.minimizeWindow();
    });

    // Quit button handler
    quitButton.addEventListener('click', () => {
      window.api.quitApp();
    });
  }
}

// Export for use in main app
window.ShortcutManager = ShortcutManager;
window.Utils = Utils;
