// main-process/utils.js
const fs = require('fs');
const path = require('path');
const { PRAYER_TIMES_BASE_DIR, ASSETS_DIR, getSettingsDir } = require('./config');

function ensureDirectoriesExist() {
    const settingsDir = getSettingsDir();
    if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
        console.log('Utils: Created settings directory:', settingsDir);
    }
    if (!fs.existsSync(PRAYER_TIMES_BASE_DIR)) {
        fs.mkdirSync(PRAYER_TIMES_BASE_DIR, { recursive: true });
        console.log('Utils: Created prayer times data directory:', PRAYER_TIMES_BASE_DIR);
    }
    if (!fs.existsSync(path.join(ASSETS_DIR, 'audios'))) {
        fs.mkdirSync(path.join(ASSETS_DIR, 'audios'), { recursive: true });
        console.log('Utils: Ensured assets/audios directory exists.');
    }
    if (!fs.existsSync(path.join(ASSETS_DIR, 'images'))) {
        fs.mkdirSync(path.join(ASSETS_DIR, 'images'), { recursive: true });
        console.log('Utils: Ensured assets/images directory exists.');
    }
}

module.exports = {
    ensureDirectoriesExist,
};