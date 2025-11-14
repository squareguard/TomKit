// Settings panel management module
class SettingsManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.settingsPanel = document.getElementById('settingsPanel');
    this.setupEventListeners();
  }

  setupEventListeners() {
    const settingsButton = document.getElementById('settingsButton');
    const closeSettings = document.getElementById('closeSettings');
    const themeSelect = document.getElementById('themeSelect');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const autoStartToggle = document.getElementById('autoStartToggle');
    const minimizeToTrayToggle = document.getElementById('minimizeToTrayToggle');
    const autoLaunchToggle = document.getElementById('autoLaunchToggle');

    // Settings panel toggle
    settingsButton.addEventListener('click', () => {
      this.settingsPanel.style.display = 'block';
    });

    closeSettings.addEventListener('click', () => {
      this.settingsPanel.style.display = 'none';
    });

    // Settings change handlers
    themeSelect.addEventListener('change', () => {
      this.configManager.applyTheme(themeSelect.value);
      this.configManager.saveConfiguration();
    });

    notificationsToggle.addEventListener('change', () => {
      this.configManager.saveConfiguration();
    });

    autoStartToggle.addEventListener('change', async () => {
      try {
        await window.api.setAutoStart(autoStartToggle.checked);
        this.configManager.saveConfiguration();
      } catch (error) {
        console.error('Failed to set auto-start:', error);
        // Revert the toggle if it failed
        autoStartToggle.checked = !autoStartToggle.checked;
      }
    });

    minimizeToTrayToggle.addEventListener('change', () => {
      this.configManager.saveConfiguration();
    });

    autoLaunchToggle.addEventListener('change', () => {
      this.configManager.saveConfiguration();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      // Close settings panel with Escape
      if (event.key === 'Escape' && this.settingsPanel.style.display === 'block') {
        this.settingsPanel.style.display = 'none';
      }
      
      // Toggle settings with Cmd/Ctrl + comma
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        if (this.settingsPanel.style.display === 'block') {
          this.settingsPanel.style.display = 'none';
        } else {
          this.settingsPanel.style.display = 'block';
        }
      }
    });
  }
}

// Export for use in main app
window.SettingsManager = SettingsManager;
