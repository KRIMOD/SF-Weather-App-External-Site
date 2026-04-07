public with sharing class GeoNamesService {
    private static final String BASE_ENDPOINT = 'callout:GeoNames';

    public class WeatherServiceException extends Exception {
    }

    public static WeatherController.WeatherResult getWeather(WeatherController.WeatherRequest request) {
        if (request == null) {
            throw new WeatherServiceException('Provide a city or latitude and longitude.');
        }

        WeatherLocation location = resolveLocation(request);
        WeatherObservation observation = fetchWeather(location.latitude, location.longitude);

        WeatherController.WeatherResult result = new WeatherController.WeatherResult();
        result.resolvedLocation = location.label;
        result.resolvedLatitude = observation.lat != null ? observation.lat : location.latitude;
        result.resolvedLongitude = observation.lng != null ? observation.lng : location.longitude;
        result.temperature = trimToNull(observation.temperature);
        result.humidity = trimToNull(observation.humidity);
        result.windSpeed = trimToNull(observation.windSpeed);
        result.condition = deriveCondition(observation);
        result.iconName = mapConditionToIcon(result.condition);
        result.source = trimToNull(observation.stationName);
        result.reportText = buildReportText(result);
        result.hasWeather = true;
        return result;
    }

    private static WeatherLocation resolveLocation(WeatherController.WeatherRequest request) {
        if (request.latitude != null && request.longitude != null) {
            return new WeatherLocation(
                request.latitude,
                request.longitude,
                buildLocationLabel(request.city, request.state, request.country, 'Custom coordinates')
            );
        }

        if (request.recordId != null) {
            Account accountRecord = [
                SELECT Name, BillingCity, BillingState, BillingCountry, BillingLatitude, BillingLongitude
                FROM Account
                WHERE Id = :request.recordId
                LIMIT 1
            ];

            if (accountRecord.BillingLatitude != null && accountRecord.BillingLongitude != null) {
                return new WeatherLocation(
                    accountRecord.BillingLatitude,
                    accountRecord.BillingLongitude,
                    accountRecord.Name
                );
            }

            String accountCity = trimToNull(accountRecord.BillingCity);
            if (accountCity == null) {
                throw new WeatherServiceException('The Account does not have a billing city or coordinates.');
            }

            return searchCity(accountCity, accountRecord.BillingState, accountRecord.BillingCountry);
        }

        if (String.isBlank(request.city)) {
            throw new WeatherServiceException('Enter a city or latitude and longitude before requesting weather.');
        }

        return searchCity(request.city, request.state, request.country);
    }

    private static WeatherLocation searchCity(String city, String state, String country) {
        List<String> queryParts = new List<String>();
        addIfPresent(queryParts, city);
        addIfPresent(queryParts, state);
        addIfPresent(queryParts, country);

        String query = String.join(queryParts, ' ').trim();

        SearchResponse response = (SearchResponse) JSON.deserialize(
            sendRequest(
                '/searchJSON?q=' + encode(query) + '&maxRows=1&featureClass=P&username=' + encode(getUsername())
            ),
            SearchResponse.class
        );

        handleStatus(response != null ? response.status : null);

        if (response == null || response.geonames == null || response.geonames.isEmpty()) {
            throw new WeatherServiceException('No location match was found for the provided city.');
        }

        SearchGeoname match = response.geonames[0];
        if (match.lat == null || match.lng == null) {
            throw new WeatherServiceException('The selected city could not be converted into coordinates.');
        }

        return new WeatherLocation(match.lat, match.lng, buildLocationLabel(match.name, match.adminName1, match.countryName, city));
    }

    private static WeatherObservation fetchWeather(Decimal latitude, Decimal longitude) {
        WeatherResponse response = (WeatherResponse) JSON.deserialize(
            sendRequest(
                '/findNearByWeatherJSON?lat=' +
                    encode(String.valueOf(latitude)) +
                    '&lng=' +
                    encode(String.valueOf(longitude)) +
                    '&username=' +
                    encode(getUsername())
            ),
            WeatherResponse.class
        );

        handleStatus(response != null ? response.status : null);

        if (response == null || response.weatherObservation == null) {
            throw new WeatherServiceException('Weather data is unavailable for the requested location.');
        }

        return response.weatherObservation;
    }

    private static String sendRequest(String path) {
        HttpRequest request = new HttpRequest();
        request.setMethod('GET');
        request.setEndpoint(BASE_ENDPOINT + path);
        request.setTimeout(10000);

        HttpResponse response = new Http().send(request);
        if (response.getStatusCode() >= 400 && String.isBlank(response.getBody())) {
            throw new WeatherServiceException('GeoNames request failed with status ' + response.getStatusCode() + '.');
        }

        return response.getBody();
    }

    private static void handleStatus(GeoNamesStatus status) {
        if (status != null && !String.isBlank(status.message)) {
            throw new WeatherServiceException(status.message);
        }
    }

    private static String encode(String value) {
        return EncodingUtil.urlEncode(value, 'UTF-8');
    }

    private static String getUsername() {
        String username = trimToNull(System.Label.GeoNames_Username);
        if (username == null) {
            throw new WeatherServiceException('GeoNames username is not configured.');
        }

        return username;
    }

    private static String trimToNull(String value) {
        if (String.isBlank(value)) {
            return null;
        }

        return value.trim();
    }

    private static Boolean isMeaningfulWeatherValue(String value) {
        String trimmedValue = trimToNull(value);
        return trimmedValue != null && !trimmedValue.equalsIgnoreCase('n/a');
    }

    private static void addIfPresent(List<String> values, String value) {
        String trimmedValue = trimToNull(value);
        if (trimmedValue != null) {
            values.add(trimmedValue);
        }
    }

    private static String deriveCondition(WeatherObservation observation) {
        String directCondition = trimToNull(observation.weatherCondition);
        if (isMeaningfulWeatherValue(directCondition)) {
            return directCondition;
        }

        String normalizedCloudCode = trimToNull(observation.cloudsCode);
        if (normalizedCloudCode != null) {
            normalizedCloudCode = normalizedCloudCode.toUpperCase();
            if (new Set<String>{ 'CAVOK', 'CLR', 'SKC', 'NSC', 'NCD' }.contains(normalizedCloudCode)) {
                return 'Clear';
            }
            if (new Set<String>{ 'FEW', 'SCT', 'BKN', 'OVC' }.contains(normalizedCloudCode)) {
                return 'Cloudy';
            }
        }

        String cloudCondition = trimToNull(observation.clouds);
        if (isMeaningfulWeatherValue(cloudCondition)) {
            if (cloudCondition.equalsIgnoreCase('clouds and visibility ok')) {
                return 'Clear';
            }
            return cloudCondition;
        }

        return 'Current conditions unavailable';
    }

    private static String buildLocationLabel(String city, String state, String country, String fallbackLabel) {
        List<String> parts = new List<String>();
        if (trimToNull(city) != null) {
            parts.add(city.trim());
        }
        if (trimToNull(state) != null) {
            parts.add(state.trim());
        }
        if (trimToNull(country) != null) {
            parts.add(country.trim());
        }

        return parts.isEmpty() ? fallbackLabel : String.join(parts, ', ');
    }

    private static String buildReportText(WeatherController.WeatherResult result) {
        List<String> parts = new List<String>{
            'Weather report for ' + result.resolvedLocation + ': ' + result.condition
        };

        if (!String.isBlank(result.temperature)) {
            parts.add('Temperature ' + result.temperature + ' C');
        }
        if (!String.isBlank(result.humidity)) {
            parts.add('Humidity ' + result.humidity + '%');
        }
        if (!String.isBlank(result.windSpeed)) {
            parts.add('Wind speed ' + result.windSpeed + ' kn');
        }

        return String.join(parts, ', ') + '.';
    }

    private static String mapConditionToIcon(String condition) {
        String normalizedCondition = String.valueOf(condition).toLowerCase();

        if (normalizedCondition.contains('snow') || normalizedCondition.contains('ice')) {
            return 'snow';
        }
        if (
            normalizedCondition.contains('rain') ||
            normalizedCondition.contains('drizzle') ||
            normalizedCondition.contains('shower')
        ) {
            return 'rain';
        }
        if (normalizedCondition.contains('storm') || normalizedCondition.contains('thunder')) {
            return 'storm';
        }
        if (
            normalizedCondition.contains('cloud') ||
            normalizedCondition.contains('overcast') ||
            normalizedCondition.contains('fog')
        ) {
            return 'cloudy';
        }
        if (normalizedCondition.contains('sun') || normalizedCondition.contains('clear')) {
            return 'sunny';
        }

        return 'weather';
    }

    private class WeatherLocation {
        private Decimal latitude;
        private Decimal longitude;
        private String label;

        private WeatherLocation(Decimal latitude, Decimal longitude, String label) {
            this.latitude = latitude;
            this.longitude = longitude;
            this.label = label;
        }
    }

    private class SearchResponse {
        private List<SearchGeoname> geonames;
        private GeoNamesStatus status;
    }

    private class SearchGeoname {
        private String name;
        private String adminName1;
        private String countryName;
        private Decimal lat;
        private Decimal lng;
    }

    private class WeatherResponse {
        private WeatherObservation weatherObservation;
        private GeoNamesStatus status;
    }

    private class WeatherObservation {
        private Decimal lat;
        private Decimal lng;
        private String stationName;
        private String temperature;
        private String humidity;
        private String windSpeed;
        private String weatherCondition;
        private String clouds;
        private String cloudsCode;
    }

    private class GeoNamesStatus {
        private Integer value;
        private String message;
    }
}