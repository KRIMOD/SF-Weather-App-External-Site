import { LightningElement, api } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import getWeather from '@salesforce/apex/WeatherController.getWeather';
import getAccountContacts from '@salesforce/apex/WeatherController.getAccountContacts';
import getOrgUsers from '@salesforce/apex/WeatherController.getOrgUsers';
import sendWeatherReport from '@salesforce/apex/WeatherController.sendWeatherReport';

const DEFAULT_MODE = 'auto';

export default class WeatherLookup extends LightningElement {
    @api recordId;
    @api mode = DEFAULT_MODE;
    @api allowBrowserLocation;
    @api autoLoad = false;

    @api resolvedLocation;
    @api resolvedLatitude;
    @api resolvedLongitude;
    @api temperature;
    @api humidity;
    @api windSpeed;
    @api condition;
    @api iconName;
    @api reportText;
    @api hasWeather = false;
    @api errorMessage;

    inputCity = '';
    inputState = '';
    inputCountry = '';
    inputLatitude = '';
    inputLongitude = '';
    weatherSource;
    isLoading = false;
    isSending = false;
    sendResultMessage;
    recipientOptions = [];
    selectedRecipientIds = [];
    recipientSearchTerm = '';
    isLoadingRecipients = false;
    _city;
    _state;
    _country;
    _latitude;
    _longitude;

    @api
    get city() {
        return this._city;
    }

    set city(value) {
        this._city = value;
        this.syncInputValue('inputCity', value);
    }

    @api
    get state() {
        return this._state;
    }

    set state(value) {
        this._state = value;
        this.syncInputValue('inputState', value);
    }

    @api
    get country() {
        return this._country;
    }

    set country(value) {
        this._country = value;
        this.syncInputValue('inputCountry', value);
    }

    @api
    get latitude() {
        return this._latitude;
    }

    set latitude(value) {
        this._latitude = value;
        this.syncInputValue('inputLatitude', value);
    }

    @api
    get longitude() {
        return this._longitude;
    }

    set longitude(value) {
        this._longitude = value;
        this.syncInputValue('inputLongitude', value);
    }

    connectedCallback() {
        this.initializeInputs();
        void this.loadRecipientOptions();

        if (this.shouldAutoLoad) {
            void this.loadWeather();
        }
    }

    @api
    validate() {
        if (this.isLoading) {
            return {
                isValid: false,
                errorMessage: 'Wait for the weather lookup to finish before moving on.'
            };
        }

        return { isValid: true };
    }

    get shouldAutoLoad() {
        return this.toBoolean(this.autoLoad) && this.hasFetchableRequest();
    }

    get canFetchWeather() {
        return this.hasFetchableRequest();
    }

    get hasCityInput() {
        return Boolean(this.inputCity?.trim());
    }

    get hasCoordinateInput() {
        return this.parseDecimal(this.inputLatitude) !== null && this.parseDecimal(this.inputLongitude) !== null;
    }

    get disableFetchButton() {
        return this.isLoading || this.isSending || !this.canFetchWeather;
    }

    get showLocationButton() {
        if (!this.recordId) {
            return true;
        }

        return this.toBooleanOrDefault(this.allowBrowserLocation, true);
    }

    get displayIconGlyph() {
        return this.mapIconToGlyph(this.iconName || this.mapConditionToIcon(this.condition));
    }

    get conditionDisplay() {
        return this.condition || 'Current conditions unavailable';
    }

    get temperatureDisplay() {
        return this.temperature ? `${this.temperature} C` : '--';
    }

    get canSendReport() {
        return this.showWeatherSummary && !this.isLoading && !this.isSending && Boolean(this.reportText);
    }

    get disableSendButton() {
        return !this.canSendReport;
    }

    get sendButtonLabel() {
        return this.recordId ? 'Send To Contacts' : 'Send To Org Users';
    }

    get recipientSearchLabel() {
        return this.recordId ? 'Select Contacts' : 'Select Org Users';
    }

    get recipientSearchPlaceholder() {
        return this.recordId ? 'Search contacts' : 'Search org users';
    }

    get showRecipientSelector() {
        return Boolean(this.recordId || this.isLoadingRecipients || this.recipientOptions.length);
    }

    get selectedRecipientPills() {
        const selectedIds = new Set(this.selectedRecipientIds);
        return this.recipientOptions.filter((option) => selectedIds.has(option.value));
    }

