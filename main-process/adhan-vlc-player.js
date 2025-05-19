// main-process/adhan-vlc-player.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { app } = require('electron'); // To get app path for default adhan
const { VLC_PATH, DEFAULT_ADHAN_ABSOLUTE_PATH } = require('./config');

// This module will only contain the playback function.
// The scheduler will be a separate entity that calls this.

function playAdhanViaVLC(adhanAudioFile, prayerNameForLog = "Adhan") {
    console.log(`VLC: Attempting to play Adhan for ${prayerNameForLog} from: ${adhanAudioFile}`);

    let resolvedAdhanFilePath = adhanAudioFile;

    // If the provided path is relative (e.g. our old default "assets/audios/azan1.mp3")
    // or if we need to ensure it's absolute for packaged default.
    // However, since DEFAULT_ADHAN_ABSOLUTE_PATH is already absolute, this check is more for robustness.
    // And custom selected paths from dialog are also absolute.
    // The main check is fs.existsSync.

    if (!fs.existsSync(resolvedAdhanFilePath)) {
        console.error(`VLC: Adhan audio file not found: ${resolvedAdhanFilePath}.`);
        // Fallback to the hardcoded absolute default if the provided path fails.
        if (resolvedAdhanFilePath !== DEFAULT_ADHAN_ABSOLUTE_PATH && fs.existsSync(DEFAULT_ADHAN_ABSOLUTE_PATH)) {
            console.warn(`VLC: Falling back to ultimate default Adhan: ${DEFAULT_ADHAN_ABSOLUTE_PATH}`);
            resolvedAdhanFilePath = DEFAULT_ADHAN_ABSOLUTE_PATH;
        } else {
            console.error(`VLC: Ultimate default Adhan also not found or was the one missing. Cannot play: ${DEFAULT_ADHAN_ABSOLUTE_PATH}`);
            return; // Cannot play
        }
    }

    if (!fs.existsSync(VLC_PATH)) {
        console.error(`VLC: Executable not found at: ${VLC_PATH}. Cannot play Adhan.`);
        // In a real app, notify the user to configure VLC path
        return;
    }

    const vlcArgs = [
        '--intf', 'dummy',
        '--play-and-exit',
        '--no-video',
        // '--quiet', // Remove for debugging VLC issues if necessary
        resolvedAdhanFilePath
    ];

    console.log('VLC: Spawning process -', VLC_PATH, vlcArgs.join(' '));
    try {
        const vlcProcess = spawn(VLC_PATH, vlcArgs, { stdio: 'ignore', detached: false });

        vlcProcess.on('error', (err) => {
            console.error(`VLC: Failed to start process for ${prayerNameForLog}:`, err);
            // Potentially send error to renderer if playback fails
        });

        vlcProcess.on('close', (code) => {
            console.log(`VLC: Process for ${prayerNameForLog} exited with code ${code}.`);
            // Optional: Send 'adhan-playing-status' { playing: false } to renderer
        });
    } catch (spawnError) {
         console.error(`VLC: Error trying to spawn VLC process for ${prayerNameForLog}:`, spawnError);
    }
}

module.exports = {
    playAdhanViaVLC
};