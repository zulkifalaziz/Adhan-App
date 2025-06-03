jest.mock('../main-process/config.js', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'adhan-test-'));
  global.__tmpRoot = tmpRoot;
  global.__settingsDir = path.join(tmpRoot, 'settings');
  global.__prayerTimesDir = path.join(tmpRoot, 'prayer-times');
  global.__assetsDir = path.join(tmpRoot, 'assets');

  return {
    PRAYER_TIMES_BASE_DIR: global.__prayerTimesDir,
    ASSETS_DIR: global.__assetsDir,
    getSettingsDir: () => global.__settingsDir
  };
});

const fs = require('fs');
const path = require('path');
const { ensureDirectoriesExist } = require('../main-process/utils');

afterAll(() => {
  fs.rmSync(global.__tmpRoot, { recursive: true, force: true });
});

describe('ensureDirectoriesExist', () => {
  test('creates required directories', () => {
    ensureDirectoriesExist();

    expect(fs.existsSync(global.__settingsDir)).toBe(true);
    expect(fs.existsSync(global.__prayerTimesDir)).toBe(true);
    expect(fs.existsSync(path.join(global.__assetsDir, 'audios'))).toBe(true);
    expect(fs.existsSync(path.join(global.__assetsDir, 'images'))).toBe(true);
  });
});
