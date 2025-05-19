// renderer.js (for index.html)
document.addEventListener('DOMContentLoaded', () => {
    const locationForm = document.getElementById('locationForm');
    const cityInput = document.getElementById('cityInput');
    const countryInput = document.getElementById('countryInput');
    const loadingContainer = document.getElementById('loadingContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const statusMessage = document.getElementById('statusMessage');
    const submitButton = document.getElementById('submitLocation');
    const goToDashboardButton = document.getElementById('goToDashboardButton');

    // Initial null checks
    if (!locationForm) console.error("IndexRenderer Error: locationForm not found!");
    if (!cityInput) console.error("IndexRenderer Error: cityInput not found!");
    if (!countryInput) console.error("IndexRenderer Error: countryInput not found!");
    if (!loadingContainer) console.error("IndexRenderer Error: loadingContainer not found!");
    if (!progressBar) console.error("IndexRenderer Error: progressBar not found!");
    if (!progressText) console.error("IndexRenderer Error: progressText not found!");
    if (!statusMessage) console.error("IndexRenderer Error: statusMessage not found!");
    if (!submitButton) console.error("IndexRenderer Error: submitButton not found!");
    if (!goToDashboardButton) console.error("IndexRenderer Error: goToDashboardButton not found!");


    if (goToDashboardButton) {
        goToDashboardButton.addEventListener('click', () => {
            console.log("IndexRenderer: Go to Dashboard button clicked.");
            window.electronAPI.navigateToDashboard();
        });
    }

    if (locationForm) {
        locationForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const city = cityInput.value.trim();
            const country = countryInput.value.trim();

            if (city && country) {
                if (statusMessage) {
                    statusMessage.classList.add('hidden');
                    statusMessage.textContent = '';
                }
                if(progressBar) {
                    progressBar.style.width = '0%';
                    progressBar.textContent = '0%';
                }
                if(progressText) {
                    progressText.textContent = 'Initializing...';
                }
                // loadingContainer visibility will be handled by 'fetch-started'
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.classList.add('opacity-50', 'cursor-not-allowed');
                }
                window.electronAPI.fetchPrayerTimes(city, country);
            } else {
                if (statusMessage) {
                    statusMessage.textContent = 'Please enter both city and country.';
                    statusMessage.classList.remove('hidden');
                    statusMessage.classList.add('bg-red-500', 'text-white'); // Keep error color
                    statusMessage.classList.remove('bg-green-500'); // Ensure success color is removed
                }
            }
        });
    } else {
        console.error("IndexRenderer Error: locationForm not found, cannot add submit listener.");
    }

    window.electronAPI.onPrayerTimesResponse((response) => {
        console.log('IndexRenderer: IPC Response (prayer-times-response):', response);

        if (response.type === 'fetch-started') {
            if (loadingContainer) loadingContainer.classList.remove('hidden');
            if (progressText) progressText.textContent = 'Fetching data (0%)...';
            if (progressBar) {
                 progressBar.style.width = '0%';
                 progressBar.textContent = '0%';
            }
        } else if (response.type === 'progress') {
            if (loadingContainer && loadingContainer.classList.contains('hidden')) {
                loadingContainer.classList.remove('hidden');
            }
            if (progressBar) {
                progressBar.style.width = `${response.progress}%`;
                progressBar.textContent = `${response.progress}%`;
            }
            if (progressText) {
                progressText.textContent = `Fetching data (${response.progress}%)...`;
            }
        } else if (response.type === 'fetch-complete') {
            if (loadingContainer) loadingContainer.classList.add('hidden');
            if (statusMessage) {
                statusMessage.textContent = response.message;
                statusMessage.classList.remove('hidden');
                if (response.success) {
                    statusMessage.classList.add('bg-green-500', 'text-white');
                    statusMessage.classList.remove('bg-red-500');
                } else {
                    statusMessage.classList.add('bg-red-500', 'text-white');
                    statusMessage.classList.remove('bg-green-500');
                }
            }
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
            }

            if (response.success && response.navigateToTimes) {
                console.log("IndexRenderer: Fetch complete and successful, navigating to times page...");
                setTimeout(() => {
                    window.electronAPI.navigateToTimesPage();
                }, 1500); // Delay to allow user to read the status message
            }
        }
    });
});