// main-process/config.js
const { app } = require('electron');
const path = require('path');

// --- VLC Configuration & Default Adhan Path ---
const VLC_PATH = 'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe';
const DEFAULT_ADHAN_ABSOLUTE_PATH = 'C:\\Users\\zulki\\Desktop\\Adhan App\\assets\\audios\\azan1.mp3';

// --- Paths for Data ---
const PRAYER_TIMES_BASE_DIR = path.join(app.getAppPath(), 'assets', 'Prayer times');
const ASSETS_DIR = path.join(app.getAppPath(), 'assets');

// Function to get user data path for settings, as app might not be ready at module load time
const getSettingsDir = () => path.join(app.getPath('userData'), 'AdhanAppSettings');

// NEW: Home Location File Path
const HOME_LOCATION_FILE = () => path.join(getSettingsDir(), 'home_location.json');


module.exports = {
    VLC_PATH,
    DEFAULT_ADHAN_ABSOLUTE_PATH,
    PRAYER_TIMES_BASE_DIR,
    ASSETS_DIR,
    getSettingsDir,
    HOME_LOCATION_FILE // Export new path function
};