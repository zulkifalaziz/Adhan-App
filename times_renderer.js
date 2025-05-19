// times_renderer.js
document.addEventListener('DOMContentLoaded', () => {
    const currentDateDisplay = document.getElementById('currentDateDisplay');
    const prayerListDiv = document.getElementById('prayerList');
    let backButton = document.getElementById('backButton');
    const nextDayButton = document.getElementById('nextDayButton');
    const locationDisplay = document.getElementById('locationDisplay');
    const autoSaveStatusMessage = document.getElementById('autoSaveStatusMessage');
    const editTimeStatusMessage = document.getElementById('editTimeStatusMessage');
    const goToDashboardButtonFromTimes = document.getElementById('goToDashboardButtonFromTimes');

    let ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH = 'C:\\Users\\zulki\\Desktop\\Adhan App\\assets\\audios\\azan1.mp3';
    let DEFAULT_ADHAN_DISPLAY_NAME = "azan1.mp3 (Default)";
    let currentUISessionAdhanPreferences = {};
    let globalCity = '';
    let globalCountry = '';
    let currentDisplayedDateObject = new Date();
    let globalDateKey = '';
    let homeLocation = null; // Stores { city, country }

    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    // --- Inactivity Timer Logic for Times Page ---
    let timesPageInactivityTimer;
    const TIMES_PAGE_INACTIVITY_TIMEOUT_MS = 5 * 1000; // 5 seconds

    function resetTimesPageInactivityTimer() {
        // console.log("TimesRenderer: Activity detected, resetting 5s inactivity timer.");
        clearTimeout(timesPageInactivityTimer);
        timesPageInactivityTimer = setTimeout(handleInactivityOnTimesPage, TIMES_PAGE_INACTIVITY_TIMEOUT_MS);
    }

    async function handleInactivityOnTimesPage() {
        console.log("TimesRenderer: 5s Inactivity timeout reached on times page.");

        const today = new Date();
        const todayDateKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        
        const isNotToday = globalDateKey !== todayDateKey;
        let isNotHomeCity = false;

        if (!homeLocation) {
            try {
                homeLocation = await window.electronAPI.loadHomeCityCountry();
                console.log("TimesRenderer (Inactivity Check): Loaded home location:", homeLocation);
            } catch(err) {
                console.error("TimesRenderer (Inactivity Check): Error loading home location:", err);
            }
        }

        if (homeLocation && homeLocation.city && homeLocation.country) {
            if (globalCity.toLowerCase() !== homeLocation.city.toLowerCase() || 
                globalCountry.toLowerCase() !== homeLocation.country.toLowerCase()) {
                isNotHomeCity = true;
            }
        }

        if (isNotToday || isNotHomeCity) {
            console.log(`TimesRenderer: Inactivity conditions met (isNotToday: ${isNotToday}, isNotHomeCity: ${isNotHomeCity}). Triggering redirect via navigateToHomeCityTimes.`);
            // This IPC call will make main process load home city data and navigate to times.html
            // times.html will then request "today's" data for that (now current) home city.
            window.electronAPI.navigateToHomeCityTimes();
        } else {
            console.log("TimesRenderer: Inactivity, but already on target view. Resetting timer.");
            resetTimesPageInactivityTimer(); // Restart timer if no action needed
        }
    }

    const activityEventsForTimesPage = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart', 'wheel'];
    function timesPageActivityDetected() {
        resetTimesPageInactivityTimer();
    }
    activityEventsForTimesPage.forEach(event => {
        document.addEventListener(event, timesPageActivityDetected, { capture: true, passive: true });
    });
    // --- End Inactivity Timer Logic ---

    // --- Initial Element Checks ---
    if (!currentDateDisplay) console.error("TimesRenderer Error: currentDateDisplay element not found.");
    if (!prayerListDiv) console.error("TimesRenderer Error: prayerListDiv element not found.");
    if (!backButton) console.error("TimesRenderer Error: backButton element not found.");
    if (!nextDayButton) console.error("TimesRenderer Error: nextDayButton element not found.");
    if (!locationDisplay) console.error("TimesRenderer Error: locationDisplay element not found.");
    if (!autoSaveStatusMessage) console.error("TimesRenderer Error: autoSaveStatusMessage element not found.");
    if (!editTimeStatusMessage) console.error("TimesRenderer Error: editTimeStatusMessage element not found.");
    if (!goToDashboardButtonFromTimes) console.error("TimesRenderer Error: goToDashboardButtonFromTimes element not found!");

    // --- Event Listeners Setup ---
    if (goToDashboardButtonFromTimes) {
        goToDashboardButtonFromTimes.addEventListener('click', () => {
            console.log("TimesRenderer: Go to Dashboard button clicked.");
            window.electronAPI.navigateToDashboard();
        });
    }

    function setupNavigationButton(buttonElement, isPrevDayMode, targetAction) {
        if (!buttonElement) return;
        const buttonClasses = "flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-150 ease-in-out";
        buttonElement.className = buttonClasses;
        let buttonText = isPrevDayMode ? "Prev Day" : "Search";
        let svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>`;
        buttonElement.innerHTML = `${svgIcon} ${buttonText}`;
        const newButtonInstance = buttonElement.cloneNode(true);
        buttonElement.parentNode.replaceChild(newButtonInstance, buttonElement);
        if (isPrevDayMode) { backButton = newButtonInstance; } // Update global reference
        newButtonInstance.addEventListener('click', targetAction);
    }

    if (nextDayButton) {
        nextDayButton.addEventListener('click', () => {
            currentDisplayedDateObject.setDate(currentDisplayedDateObject.getDate() + 1);
            const nextDateKey = `${currentDisplayedDateObject.getFullYear()}-${(currentDisplayedDateObject.getMonth() + 1).toString().padStart(2, '0')}-${currentDisplayedDateObject.getDate().toString().padStart(2, '0')}`;
            window.electronAPI.requestPrayerTimesForDate(nextDateKey);
        });
    }

    function initializeAdhanPreferences(dayDataWithAdhans) {
        let foundDefaultPathInDayData = null;
        if (dayDataWithAdhans) {
            prayerOrder.forEach(pName => {
                const adhanKey = `${pName}Adhan`;
                if (dayDataWithAdhans[adhanKey] && typeof dayDataWithAdhans[adhanKey] === 'string' && dayDataWithAdhans[adhanKey].toLowerCase().includes('azan1.mp3')) {
                    foundDefaultPathInDayData = dayDataWithAdhans[adhanKey];
                }
            });
        }
        if(foundDefaultPathInDayData) {
            ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH = foundDefaultPathInDayData;
            DEFAULT_ADHAN_DISPLAY_NAME = `${foundDefaultPathInDayData.split(/[\\/]/).pop()} (Default)`;
        } else {
            DEFAULT_ADHAN_DISPLAY_NAME = `${ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH.split(/[\\/]/).pop()} (Default)`;
        }
        currentUISessionAdhanPreferences = {};
        prayerOrder.forEach(pName => {
            currentUISessionAdhanPreferences[pName] = (dayDataWithAdhans && dayDataWithAdhans[`${pName}Adhan`])
                                                      ? dayDataWithAdhans[`${pName}Adhan`]
                                                      : ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH;
        });
        prayerOrder.forEach(prayerName => {
            const adhanNameElement = document.getElementById(`adhan-${prayerName}-name`);
            if (adhanNameElement) {
                updateAdhanFileNameDisplay(prayerName, currentUISessionAdhanPreferences[prayerName], adhanNameElement);
            }
        });
    }

    function renderPrayerTimesPage(eventData) {
        console.log("TimesRenderer: Rendering data for times page:", eventData);
        resetTimesPageInactivityTimer();
        
        const { dayData, fullDate, city, country, error } = eventData;
        const currentBackButtonRef = document.getElementById('backButton');

        if (error) {
            if (prayerListDiv) prayerListDiv.innerHTML = `<p class="text-red-400 text-center">${error}</p>`;
            if (currentDateDisplay) currentDateDisplay.textContent = "Error Loading Data";
            if (locationDisplay) locationDisplay.textContent = "";
            if (nextDayButton) nextDayButton.disabled = true;
            if (currentBackButtonRef) {
                 setupNavigationButton(currentBackButtonRef, false, () => window.electronAPI.goBackToIndex());
            }
            return;
        }
        if (nextDayButton) nextDayButton.disabled = false;

        globalCity = city;
        globalCountry = country;

        if (dayData && dayData.readableDate) {
            const parsedDate = new Date(dayData.readableDate);
            if (!isNaN(parsedDate)) currentDisplayedDateObject = parsedDate;
            else currentDisplayedDateObject = new Date();
        } else {
            currentDisplayedDateObject = new Date();
        }
        
        globalDateKey = `${currentDisplayedDateObject.getFullYear()}-${(currentDisplayedDateObject.getMonth() + 1).toString().padStart(2, '0')}-${currentDisplayedDateObject.getDate().toString().padStart(2, '0')}`;
        const displayDateStr = currentDisplayedDateObject.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        if (currentDateDisplay) currentDateDisplay.textContent = fullDate || displayDateStr;
        if (locationDisplay && city && country) locationDisplay.textContent = `Location: ${city}, ${country}`;
        else if (locationDisplay) locationDisplay.textContent = "";

        if (dayData) initializeAdhanPreferences(dayData);

        if (prayerListDiv && dayData && typeof dayData === 'object') {
            prayerListDiv.innerHTML = '';
            prayerOrder.forEach(prayerName => {
                if (dayData[prayerName] && typeof dayData[prayerName] === 'string') {
                    const time24h = dayData[prayerName];
                    const formattedTime = formatTime(time24h);
                    const adhanPathForThisPrayer = currentUISessionAdhanPreferences[prayerName];
                    const prayerDiv = document.createElement('div');
                    prayerDiv.className = 'flex justify-between items-center py-3 border-b border-gray-700 last:border-b-0';
                    prayerDiv.id = `prayer-row-${prayerName}`;
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'flex-grow mr-2';
                    const nameTimeContainer = document.createElement('div');
                    nameTimeContainer.className = 'flex items-center';
                    nameTimeContainer.id = `name-time-container-${prayerName}`;
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'font-semibold text-blue-200';
                    nameSpan.textContent = prayerName;
                    const timeDisplaySpan = document.createElement('span');
                    timeDisplaySpan.className = 'text-gray-100 ml-4 prayer-time-display';
                    timeDisplaySpan.id = `time-display-${prayerName}`;
                    timeDisplaySpan.textContent = formattedTime;
                    timeDisplaySpan.dataset.originalTime = time24h;
                    const editIcon = document.createElement('button');
                    editIcon.className = 'edit-time-btn ml-2 text-gray-400 hover:text-white focus:outline-none p-1';
                    editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>`;
                    editIcon.title = `Edit ${prayerName} time`;
                    editIcon.dataset.prayer = prayerName;
                    editIcon.addEventListener('click', () => toggleEditTimeMode(prayerName, nameTimeContainer, timeDisplaySpan, time24h));
                    nameTimeContainer.appendChild(nameSpan); nameTimeContainer.appendChild(timeDisplaySpan); nameTimeContainer.appendChild(editIcon);
                    const adhanNameP = document.createElement('p');
                    adhanNameP.className = 'text-xs text-gray-400 mt-1 truncate';
                    adhanNameP.id = `adhan-${prayerName}-name`;
                    updateAdhanFileNameDisplay(prayerName, adhanPathForThisPrayer, adhanNameP);
                    infoDiv.appendChild(nameTimeContainer); infoDiv.appendChild(adhanNameP);
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 whitespace-nowrap';
                    const selectButton = document.createElement('button');
                    selectButton.className = 'select-adhan-btn bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-1 px-3 rounded w-full sm:w-auto';
                    selectButton.textContent = 'Set Adhan';
                    selectButton.dataset.prayer = prayerName;
                    selectButton.addEventListener('click', async () => {
                        try {
                            const filePath = await window.electronAPI.openFileDialog(prayerName);
                            if (filePath) { currentUISessionAdhanPreferences[prayerName] = filePath; updateAdhanFileNameDisplay(prayerName, filePath); triggerAutoSaveAdhan(prayerName, filePath); }
                        } catch (err) { console.error("TimesRenderer: Error opening file dialog for Set Adhan:", err); if (autoSaveStatusMessage) { autoSaveStatusMessage.textContent = `Error selecting file: ${err.message || 'Dialog error'}`; autoSaveStatusMessage.className = 'text-sm mt-3 text-red-400'; autoSaveStatusMessage.classList.remove('hidden'); setTimeout(() => autoSaveStatusMessage.classList.add('hidden'), 4000);}}
                    });
                    const resetButton = document.createElement('button');
                    resetButton.className = 'reset-adhan-btn bg-gray-500 hover:bg-gray-600 text-white text-sm py-1 px-3 rounded w-full sm:w-auto';
                    resetButton.textContent = 'Reset';
                    resetButton.dataset.prayer = prayerName;
                    resetButton.addEventListener('click', () => { currentUISessionAdhanPreferences[prayerName] = ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH; updateAdhanFileNameDisplay(prayerName, ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH); triggerAutoSaveAdhan(prayerName, ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH); });
                    buttonContainer.appendChild(selectButton); buttonContainer.appendChild(resetButton);
                    prayerDiv.appendChild(infoDiv); prayerDiv.appendChild(buttonContainer);
                    prayerListDiv.appendChild(prayerDiv);
                }
            });
        } else { if (prayerListDiv) prayerListDiv.innerHTML = '<p class="text-red-400 text-center">Could not load prayer times for this day.</p>'; }
        
        if (currentBackButtonRef) {
            setupNavigationButton(currentBackButtonRef, true, () => {
                currentDisplayedDateObject.setDate(currentDisplayedDateObject.getDate() - 1);
                const prevDateKey = `${currentDisplayedDateObject.getFullYear()}-${(currentDisplayedDateObject.getMonth() + 1).toString().padStart(2, '0')}-${currentDisplayedDateObject.getDate().toString().padStart(2, '0')}`;
                window.electronAPI.requestPrayerTimesForDate(prevDateKey);
            });
        }
    }
    
    window.electronAPI.onShowPrayerTimes(renderPrayerTimesPage);

    function toggleEditTimeMode(prayerName, nameTimeContainerElement, timeDisplaySpanElement, originalTime24h) {
        const existingEditControls = nameTimeContainerElement.querySelector('.edit-controls-wrapper');
        const editIconElement = nameTimeContainerElement.querySelector('.edit-time-btn');
        if (existingEditControls) { existingEditControls.remove(); timeDisplaySpanElement.classList.remove('hidden'); if(editIconElement) editIconElement.classList.remove('hidden'); return; }
        timeDisplaySpanElement.classList.add('hidden'); if(editIconElement) editIconElement.classList.add('hidden');
        const editControlsWrapper = document.createElement('div'); editControlsWrapper.className = 'edit-controls-wrapper flex items-center space-x-1 ml-1';
        const timeInput = document.createElement('input'); timeInput.type = 'time'; timeInput.value = originalTime24h; timeInput.className = 'bg-gray-700 text-white text-sm p-1 rounded border border-gray-600 focus:ring-blue-500 focus:border-blue-500 w-[100px]';
        const saveEditButton = document.createElement('button'); saveEditButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>`; saveEditButton.className = 'bg-green-500 hover:bg-green-600 text-white p-1 rounded focus:outline-none'; saveEditButton.title = "Save Time";
        saveEditButton.addEventListener('click', async () => {
            const newTime24h = timeInput.value;
            if (newTime24h && newTime24h !== originalTime24h) {
                if (editTimeStatusMessage) { editTimeStatusMessage.textContent = `Saving ${prayerName} time...`; editTimeStatusMessage.className = 'text-sm mt-2 text-yellow-400'; editTimeStatusMessage.classList.remove('hidden'); }
                try {
                    const result = await window.electronAPI.updateSpecificPrayerTimeForDay({ city: globalCity, country: globalCountry, dateKey: globalDateKey, prayerName: prayerName, newTime: newTime24h });
                    if (result.success) {
                        timeDisplaySpanElement.textContent = formatTime(newTime24h); timeDisplaySpanElement.dataset.originalTime = newTime24h;
                        if (editTimeStatusMessage) { editTimeStatusMessage.textContent = result.message || `${prayerName} time updated.`; editTimeStatusMessage.className = 'text-sm mt-2 text-green-400'; }
                    } else { throw new Error(result.message || "Failed to save time in main process."); }
                } catch (err) { console.error("TimesRenderer: Error saving prayer time:", err); if (editTimeStatusMessage) { editTimeStatusMessage.textContent = `Error: ${err.message}`; editTimeStatusMessage.className = 'text-sm mt-2 text-red-400'; }}
                finally { if (editTimeStatusMessage) setTimeout(() => editTimeStatusMessage.classList.add('hidden'), 3000); }
            }
            editControlsWrapper.remove(); timeDisplaySpanElement.classList.remove('hidden'); if(editIconElement) editIconElement.classList.remove('hidden');
        });
        const cancelEditButton = document.createElement('button'); cancelEditButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`; cancelEditButton.className = 'bg-gray-400 hover:bg-gray-500 text-black p-1 rounded focus:outline-none'; cancelEditButton.title = "Cancel Edit";
        cancelEditButton.addEventListener('click', () => { editControlsWrapper.remove(); timeDisplaySpanElement.classList.remove('hidden'); if(editIconElement) editIconElement.classList.remove('hidden'); });
        editControlsWrapper.appendChild(timeInput); editControlsWrapper.appendChild(saveEditButton); editControlsWrapper.appendChild(cancelEditButton);
        nameTimeContainerElement.appendChild(editControlsWrapper);
    }

    function triggerAutoSaveAdhan(prayerName, adhanFilePath) {
        if (globalCity && globalCountry) {
            window.electronAPI.updateSpecificPrayerAdhan({ city: globalCity, country: globalCountry, prayerName: prayerName, adhanFilePath: adhanFilePath });
            if (autoSaveStatusMessage) { autoSaveStatusMessage.textContent = `Saving ${prayerName} Adhan...`; autoSaveStatusMessage.className = 'text-sm mt-3 text-yellow-400'; autoSaveStatusMessage.classList.remove('hidden'); }
        } else {
            console.error("TimesRenderer: Cannot auto-save Adhan, city/country info missing.");
            if (autoSaveStatusMessage) { autoSaveStatusMessage.textContent = 'Error: Location info missing for auto-save Adhan.'; autoSaveStatusMessage.className = 'text-sm mt-3 text-red-400'; autoSaveStatusMessage.classList.remove('hidden'); setTimeout(() => autoSaveStatusMessage.classList.add('hidden'), 4000); }
        }
    }
    
    window.electronAPI.onAdhanAutoSaveStatus((status) => {
        if (autoSaveStatusMessage) {
            autoSaveStatusMessage.textContent = status.message;
            autoSaveStatusMessage.className = `text-sm mt-3 ${status.success ? 'text-green-400' : 'text-red-400'}`;
            autoSaveStatusMessage.classList.remove('hidden');
            setTimeout(() => autoSaveStatusMessage.classList.add('hidden'), status.success ? 2000 : 4000);
        }
    });

    function updateAdhanFileNameDisplay(prayerName, currentAdhanPathForPrayer, element = null) {
        const adhanNameElement = element || document.getElementById(`adhan-${prayerName}-name`);
        if (adhanNameElement) {
            if (currentAdhanPathForPrayer && typeof currentAdhanPathForPrayer === 'string' && currentAdhanPathForPrayer.toLowerCase() === ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH.toLowerCase()) {
                adhanNameElement.textContent = DEFAULT_ADHAN_DISPLAY_NAME;
                adhanNameElement.title = `Default: ${ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH}`;
            } else if (currentAdhanPathForPrayer && typeof currentAdhanPathForPrayer === 'string') {
                const fileName = currentAdhanPathForPrayer.split(/[\\/]/).pop();
                adhanNameElement.textContent = fileName;
                adhanNameElement.title = currentAdhanPathForPrayer;
            } else {
                adhanNameElement.textContent = DEFAULT_ADHAN_DISPLAY_NAME;
                adhanNameElement.title = `Default: ${ACTUAL_DEFAULT_ADHAN_ABSOLUTE_PATH}`;
            }
        }
    }
        
    async function initialPageSetup() { // Renamed for clarity
        try {
            homeLocation = await window.electronAPI.loadHomeCityCountry();
            console.log("TimesRenderer: Loaded home location on init:", homeLocation);
        } catch (err) {
            console.error("TimesRenderer: Error loading home location on init:", err);
            // homeLocation will remain null, inactivity logic will adapt
        }
        window.electronAPI.requestPrayerTimesForDate(); // Request initial data for "today"
        resetTimesPageInactivityTimer(); // Start inactivity timer after initial setup
    }
    initialPageSetup(); // Call the setup function

    window.addEventListener('beforeunload', () => {
        console.log("TimesRenderer: Page unloading, clearing inactivity timer and listeners.");
        clearTimeout(timesPageInactivityTimer);
        activityEventsForTimesPage.forEach(event => {
            document.removeEventListener(event, timesPageActivityDetected, { capture: true });
        });
    });
}); // End of DOMContentLoaded

function formatTime(time24h) {
    if (!time24h || typeof time24h !== 'string' || !time24h.includes(':')) return "N/A";
    const [hours, minutes] = time24h.split(':');
    const h = parseInt(hours, 10);
    const m = minutes; 
    if (isNaN(h)) return "N/A";
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${m} ${suffix}`;
}