// Main application initialization and coordination
class TomKitApp {
  constructor() {
    this.configManager = null;
    this.tomcatController = null;
    this.settingsManager = null;
    this.shortcutManager = null;
  }

  async initialize() {
    // Initialize configuration manager
    this.configManager = new ConfigManager();
    await this.configManager.loadConfiguration();

    // Initialize Tomcat controller
    this.tomcatController = new TomcatController(this.configManager);

    // Refresh webapps list after configuration is loaded
    setTimeout(() => this.tomcatController.refreshWebapps(), 100);

    // Initialize settings manager
    this.settingsManager = new SettingsManager(this.configManager);

    // Initialize shortcut manager
    this.shortcutManager = new ShortcutManager(this.tomcatController);

    // Setup basic event listeners
    Utils.setupBasicEventListeners(this.configManager);

    // Load app version
    Utils.loadAppVersion();

    console.log('TomKit application initialized successfully');
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new TomKitApp();
  await app.initialize();
});
