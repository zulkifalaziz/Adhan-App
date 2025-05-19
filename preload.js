// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // For index.html
  fetchPrayerTimes: (city, country) => ipcRenderer.send('fetch-prayer-times', city, country),
  onPrayerTimesResponse: (callback) => ipcRenderer.on('prayer-times-response', (_event, responseData) => callback(responseData)),
  navigateToTimesPage: () => ipcRenderer.send('navigate-to-times-page'),
  navigateToDashboard: () => ipcRenderer.send('navigate-to-dashboard'),

  // For times.html
  onShowPrayerTimes: (callback) => ipcRenderer.on('show-prayer-times-data', (_event, data) => callback(data)),
  goBackToIndex: () => ipcRenderer.send('navigate-to-index'),
  requestPrayerTimesForDate: (dateKey = null) => ipcRenderer.send('request-prayer-times-for-date', dateKey),
  openFileDialog: (prayerName) => ipcRenderer.invoke('dialog:openFile', prayerName),
  updateSpecificPrayerAdhan: (data) => ipcRenderer.send('update-specific-prayer-adhan', data),
  onAdhanAutoSaveStatus: (callback) => ipcRenderer.on('adhan-auto-save-status', (_event, status) => callback(status)),
  updateSpecificPrayerTimeForDay: (data) => ipcRenderer.invoke('update-prayer-time-for-day', data),
  loadHomeCityCountry: () => ipcRenderer.invoke('load-home-city-country'), // Used by times_renderer.js
  navigateToHomeCityTimes: () => ipcRenderer.send('navigate-to-home-city-times'), // Used by times_renderer.js for inactivity

  // For dashboard.html
  navigateToSearchPage: () => ipcRenderer.send('navigate-to-search-page'),
  listSavedPrayerTimeFiles: () => ipcRenderer.invoke('list-saved-files'),
  loadAndNavigateToTimesPage: (data) => ipcRenderer.send('load-and-navigate', data), // Used by dashboard and times_renderer inactivity
  deletePrayerTimeFile: (filename) => ipcRenderer.invoke('delete-prayer-time-file', filename),
  setHomeCityCountry: (data) => ipcRenderer.invoke('set-home-city-country', data)
});