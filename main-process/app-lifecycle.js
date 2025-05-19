// main-process/app-lifecycle.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { ensureDirectoriesExist } = require('./utils');
const { clearAdhanScheduler } = require('./adhan-scheduler');

let mainWindow;

// MODIFIED: Default htmlFile is now 'dashboard.html'
function createMainWindow(htmlFile = 'dashboard.html') {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Ensure htmlFile path is absolute from app root
  const absoluteHtmlPath = path.join(app.getAppPath(), htmlFile);
  console.log(`AppLifecycle: Loading HTML file: ${absoluteHtmlPath}`);
  mainWindow.loadFile(absoluteHtmlPath);
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  return mainWindow;
}

function getMainWindow() {
    return mainWindow;
}

function initializeAppLifecycle() {
  app.whenReady().then(() => {
    ensureDirectoriesExist();
    console.log("AppLifecycle: App ready.");
    createMainWindow(); // This will now load dashboard.html by default

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', function () {
    clearAdhanScheduler(); // Ensure scheduler is stopped
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

module.exports = {
  initializeAppLifecycle,
  createMainWindow,
  getMainWindow
};