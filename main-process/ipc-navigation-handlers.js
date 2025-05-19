// main-process/ipc-navigation-handlers.js
const { ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { getMainWindow } = require('./app-lifecycle');
const adhanScheduler = require('./adhan-scheduler');
const { PRAYER_TIMES_BASE_DIR, HOME_LOCATION_FILE } = require('./config');
const prayerDataHandler = require('./prayer-data-handler');

// This state object will be populated by ipc-main-setup.js
let sharedState = {
    lastFetchedYearlyData: null,
    currentCity: '',
    currentCountry: ''
};

function initializeNavigationHandlers(passedInSharedState) {
    sharedState = passedInSharedState;

    ipcMain.on('navigate-to-times-page', () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.loadFile(path.join(app.getAppPath(), 'times.html'))
                .then(() => console.log("NavHandler: Navigated to times.html"))
                .catch(err => console.error("NavHandler: Failed to load times.html", err));
        } else {
            console.error("NavHandler: Cannot navigate to times.html, mainWindow not available.");
        }
    });

    ipcMain.on('navigate-to-index', () => {
        adhanScheduler.clearAdhanScheduler();
        sharedState.lastFetchedYearlyData = null;
        sharedState.currentCity = '';
        sharedState.currentCountry = '';
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'))
                .then(() => console.log("NavHandler: Navigated to index.html (search page)"))
                .catch(err => console.error("NavHandler: Failed to load index.html", err));
        } else {
            console.error("NavHandler: Cannot navigate to index.html, mainWindow not available.");
        }
    });

    ipcMain.on('navigate-to-search-page', () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'))
                .then(() => console.log("NavHandler: Navigated from Dashboard to index.html (search page)"))
                .catch(err => console.error("NavHandler: Failed to load index.html from dashboard", err));
        } else {
            console.error("NavHandler: Cannot navigate to search page from dashboard, mainWindow not available.");
        }
    });

    ipcMain.on('navigate-to-dashboard', () => {
        adhanScheduler.clearAdhanScheduler();
        sharedState.lastFetchedYearlyData = null;
        sharedState.currentCity = '';
        sharedState.currentCountry = '';
        const mainWindow = getMainWindow();
        if (mainWindow) {
            mainWindow.loadFile(path.join(app.getAppPath(), 'dashboard.html'))
                .then(() => console.log("NavHandler: Navigated to dashboard.html"))
                .catch(err => console.error("NavHandler: Failed to load dashboard.html", err));
        } else {
            console.error("NavHandler: Cannot navigate to dashboard, mainWindow not available.");
        }
    });

    // Handler for navigating to Home City's Prayer Times (used by inactivity timers)
    ipcMain.on('navigate-to-home-city-times', async () => {
        console.log("NavHandler: Received request to navigate to home city times (e.g., from inactivity).");
        const mainWindow = getMainWindow();
        if (!mainWindow) {
            console.error("NavHandler: Cannot navigate to home city times, mainWindow not available.");
            return;
        }

        const homeLocationFilePath = HOME_LOCATION_FILE();
        let homeCityCountry;
        try {
            if (fs.existsSync(homeLocationFilePath)) {
                const data = fs.readFileSync(homeLocationFilePath, 'utf-8');
                homeCityCountry = JSON.parse(data);
            }
        } catch (error) {
            console.error('NavHandler: Failed to load home_location.json for inactivity navigation:', error);
        }

        if (homeCityCountry && homeCityCountry.city && homeCityCountry.country) {
            console.log(`NavHandler: Home location found: ${homeCityCountry.city}, ${homeCityCountry.country}. Loading its data.`);
            // Update the shared state to the home city/country
            sharedState.currentCity = homeCityCountry.city;
            sharedState.currentCountry = homeCityCountry.country;

            const lowerCity = sharedState.currentCity.toLowerCase().replace(/\s+/g, '_');
            const lowerCountry = sharedState.currentCountry.toLowerCase().replace(/\s+/g, '_');
            const filename = `${lowerCity}_${lowerCountry}.json`;
            const filePath = path.join(PRAYER_TIMES_BASE_DIR, filename);

            const loadedData = prayerDataHandler.loadPrayerTimesFromFile(filePath);
            if (loadedData) {
                sharedState.lastFetchedYearlyData = loadedData; // Update shared state with home city's data
                console.log(`NavHandler: Successfully loaded data for home city ${sharedState.currentCity}. Starting scheduler and navigating.`);
                adhanScheduler.startAdhanScheduler(sharedState.lastFetchedYearlyData, getMainWindow);
                
                // Navigate to times.html. times_renderer.js will call requestPrayerTimesForDate()
                // which will now use the updated currentCity/Country and serve today's data for the home location.
                mainWindow.loadFile(path.join(app.getAppPath(), 'times.html'))
                    .catch(err => console.error("NavHandler: Error navigating to times.html for home city", err));
            } else {
                console.error(`NavHandler: Failed to load prayer time file for home city: ${filename}. Navigating to search page instead.`);
                mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'))
                    .catch(err => console.error("NavHandler: Error navigating to index.html (fallback for missing home data)", err));
            }
        } else {
            console.log("NavHandler: No home city/country set. Cannot navigate automatically. Navigating to search page.");
            mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'))
                 .catch(err => console.error("NavHandler: Error navigating to index.html (fallback for no home city)", err));
        }
    });
}

module.exports = { initializeNavigationHandlers };