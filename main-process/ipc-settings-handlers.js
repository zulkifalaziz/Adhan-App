// main-process/ipc-settings-handlers.js
const { ipcMain, dialog } = require('electron');
const path = require('path');
const { getMainWindow } = require('./app-lifecycle');
const { PRAYER_TIMES_BASE_DIR } = require('./config'); // Only need PRAYER_TIMES_BASE_DIR
const prayerDataHandler = require('./prayer-data-handler');
const adhanScheduler = require('./adhan-scheduler');

// These will be set by the main IPC setup module
let sharedState = {
    lastFetchedYearlyData: null,
    currentCity: '',
    currentCountry: ''
};

function initializeSettingsHandlers(state) {
    sharedState = state; // Link to the shared state

    ipcMain.handle('dialog:openFile', async (event, prayerName) => {
        const mainWindow = getMainWindow();
        if (!mainWindow) { console.error("SettingsHandler: Cannot open dialog, mainWindow missing."); return null; }
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: `Select Adhan for ${prayerName}`, properties: ['openFile'],
            filters: [{ name: 'Audio Files', extensions: ['mp3'] }]
        });
        if (canceled || filePaths.length === 0) return null;
        return filePaths[0];
    });

    ipcMain.on('update-specific-prayer-adhan', (event, { city, country, prayerName, adhanFilePath }) => {
        console.log(`SettingsHandler: update-specific-prayer-adhan for ${prayerName} in ${city}, ${country}. Path: ${adhanFilePath}`);
        if (!sharedState.lastFetchedYearlyData || !city || !country) {
            event.sender.send('adhan-auto-save-status', { prayerName, success: false, message: "Error: Yearly data not loaded." });
            return;
        }
        // Ensure we are updating the correct city/country data if multiple could be in memory (though current design uses one active)
        if (city.toLowerCase() !== sharedState.currentCity.toLowerCase() || country.toLowerCase() !== sharedState.currentCountry.toLowerCase()) {
            console.warn(`SettingsHandler: Attempt to update Adhan for ${city}, ${country} but current loaded data is for ${sharedState.currentCity}, ${sharedState.currentCountry}. This might indicate stale data or a logic issue.`);
            // For now, we'll proceed to update based on the provided city/country, which implies loading its file.
        }

        const lowerCity = city.toLowerCase().replace(/\s+/g, '_');
        const lowerCountry = country.toLowerCase().replace(/\s+/g, '_');
        const filename = `${lowerCity}_${lowerCountry}.json`;
        const filePath = path.join(PRAYER_TIMES_BASE_DIR, filename);
        
        // It's safer to re-load the data file for this specific city/country to avoid operating on stale in-memory data
        // if the request is for a city/country different from what's in lastFetchedYearlyData.
        // However, the current flow ensures lastFetchedYearlyData is for currentCity/Country.
        let targetYearlyData = sharedState.lastFetchedYearlyData;

        // If the request is for a different city/country than currently loaded, load its specific file
        // This case shouldn't happen with current UI flow but good for robustness
        if (city.toLowerCase() !== sharedState.currentCity.toLowerCase() || country.toLowerCase() !== sharedState.currentCountry.toLowerCase()) {
            console.log(`SettingsHandler: Loading specific file ${filePath} for Adhan update as it differs from current in-memory data.`);
            targetYearlyData = prayerDataHandler.loadPrayerTimesFromFile(filePath);
            if (!targetYearlyData) {
                 event.sender.send('adhan-auto-save-status', { prayerName, success: false, message: `Error: Could not load data file for ${city}, ${country}.` });
                return;
            }
        }


        const adhanKey = `${prayerName}Adhan`;
        for (const dateKey in targetYearlyData) {
            if (targetYearlyData.hasOwnProperty(dateKey) && targetYearlyData[dateKey]) {
                targetYearlyData[dateKey][adhanKey] = adhanFilePath;
            }
        }
        try {
            prayerDataHandler.savePrayerTimesToJSONFile(targetYearlyData, filePath);
            // If we updated the currently active data, ensure our in-memory cache is also updated.
            if (city.toLowerCase() === sharedState.currentCity.toLowerCase() && country.toLowerCase() === sharedState.currentCountry.toLowerCase()) {
                sharedState.lastFetchedYearlyData = targetYearlyData;
            }
            event.sender.send('adhan-auto-save-status', { prayerName, success: true, message: `${prayerName} Adhan auto-saved.` });
        } catch (error) {
            event.sender.send('adhan-auto-save-status', { prayerName, success: false, message: `Error saving ${prayerName} Adhan: ${error.message}` });
        }
    });

    ipcMain.handle('update-prayer-time-for-day', async (event, { city, country, dateKey, prayerName, newTime }) => {
        console.log(`SettingsHandler: update-prayer-time for ${prayerName} in ${city}, ${country} on ${dateKey} to ${newTime}`);
        if (!city || !country || !dateKey || !prayerName || !newTime) return { success: false, message: "Invalid data." };
        
        const lowerCity = city.toLowerCase().replace(/\s+/g, '_');
        const lowerCountry = country.toLowerCase().replace(/\s+/g, '_');
        const filename = `${lowerCity}_${lowerCountry}.json`;
        const filePath = path.join(PRAYER_TIMES_BASE_DIR, filename);

        try {
            let yearlyData = prayerDataHandler.loadPrayerTimesFromFile(filePath); // Always load fresh for edits
            if (!yearlyData) return { success: false, message: `Could not load ${filename}.` };

            if (yearlyData[dateKey] && yearlyData[dateKey].hasOwnProperty(prayerName)) {
                yearlyData[dateKey][prayerName] = newTime;
                prayerDataHandler.savePrayerTimesToJSONFile(yearlyData, filePath);
                
                if (city === sharedState.currentCity && country === sharedState.currentCountry) {
                    sharedState.lastFetchedYearlyData = yearlyData;
                    const today = new Date();
                    const todayDateKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                    if (dateKey === todayDateKey && adhanScheduler) {
                        adhanScheduler.startAdhanScheduler(sharedState.lastFetchedYearlyData, getMainWindow);
                    }
                }
                return { success: true, message: `${prayerName} time on ${dateKey} updated.` };
            }
            return { success: false, message: `Could not find ${prayerName} for ${dateKey}.` };
        } catch (error) { return { success: false, message: `Error: ${error.message}` }; }
    });
}
module.exports = { initializeSettingsHandlers };