    get hasSelectedRecipients() {
        return this.selectedRecipientPills.length > 0;
    }

    get filteredRecipientOptions() {
        const selectedIds = new Set(this.selectedRecipientIds);
        const searchTerm = this.recipientSearchTerm.trim().toLowerCase();

        return this.recipientOptions.filter((option) => {
            if (selectedIds.has(option.value)) {
                return false;
            }

            if (!searchTerm) {
                return true;
            }

            return option.label.toLowerCase().includes(searchTerm) || option.email.toLowerCase().includes(searchTerm);
        });
    }

    get hasFilteredRecipientOptions() {
        return this.filteredRecipientOptions.length > 0;
    }

    get recipientSelectorHelpText() {
        if (this.isLoadingRecipients) {
            return this.recordId ? 'Loading related contacts...' : 'Loading org users...';
        }

        if (!this.recipientOptions.length) {
            return this.recordId
                ? 'No related contacts with email addresses are available for this Account.'
                : 'No org users with email addresses are available.';
        }

        if (!this.selectedRecipientIds.length) {
            return this.recordId
                ? 'Leave blank to send the report to all related contacts.'
                : 'Leave blank to send the report to all org users.';
        }

        return `${this.selectedRecipientIds.length} recipient(s) selected.`;
    }

    get humidityDisplay() {
        return this.humidity ? `${this.humidity}%` : '--';
    }

    get showWeatherSummary() {
        return Boolean(
            this.hasWeather ||
                this.reportText ||
                this.resolvedLocation ||
                this.temperature ||
                this.humidity ||
                this.windSpeed ||
                this.condition
        );
    }

    get windSpeedDisplay() {
        return this.windSpeed ? `${this.windSpeed} kn` : '--';
    }

    initializeInputs() {
        this.syncInputValue('inputCity', this.city, true);
        this.syncInputValue('inputState', this.state, true);
        this.syncInputValue('inputCountry', this.country, true);
        this.syncInputValue('inputLatitude', this.latitude, true);
        this.syncInputValue('inputLongitude', this.longitude, true);
        this.mode = this.normalizeString(this.mode) || DEFAULT_MODE;
        this.allowBrowserLocation = this.toBooleanOrDefault(this.allowBrowserLocation, true);
        this.autoLoad = this.toBooleanOrDefault(this.autoLoad, false);
    }

    handleInputChange(event) {
        this[event.target.name] = event.target.value;
    }

    async handleGetWeather() {
        await this.loadWeather();
    }

    async handleSendWeatherReport() {
        if (!this.canSendReport) {
            return;
        }

        this.isSending = true;
        this.sendResultMessage = null;
        this.updateOutput('errorMessage', null);

        try {
            const result = await sendWeatherReport({
                recordId: this.recordId || null,
                selectedRecipientIds: this.selectedRecipientIds,
                reportText: this.reportText,
                resolvedLocation: this.resolvedLocation,
                condition: this.condition,
                temperature: this.temperature,
                humidity: this.humidity,
                windSpeed: this.windSpeed
            });

            const recipientLabel = result?.recipientType || (this.recordId ? 'contacts' : 'org users');
            const recipientCount = result?.recipientCount || 0;
            this.sendResultMessage = `Weather report sent to ${recipientCount} ${recipientLabel}.`;
        } catch (error) {
            this.sendResultMessage = null;
            this.setError(this.reduceError(error));
        } finally {
            this.isSending = false;
        }
    }

    handleRecipientSearchChange(event) {
        this.recipientSearchTerm = event.target.value || '';
    }

    handleRecipientSelect(event) {
        const recipientId = event.currentTarget.dataset.recipientId;
        if (!recipientId || this.selectedRecipientIds.includes(recipientId)) {
            return;
        }

        this.selectedRecipientIds = [...this.selectedRecipientIds, recipientId];
        this.recipientSearchTerm = '';
    }

    handleRecipientRemove(event) {
        const recipientId = event.currentTarget.name;
        this.selectedRecipientIds = this.selectedRecipientIds.filter((selectedId) => selectedId !== recipientId);
    }

