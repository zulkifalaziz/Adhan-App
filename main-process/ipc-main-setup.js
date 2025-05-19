// main-process/ipc-main-setup.js
const { initializeNavigationHandlers } = require('./ipc-navigation-handlers');
const { initializeDataHandlers } = require('./ipc-data-handlers');
const { initializeSettingsHandlers } = require('./ipc-settings-handlers');

// Shared state that might be needed across different IPC handler groups
const sharedMainProcessState = {
    currentCity: '',
    currentCountry: '',
    lastFetchedYearlyData: null,
};

function initializeAllIpcHandlers() {
    console.log("MainSetup: Initializing all IPC handlers...");
    // Pass the shared state object to each handler initializer
    initializeNavigationHandlers(sharedMainProcessState);
    initializeDataHandlers(sharedMainProcessState);
    initializeSettingsHandlers(sharedMainProcessState);
    console.log("MainSetup: All IPC handlers initialized.");
}

module.exports = { initializeAllIpcHandlers };