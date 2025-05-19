// main-process/prayer-data-handler.js
const fs = require('fs');
const path = require('path');
const { PRAYER_TIMES_BASE_DIR, DEFAULT_ADHAN_ABSOLUTE_PATH } = require('./config'); // From config.js

async function getYearlyPrayerTimesFromAPI(city, country, progressCallback) {
  const year = new Date().getFullYear();
  const prayerMethod = 2; // ISNA (North America) - can be made configurable
  let allRawApiData = [];
  const totalMonths = 12;

  console.log(`API: Fetching data for ${city}, ${country}, year ${year}, method ${prayerMethod}`);

  for (let month = 1; month <= totalMonths; month++) {
    // API politeness delay
    await new Promise(resolve => setTimeout(resolve, 250));

    const apiUrl = `http://api.aladhan.com/v1/calendarByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${prayerMethod}&month=${month}&year=${year}`;
    // console.log(`API: Fetching URL: ${apiUrl}`); // Can be verbose, uncomment for debugging
    try {
      const response = await fetch(apiUrl); // Assuming global fetch or node-fetch is available
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText })); // Try to get error message from API
        console.error(`API: HTTP error for month ${month}! Status: ${response.status}`, errorData);
        throw new Error(`API request failed for month ${month} with status ${response.status}. Message: ${errorData.data || errorData.message || response.statusText}`);
      }
      const data = await response.json();
      if (data.code === 200 && data.data && Array.isArray(data.data)) {
        allRawApiData = allRawApiData.concat(data.data);
        if (progressCallback) {
          const progress = Math.round((month / totalMonths) * 100);
          progressCallback(progress);
        }
      } else {
        console.error(`API: Returned unexpected data structure or non-200 code for month ${month}:`, data);
        throw new Error(`API returned unexpected data for month ${month}: ${data.status || 'Content issue or non-200 code'}`);
      }
    } catch (fetchError) {
        console.error(`API: Fetch error for month ${month} (${fetchError.name}): ${fetchError.message}`);
        if (fetchError instanceof TypeError) { // Often indicates a network issue (DNS, unreachable)
            const networkError = new Error(`Network error during API fetch for month ${month}: ${fetchError.message}`);
            networkError.isNetworkError = true; // Custom flag for IPC handler
            throw networkError;
        }
        throw fetchError; // Re-throw other errors (like the ones we throw for !response.ok)
    }
  }
  return allRawApiData;
}

function transformApiDataForJSON(apiDataArray) {
    const prayerTimesByDate = {};
    apiDataArray.forEach(day => {
        const gregorianDate = day.date.gregorian.date; // Format: DD-MM-YYYY
        const [d, m, y] = gregorianDate.split('-');
        const formattedDateKey = `${y}-${m}-${d}`; // YYYY-MM-DD

        prayerTimesByDate[formattedDateKey] = {
            Fajr: day.timings.Fajr.split(' ')[0],
            Dhuhr: day.timings.Dhuhr.split(' ')[0],
            Asr: day.timings.Asr.split(' ')[0],
            Maghrib: day.timings.Maghrib.split(' ')[0],
            Isha: day.timings.Isha.split(' ')[0],
            // Initialize Adhan paths with the ACTUAL DEFAULT_ADHAN_ABSOLUTE_PATH
            FajrAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH,
            DhuhrAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH,
            AsrAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH,
            MaghribAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH,
            IshaAdhan: DEFAULT_ADHAN_ABSOLUTE_PATH,
            hijri: day.date.hijri.date,
            readableDate: day.date.readable, // e.g., "18 May 2025"
            // You could add timezone from day.meta.timezone here if needed for advanced scenarios
            // timezone: day.meta.timezone 
        };
    });
    return prayerTimesByDate;
}

function savePrayerTimesToJSONFile(data, filePath) {
  const jsonData = JSON.stringify(data, null, 2); // Pretty print JSON with 2 spaces indentation
  fs.writeFileSync(filePath, jsonData, 'utf-8');
  console.log(`DataHandler: Prayer times data saved to ${filePath}`);
}

function loadPrayerTimesFromFile(filePath) {
    console.log(`DataHandler: Attempting to load prayer times from ${filePath}`);
    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            let yearlyData = JSON.parse(fileContent);
            
            // Data integrity check and default Adhan path enforcement
            // Ensure all Adhan keys exist and are not null/undefined, otherwise set to default.
            for (const dateKey in yearlyData) {
                if (yearlyData.hasOwnProperty(dateKey) && yearlyData[dateKey]) {
                    const dayEntry = yearlyData[dateKey];
                    ['FajrAdhan', 'DhuhrAdhan', 'AsrAdhan', 'MaghribAdhan', 'IshaAdhan'].forEach(adhanKey => {
                        if (!dayEntry.hasOwnProperty(adhanKey) || dayEntry[adhanKey] === null || dayEntry[adhanKey] === undefined) {
                            console.warn(`DataHandler: Correcting missing/null Adhan path for ${dateKey} - ${adhanKey} to default in loaded file.`);
                            dayEntry[adhanKey] = DEFAULT_ADHAN_ABSOLUTE_PATH;
                        }
                    });
                }
            }
            console.log(`DataHandler: Successfully loaded and processed prayer times from ${filePath}`);
            return yearlyData;
        } catch (parseError) {
            console.error(`DataHandler: Error parsing JSON from ${filePath}:`, parseError);
            return null; // Return null if parsing fails
        }
    }
    console.log(`DataHandler: File not found at ${filePath}`);
    return null; // Return null if file doesn't exist
}

module.exports = {
    getYearlyPrayerTimesFromAPI,
    transformApiDataForJSON,
    savePrayerTimesToJSONFile,
    loadPrayerTimesFromFile,
    PRAYER_TIMES_BASE_DIR // Exporting this constant can be useful for IPC handlers
};