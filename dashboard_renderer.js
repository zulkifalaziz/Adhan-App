// dashboard_renderer.js
document.addEventListener('DOMContentLoaded', () => {
    const navigateToSearchButton = document.getElementById('navigateToSearchButton');
    const savedTimesTableBody = document.getElementById('savedTimesTableBody');
    const noSavedDataMessage = document.getElementById('noSavedDataMessage');

    // --- Inactivity Timer Logic ---
    let inactivityTimer;
    const INACTIVITY_TIMEOUT_MS = 5 * 1000; // 1 minute (60000 ms)

    function resetInactivityTimer() {
        // console.log("DashboardRenderer: Activity detected, resetting inactivity timer.");
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            console.log("DashboardRenderer: Inactivity timeout reached on dashboard. Attempting to navigate to home city times.");
            window.electronAPI.navigateToHomeCityTimes(); // Send IPC to main process
        }, INACTIVITY_TIMEOUT_MS);
    }

    // Events that count as activity to reset the timer
    const activityEvents = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart', 'wheel'];
    function activityDetected() {
        resetInactivityTimer();
    }
    activityEvents.forEach(event => {
        document.addEventListener(event, activityDetected, { capture: true, passive: true });
    });
    // --- End Inactivity Timer Logic ---


    if (!navigateToSearchButton) console.error("DashboardRenderer Error: navigateToSearchButton not found!");
    if (!savedTimesTableBody) console.error("DashboardRenderer Error: savedTimesTableBody not found!");
    if (!noSavedDataMessage) console.error("DashboardRenderer Error: noSavedDataMessage not found!");


    if (navigateToSearchButton) {
        navigateToSearchButton.addEventListener('click', () => {
            console.log("DashboardRenderer: Navigate to Search button clicked.");
            window.electronAPI.navigateToSearchPage();
        });
    }

    async function loadSavedPrayerTimesList() {
        resetInactivityTimer(); // Reset timer when loading data (initial activity on page)
        if (!savedTimesTableBody || !noSavedDataMessage) {
            console.error("DashboardRenderer: Table body or no data message element not found. Cannot load list.");
            return;
        }

        try {
            console.log("DashboardRenderer: Requesting list of saved prayer times files and home location.");
            const files = await window.electronAPI.listSavedPrayerTimeFiles();
            const homeCityCountry = await window.electronAPI.loadHomeCityCountry();
            console.log("DashboardRenderer: Received files:", files, "Home Location:", homeCityCountry);

            savedTimesTableBody.innerHTML = '';

            if (files && files.length > 0) {
                noSavedDataMessage.classList.add('hidden');
                files.forEach(fileInfo => {
                    const isHome = homeCityCountry &&
                                   homeCityCountry.city && fileInfo.city &&
                                   homeCityCountry.country && fileInfo.country &&
                                   homeCityCountry.city.toLowerCase() === fileInfo.city.toLowerCase() &&
                                   homeCityCountry.country.toLowerCase() === fileInfo.country.toLowerCase();

                    const row = savedTimesTableBody.insertRow();

                    const cellCity = row.insertCell();
                    cellCity.className = `px-4 py-3 whitespace-nowrap text-sm ${isHome ? 'text-green-400 font-bold' : 'text-gray-100'} w-2/5`;
                    cellCity.textContent = fileInfo.city;
                    // Home icon was removed

                    const cellCountry = row.insertCell();
                    cellCountry.className = `px-4 py-3 whitespace-nowrap text-sm ${isHome ? 'text-green-400 font-bold' : 'text-gray-100'} w-2/5`;
                    cellCountry.textContent = fileInfo.country;

                    const cellActions = row.insertCell();
                    cellActions.className = "px-4 py-3 whitespace-nowrap text-sm text-left space-x-1 w-1/5"; 
                    
                    const viewButton = document.createElement('button');
                    viewButton.className = "view-times-btn bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 sm:px-3 rounded text-xs";
                    viewButton.textContent = "View";
                    viewButton.title = "View Prayer Times";
                    viewButton.dataset.city = fileInfo.city;
                    viewButton.dataset.country = fileInfo.country;
                    viewButton.dataset.filename = fileInfo.filename;
                    viewButton.addEventListener('click', () => {
                        window.electronAPI.loadAndNavigateToTimesPage({ city: fileInfo.city, country: fileInfo.country, filename: fileInfo.filename });
                    });
                    cellActions.appendChild(viewButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.className = "delete-times-btn bg-red-600 hover:bg-red-700 text-white py-1 px-2 sm:px-3 rounded text-xs";
                    deleteButton.textContent = "Delete";
                    deleteButton.title = "Delete Prayer Times Data";
                    deleteButton.dataset.filename = fileInfo.filename;
                    deleteButton.dataset.city = fileInfo.city;
                    deleteButton.dataset.country = fileInfo.country;
                    deleteButton.addEventListener('click', async () => {
                        const confirmed = confirm(`Are you sure you want to delete prayer times for ${fileInfo.city}, ${fileInfo.country}? This action cannot be undone.`);
                        if (confirmed) {
                            try {
                                const result = await window.electronAPI.deletePrayerTimeFile(fileInfo.filename);
                                if (result.success) {
                                    console.log(result.message || `Successfully deleted data for ${fileInfo.city}, ${fileInfo.country}. Refreshing list.`);
                                    loadSavedPrayerTimesList();
                                } else {
                                    alert(result.message || `Failed to delete data for ${fileInfo.city}, ${fileInfo.country}.`);
                                }
                            } catch (error) {
                                alert(`An error occurred while trying to delete: ${error.message}`);
                            }
                        }
                    });
                    cellActions.appendChild(deleteButton);

                    if (!isHome) {
                        const setHomeButton = document.createElement('button');
                        setHomeButton.className = "set-home-btn bg-yellow-500 hover:bg-yellow-600 text-black py-1 px-2 sm:px-3 rounded text-xs";
                        setHomeButton.textContent = "Set Home";
                        setHomeButton.title = "Set as Home Location";
                        setHomeButton.dataset.city = fileInfo.city;
                        setHomeButton.dataset.country = fileInfo.country;
                        setHomeButton.addEventListener('click', async () => {
                            try {
                                const result = await window.electronAPI.setHomeCityCountry({ city: fileInfo.city, country: fileInfo.country });
                                if (result.success) {
                                    loadSavedPrayerTimesList();
                                } else {
                                    alert(result.message || "Failed to set home location.");
                                }
                            } catch (error) {
                                alert(`An error occurred: ${error.message}`);
                            }
                        });
                        cellActions.appendChild(setHomeButton);
                    }
                });
            } else {
                noSavedDataMessage.textContent = "No prayer time data has been saved yet.";
                noSavedDataMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error("DashboardRenderer: Error loading saved prayer times list:", error);
            if (noSavedDataMessage) {
                noSavedDataMessage.textContent = "Error loading saved data. Please try restarting the app.";
                noSavedDataMessage.classList.remove('hidden');
            }
        }
    }

    loadSavedPrayerTimesList(); // Initial load
    resetInactivityTimer();     // Start the timer when the page loads

    // Clean up timer and event listeners when the window is about to be unloaded
    window.addEventListener('beforeunload', () => {
        console.log("DashboardRenderer: Page unloading, clearing inactivity timer and listeners.");
        clearTimeout(inactivityTimer);
        activityEvents.forEach(event => {
            document.removeEventListener(event, activityDetected, { capture: true });
        });
    });
});