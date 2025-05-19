// main-process/adhan-scheduler.js
const { playAdhanViaVLC } = require('./adhan-vlc-player');
// REMOVE: const appLifecycle = require('./app-lifecycle');
const { DEFAULT_ADHAN_ABSOLUTE_PATH } = require('./config');

let adhanSchedulerInterval = null;
let todaysPrayerTimesData = null;
let playedAdhansToday = new Set();
let internalGetMainWindow = null; // To store the passed function

// MODIFIED: startAdhanScheduler now accepts getMainWindowFn
function startAdhanScheduler(yearlyData, getMainWindowFn) {
    if (adhanSchedulerInterval) {
        clearInterval(adhanSchedulerInterval);
        console.log("Scheduler: Cleared existing interval.");
    }
    if (!yearlyData) {
        console.log("Scheduler: Cannot start, yearly prayer data not provided.");
        return;
    }
    if (typeof getMainWindowFn !== 'function') {
        console.error("Scheduler: Cannot start, getMainWindow function not provided.");
        return;
    }

    internalGetMainWindow = getMainWindowFn; // Store the function

    console.log("Scheduler: Started. Checking times every 30 seconds.");
    loadTodaysData(yearlyData);

    adhanSchedulerInterval = setInterval(() => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        if (currentHour === 0 && currentMinute === 0 && (playedAdhansToday.size > 0 || !todaysPrayerTimesData)) {
            console.log("Scheduler: New day detected, reloading today's prayer times and resetting played Adhans.");
            loadTodaysData(yearlyData);
        }

        if (!todaysPrayerTimesData) {
            return;
        }

        const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        for (const prayerName of prayerOrder) {
            const prayerTimeString = todaysPrayerTimesData[prayerName];
            let adhanFileToPlay = todaysPrayerTimesData[`${prayerName}Adhan`];

            if (!adhanFileToPlay) {
                adhanFileToPlay = DEFAULT_ADHAN_ABSOLUTE_PATH;
            }

            if (prayerTimeString && adhanFileToPlay && !playedAdhansToday.has(prayerName)) {
                const [prayerHour, prayerMinute] = prayerTimeString.split(':').map(Number);

                if (currentHour === prayerHour && currentMinute === prayerMinute) {
                    console.log(`SCHEDULER: It's time for ${prayerName} Adhan! (${currentHour}:${currentMinute})`);
                    playAdhanViaVLC(adhanFileToPlay, prayerName);
                    playedAdhansToday.add(prayerName);
                    
                    const mainWindow = internalGetMainWindow(); // Use the stored function
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('adhan-playing-status', { prayerName, playing: true });
                    }
                    break;
                }
            }
        }
    }, 30 * 1000);
}

function loadTodaysData(yearlyData) {
    if (!yearlyData) {
        todaysPrayerTimesData = null;
        console.log("Scheduler: Failed to load today's data - yearlyData is null.");
        return;
    }
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    todaysPrayerTimesData = yearlyData[dateKey] || null;
    playedAdhansToday.clear();

    if (todaysPrayerTimesData) {
        console.log(`Scheduler: Loaded data for today (${dateKey}):`, todaysPrayerTimesData);
        ['FajrAdhan', 'DhuhrAdhan', 'AsrAdhan', 'MaghribAdhan', 'IshaAdhan'].forEach(adhanKey => {
            if (!todaysPrayerTimesData[adhanKey]) {
                todaysPrayerTimesData[adhanKey] = DEFAULT_ADHAN_ABSOLUTE_PATH;
            }
        });
    } else {
        console.log(`Scheduler: No data found for today (${dateKey}). Scheduler might not function correctly for today.`);
    }
}

function clearAdhanScheduler() {
    if (adhanSchedulerInterval) {
        clearInterval(adhanSchedulerInterval);
        adhanSchedulerInterval = null;
        console.log("Scheduler: Interval cleared.");
    }
    todaysPrayerTimesData = null;
    playedAdhansToday.clear();
    internalGetMainWindow = null; // Clear the stored function
}

function updateSchedulerYearlyData(newYearlyData) {
    if (adhanSchedulerInterval) { 
        loadTodaysData(newYearlyData);
    }
}

module.exports = {
    startAdhanScheduler,
    clearAdhanScheduler,
    updateSchedulerYearlyData
};