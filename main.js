// main.js (Project Root)
const { app } = require('electron');

// Correct paths to your refactored modules, assuming main.js is at the project root
// and the refactored files are in a 'main-process' subdirectory.
const { initializeAppLifecycle, getMainWindow } = require('./main-process/app-lifecycle');
const { initializeAllIpcHandlers } = require('./main-process/ipc-main-setup');

// Prevent multiple instances of the app from running
// This is a standard Electron pattern to ensure only one instance of your app runs.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If an instance is already running, requestSingleInstanceLock returns false.
  // In this case, we quit the current (second) instance.
  console.log("Main: Another instance is already running. Quitting this new instance.");
  app.quit();
} else {
  // This event is emitted on the primary instance when a second instance is launched.
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log("Main: Second instance detected. Attempting to focus the primary window.");
    // Someone tried to run a second instance; we should focus our existing window.
    const mainWindow = getMainWindow(); // Get the main window from the first (primary) instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore(); // Restore if minimized
      }
      mainWindow.focus(); // Bring to front
    }
  });

  // Initialize application lifecycle handlers (app.whenReady, window-all-closed, activate etc.)
  // This function, defined in app-lifecycle.js, will also handle creating the initial browser window.
  try {
    initializeAppLifecycle();
    console.log("Main: App lifecycle initialized.");
  } catch (error) {
    console.error("Main: CRITICAL - Failed to initialize app lifecycle:", error);
    // If core lifecycle setup fails, the app likely can't run.
    app.quit();
    return; // Stop further execution in this script
  }


  // Initialize all IPC handlers.
  // This function, defined in ipc-main-setup.js, will in turn call initialization
  // functions from ipc-navigation-handlers.js, ipc-data-handlers.js, and ipc-settings-handlers.js.
  try {
    initializeAllIpcHandlers();
    console.log("Main: All IPC Handlers initialized successfully.");
  } catch (error) {
    console.error("Main: CRITICAL - Failed to initialize IPC handlers:", error);
    // Depending on the app, failure to set up IPC might be critical.
    // Consider if app.quit() is necessary here.
  }


  // This block is for handling Squirrel Windows installer events (e.g., creating/removing shortcuts).
  // It's only relevant if you package your app for Windows using Squirrel.
  // It requires the 'electron-squirrel-startup' module to be installed.
  // If you are not using Squirrel.Windows or if this module is not installed,
  // this will cause an error. Comment out if not needed or if it causes issues during development.
  /*
  if (require('electron-squirrel-startup')) {
    console.log("Main: Squirrel Windows startup event detected. Quitting app as per electron-squirrel-startup.");
    app.quit();
  }
  */

  // Global error handlers for the main process. These are very important for debugging.
  process.on('uncaughtException', (error, origin) => {
      console.error(`!!!!!!!!!!!! UNCAUGHT EXCEPTION IN MAIN PROCESS !!!!!!!!!!!!`);
      console.error(`Error Name: ${error.name}`);
      console.error(`Error Message: ${error.message}`);
      console.error(`Error Stack: ${error.stack || 'No stack available'}`);
      console.error(`Origin: ${origin}`);
      // In a production app, you might want to:
      // - Log this to a persistent file.
      // - Send an error report to a service.
      // - Show a user-friendly error dialog before quitting.
      // For now, logging to console is essential.
      // Example: dialog.showErrorBox('Critical Main Process Error', `A critical error occurred: ${error.message}\nThe application may become unstable and will now attempt to close.`);
      // app.quit(); // Decide if the app should always quit on any uncaught exception.
  });

  process.on('unhandledRejection', (reason, promise) => {
      console.error('!!!!!!!!!!!! UNHANDLED PROMISE REJECTION IN MAIN PROCESS !!!!!!!!!!!!');
      if (reason instanceof Error) {
          console.error(`Reason Name: ${reason.name}`);
          console.error(`Reason Message: ${reason.message}`);
          console.error(`Reason Stack: ${reason.stack || 'No stack available'}`);
      } else {
          console.error('Reason:', reason);
      }
      // console.error('Promise Object:', promise); // The promise object can be large and complex.
      // Similar to uncaughtException, consider logging and graceful exit.
  });

  console.log("Main: Root main.js script execution finished all setup tasks.");
}