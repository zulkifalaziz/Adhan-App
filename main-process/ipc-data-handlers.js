// main-process/ipc-data-handlers.js
const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { getMainWindow } = require('./app-lifecycle');
const { PRAYER_TIMES_BASE_DIR, DEFAULT_ADHAN_ABSOLUTE_PATH, HOME_LOCATION_FILE } = require('./config');
const prayerDataHandler = require('./prayer-data-handler');
const adhanScheduler = require('./adhan-scheduler');

// These will be set by the main IPC setup module
let sharedState = {
    lastFetchedYearlyData: null,
    currentCity: '',
    currentCountry: ''
};

function initializeDataHandlers(state) {
    sharedState = state; // Link to the shared state

    ipcMain.on('fetch-prayer-times', async (event, city, country) => {
        console.log(`DataHandler: Received fetch-prayer-times for ${city}, ${country}`);
        sharedState.currentCity = city;
        sharedState.currentCountry = country;
        try {
            const lowerCity = city.toLowerCase().replace(/\s+/g, '_');
            const lowerCountry = country.toLowerCase().replace(/\s+/g, '_');
            const filename = `${lowerCity}_${lowerCountry}.json`;
            const filePath = path.join(PRAYER_TIMES_BASE_DIR, filename);
            let dataLoadedSuccessfully = false;
            const loadedData = prayerDataHandler.loadPrayerTimesFromFile(filePath);

            if (loadedData) {
                sharedState.lastFetchedYearlyData = loadedData;
                dataLoadedSuccessfully = true;
                event.reply('prayer-times-response', { type: 'fetch-complete', success: true, message: `Prayer times for ${city}, ${country} already exist. Data loaded.`, dataExists: true, navigateToTimes: true });
            } else {
                event.reply('prayer-times-response', { type: 'fetch-started' });
                const rawPrayerData = await prayerDataHandler.getYearlyPrayerTimesFromAPI(city, country, (progress) => { event.reply('prayer-times-response', { type: 'progress', progress: progress }); });
                sharedState.lastFetchedYearlyData = prayerDataHandler.transformApiDataForJSON(rawPrayerData);
                prayerDataHandler.savePrayerTimesToJSONFile(sharedState.lastFetchedYearlyData, filePath);
                dataLoadedSuccessfully = true;
                event.reply('prayer-times-response', { type: 'fetch-complete', success: true, message: `Prayer times saved to ${path.join('assets', 'Prayer times', filename)}. Data loaded.`, dataExists: false, navigateToTimes: true });
            }

            if (dataLoadedSuccessfully && sharedState.lastFetchedYearlyData) {
                adhanScheduler.startAdhanScheduler(sharedState.lastFetchedYearlyData, getMainWindow);
            }
        } catch (error) {
            console.error("DataHandler: Error in 'fetch-prayer-times' handler:", error);
            let userMessage = `Error: ${error.message}`;
            if (error.isNetworkError) userMessage = "Failed to connect. Check internet.";
            else if (error.message?.startsWith('API request failed')) userMessage = `Failed to retrieve: ${error.message}`;
            event.reply('prayer-times-response', { type: 'fetch-complete', success: false, message: userMessage });
        }
    });

    ipcMain.on('request-prayer-times-for-date', (event, dateKey = null) => {
        console.log(`DataHandler: Received request-prayer-times-for-date. Requested dateKey: ${dateKey}`);
        if (sharedState.lastFetchedYearlyData && sharedState.currentCity && sharedState.currentCountry) {
            let targetDateKey = dateKey;
            let targetDate = new Date();
            if (targetDateKey) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDateKey)) { event.sender.send('show-prayer-times-data', { error: "Invalid date format requested." }); return; }
                const [year, month, day] = targetDateKey.split('-').map(Number);
                targetDate = new Date(year, month - 1, day);
                if (isNaN(targetDate.getTime())) { event.sender.send('show-prayer-times-data', { error: "Invalid date requested." }); return; }
            } else {
                targetDateKey = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`;
            }
            let dayDataForDisplay = sharedState.lastFetchedYearlyData[targetDateKey];
            if (dayDataForDisplay) {
                ['FajrAdhan', 'DhuhrAdhan', 'AsrAdhan', 'MaghribAdhan', 'IshaAdhan'].forEach(adhanKey => {
                    if (!dayDataForDisplay.hasOwnProperty(adhanKey) || dayDataForDisplay[adhanKey] === null || dayDataForDisplay[adhanKey] === undefined) {
                        dayDataForDisplay[adhanKey] = DEFAULT_ADHAN_ABSOLUTE_PATH;
                    }
                });
            } else {
                dayDataForDisplay = { Fajr: "N/A", Dhuhr: "N/A", Asr: "N/A", Maghrib: "N/A", Isha: "N/A", FajrAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH, DhuhrAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH, AsrAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH, MaghribAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH, IshaAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH, readableDate: "Date Not Available", hijri: "N/A" };
            }
            const fullDate = targetDate.toLocaleDateString(app.getLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            event.sender.send('show-prayer-times-data', { dayData: dayDataForDisplay, fullDate, city: sharedState.currentCity, country: sharedState.currentCountry });
        } else {
            event.sender.send('show-prayer-times-data', { error: "No prayer time data available." });
        }
    });

    ipcMain.handle('list-saved-files', async () => {
        try {
            if (!fs.existsSync(PRAYER_TIMES_BASE_DIR)) return [];
            const files = fs.readdirSync(PRAYER_TIMES_BASE_DIR);
            return files.filter(file => file.endsWith('.json')).map(file => {
                const nameParts = file.replace('.json', '').split('_');
                let city = nameParts.length > 0 ? nameParts.slice(0, -1).join(' ') : 'Unknown';
                let country = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Unknown';
                city = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                country = country.charAt(0).toUpperCase() + country.slice(1);
                return { city, country, filename: file };
            });
        } catch (error) { console.error("DataHandler: Error listing files:", error); return []; }
    });

    ipcMain.on('load-and-navigate', (event, { city, country, filename }) => {
        sharedState.currentCity = city; sharedState.currentCountry = country;
        const filePath = path.join(PRAYER_TIMES_BASE_DIR, filename);
        const loadedData = prayerDataHandler.loadPrayerTimesFromFile(filePath);
        if (loadedData) {
            sharedState.lastFetchedYearlyData = loadedData;
            adhanScheduler.startAdhanScheduler(sharedState.lastFetchedYearlyData, getMainWindow);
            const mainWindow = getMainWindow();
            if (mainWindow) mainWindow.loadFile(path.join(app.getAppPath(), 'times.html')).catch(err => console.error("DataHandler: Error navigating", err));
        } else { console.error(`DataHandler: Failed to load ${filename}.`); }
    });

    ipcMain.handle('delete-prayer-time-file', async (event, filename) => {
        if (!filename) return { success: false, message: "Invalid filename." };
        const filePath = path.join(PRAYER_TIMES_BASE_DIR, filename);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                const currentFilenameCheck = `${sharedState.currentCity.toLowerCase().replace(/\s+/g, '_')}_${sharedState.currentCountry.toLowerCase().replace(/\s+/g, '_')}.json`;
                if (filename === currentFilenameCheck) {
                    sharedState.lastFetchedYearlyData = null; sharedState.currentCity = ''; sharedState.currentCountry = '';
                    adhanScheduler.clearAdhanScheduler();
                }
                return { success: true, message: `File ${filename} deleted.` };
            }
            return { success: false, message: `File ${filename} not found.` };
        } catch (error) { console.error(`DataHandler: Error deleting ${filePath}:`, error); return { success: false, message: `Error: ${error.message}` }; }
    });

    ipcMain.handle('load-home-city-country', async () => {
        const homeFile = HOME_LOCATION_FILE();
        try {
            if (fs.existsSync(homeFile)) return JSON.parse(fs.readFileSync(homeFile, 'utf-8'));
            return null;
        } catch (error) { console.error('DataHandler: Error loading home location:', error); return null; }
    });

    ipcMain.handle('set-home-city-country', async (event, data) => {
        const homeFile = HOME_LOCATION_FILE();
        if (!data || !data.city || !data.country) return { success: false, message: "Invalid data." };
        try {
            const dir = path.dirname(homeFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(homeFile, JSON.stringify(data, null, 2));
            return { success: true, message: `Home set to ${data.city}, ${data.country}.` };
        } catch (error) { console.error('DataHandler: Error setting home:', error); return { success: false, message: `Error: ${error.message}` }; }
    });
}
module.exports = { initializeDataHandlers };