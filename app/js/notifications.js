const path = require('path');
const { Notification } = require('electron');
const { loadConfig } = require('./config');

// Notification helper
function showNotification(title, body) {
  const config = loadConfig();
  if (config.notifications && Notification.isSupported()) {
    new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, '..', 'public', 'images', 'TomKit-icon.png')
    }).show();
  }
}

module.exports = {
  showNotification
};