    handleUseMyLocation() {
        if (!navigator?.geolocation) {
            this.setError('Browser geolocation is not available in this environment.');
            return;
        }

        this.isLoading = true;
        this.updateOutput('errorMessage', null);
        this.sendResultMessage = null;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude.toFixed(6);
                const longitude = position.coords.longitude.toFixed(6);

                this.inputLatitude = latitude;
                this.inputLongitude = longitude;
                this.inputCity = '';
                this.inputState = '';
                this.inputCountry = '';

                const request = {
                    recordId: this.recordId || null,
                    city: null,
                    state: null,
                    country: null,
                    latitude: this.parseDecimal(latitude),
                    longitude: this.parseDecimal(longitude),
                    contextMode: this.mode || DEFAULT_MODE
                };

                void this.loadWeatherRequest(request, {
                    source: 'geolocation',
                    overrides: { latitude, longitude, city: '', state: '', country: '' }
                });
            },
            (error) => {
                this.isLoading = false;
                this.setError(this.formatGeolocationError(error));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000
            }
        );
    }

    async loadWeather(overrides = {}) {
        const request = this.buildRequest(overrides);
        return this.loadWeatherRequest(request, {
            source: 'buildRequest',
            overrides
        });
    }

    async loadWeatherRequest(request, metadata = {}) {
        const hasFetchableRequest = this.hasFetchableRequest(request);

        if (!hasFetchableRequest) {
            this.setError('Enter a city or latitude and longitude before requesting weather.');
            return;
        }

        this.isLoading = true;
        this.updateOutput('errorMessage', null);

        try {
            const response = await getWeather(request);
            this.applyWeather(response);
        } catch (error) {
            this.clearWeather();
            this.setError(this.reduceError(error));
        } finally {
            this.isLoading = false;
        }
    }

    async loadRecipientOptions() {
        this.isLoadingRecipients = true;

        try {
            const recipients = this.recordId
                ? await getAccountContacts({ accountId: this.recordId })
                : await getOrgUsers();

            this.recipientOptions = Array.isArray(recipients) ? recipients : [];
            if (!this.recordId) {
                this.selectedRecipientIds = this.recipientOptions
                    .filter((option) => option.isDefault)
                    .map((option) => option.value);
            }
        } catch (error) {
            this.recipientOptions = [];
            this.setError(this.reduceError(error));
        } finally {
            this.isLoadingRecipients = false;
        }
    }

    buildRequest(overrides = {}) {
        const city = this.firstPresent(overrides.city, this.inputCity, this.city);
        const state = this.firstPresent(overrides.state, this.inputState, this.state);
        const country = this.firstPresent(overrides.country, this.inputCountry, this.country);
        const latitude = this.firstPresentDecimal(overrides.latitude, this.inputLatitude, this.latitude);
        const longitude = this.firstPresentDecimal(overrides.longitude, this.inputLongitude, this.longitude);

        const request = {
            recordId: this.recordId || null,
            city: city || null,
            state: state || null,
            country: country || null,
            latitude,
            longitude,
            contextMode: this.mode || DEFAULT_MODE
        };

        return request;
    }

    hasFetchableRequest(request = this.buildRequest()) {
        return Boolean(
            request.recordId ||
                request.city ||
                (request.latitude !== null && request.latitude !== undefined && request.longitude !== null && request.longitude !== undefined)
        );
    }

    applyWeather(response) {
        if (!response || response.hasWeather === false) {
            throw new Error('Weather data is unavailable for the requested location.');
        }

        this.weatherSource = response.source || null;
        this.updateOutput('resolvedLocation', response.resolvedLocation || null);
        this.updateOutput('resolvedLatitude', this.formatOutputNumber(response.resolvedLatitude));
        this.updateOutput('resolvedLongitude', this.formatOutputNumber(response.resolvedLongitude));
        this.updateOutput('temperature', this.normalizeString(response.temperature) || null);
        this.updateOutput('humidity', this.normalizeString(response.humidity) || null);
        this.updateOutput('windSpeed', this.normalizeString(response.windSpeed) || null);
        this.updateOutput('condition', this.normalizeString(response.condition) || null);
        this.updateOutput('iconName', response.iconName || this.mapConditionToIcon(response.condition));

        const reportText =
            response.reportText ||
            this.buildReportText({
                location: response.resolvedLocation,
                condition: response.condition,
                temperature: response.temperature,
                humidity: response.humidity,
                windSpeed: response.windSpeed
            });

        this.updateOutput('reportText', reportText);
        this.updateOutput('hasWeather', true);
        this.updateOutput('errorMessage', null);
    }

    clearWeather() {
        this.weatherSource = null;
        this.sendResultMessage = null;
        this.updateOutput('resolvedLocation', null);
        this.updateOutput('resolvedLatitude', null);
        this.updateOutput('resolvedLongitude', null);
        this.updateOutput('temperature', null);
        this.updateOutput('humidity', null);
        this.updateOutput('windSpeed', null);
        this.updateOutput('condition', null);
        this.updateOutput('iconName', null);
        this.updateOutput('reportText', null);
        this.updateOutput('hasWeather', false);
    }

    setError(message) {
        this.updateOutput('errorMessage', message);
    }

    updateOutput(propertyName, value) {
        this[propertyName] = value;
        this.dispatchEvent(new FlowAttributeChangeEvent(propertyName, value));
    }

    buildReportText({ location, condition, temperature, humidity, windSpeed }) {
        const resolvedLocation = location || 'the selected location';
        const conditionText = condition || 'unavailable conditions';
        const parts = [
            `Weather report for ${resolvedLocation}: ${conditionText}`,
            temperature ? `Temperature ${temperature} C` : null,
            humidity ? `Humidity ${humidity}%` : null,
            windSpeed ? `Wind speed ${windSpeed} kn` : null
        ].filter(Boolean);

        return parts.join(', ') + '.';
    }

    syncInputValue(propertyName, value, overwriteEmptyOnly = false) {
        const normalizedValue = this.normalizeString(value);

        if (overwriteEmptyOnly && this.normalizeString(this[propertyName])) {
            return;
        }

        this[propertyName] = normalizedValue;
    }

    normalizeString(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return typeof value === 'string' ? value.trim() : String(value).trim();
    }

    parseDecimal(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsedValue = Number.parseFloat(value);
        return Number.isNaN(parsedValue) ? null : parsedValue;
    }

    formatOutputNumber(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsedValue = Number.parseFloat(value);
        return Number.isNaN(parsedValue) ? String(value) : parsedValue.toFixed(6);
    }

    toBoolean(value) {
        return value === true || value === 'true';
    }

    toBooleanOrDefault(value, defaultValue) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }

        return this.toBoolean(value);
    }

    firstPresent(...values) {
        for (const value of values) {
            const normalizedValue = this.normalizeString(value);
            if (normalizedValue) {
                return normalizedValue;
            }
        }

        return '';
    }

    firstPresentDecimal(...values) {
        for (const value of values) {
            const parsedValue = this.parseDecimal(value);
            if (parsedValue !== null) {
                return parsedValue;
            }
        }

        return null;
    }

    formatGeolocationError(error) {
        switch (error?.code) {
            case 1:
                return 'Location access was denied by the browser.';
            case 2:
                return 'The browser could not determine the current location.';
            case 3:
                return 'The location request timed out.';
            default:
                return 'The current location could not be retrieved.';
        }
    }

    reduceError(error) {
        if (Array.isArray(error?.body)) {
            return error.body.map((item) => item.message).join(', ');
        }

        return error?.body?.message || error?.message || 'An unexpected error occurred while loading weather.';
    }

    mapConditionToIcon(condition) {
        const normalizedCondition = (condition || '').toLowerCase();

        if (normalizedCondition.includes('snow') || normalizedCondition.includes('ice')) {
            return 'snow';
        }

        if (
            normalizedCondition.includes('rain') ||
            normalizedCondition.includes('drizzle') ||
            normalizedCondition.includes('shower')
        ) {
            return 'rain';
        }

        if (normalizedCondition.includes('storm') || normalizedCondition.includes('thunder')) {
            return 'storm';
        }

        if (
            normalizedCondition.includes('cloud') ||
            normalizedCondition.includes('overcast') ||
            normalizedCondition.includes('fog')
        ) {
            return 'cloudy';
        }

        if (normalizedCondition.includes('sun') || normalizedCondition.includes('clear')) {
            return 'sunny';
        }

        return 'weather';
    }

    mapIconToGlyph(iconName) {
        switch (iconName) {
            case 'snow':
            case 'utility:snow':
                return '❄';
            case 'rain':
            case 'utility:rain':
                return '🌧';
            case 'storm':
            case 'utility:warning':
                return '⛈';
            case 'cloudy':
            case 'utility:cloudy':
                return '☁';
            case 'sunny':
            case 'utility:clear':
                return '☀';
            default:
                return '🌤';
        }
    }
}
