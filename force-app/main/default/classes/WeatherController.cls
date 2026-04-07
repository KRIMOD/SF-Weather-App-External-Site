public with sharing class WeatherController {
    public class WeatherRequest {
        public Id recordId;
        public String city;
        public String state;
        public String country;
        public Decimal latitude;
        public Decimal longitude;
        public String contextMode;
    }

    public class WeatherResult {
        @AuraEnabled public String resolvedLocation;
        @AuraEnabled public Decimal resolvedLatitude;
        @AuraEnabled public Decimal resolvedLongitude;
        @AuraEnabled public String temperature;
        @AuraEnabled public String humidity;
        @AuraEnabled public String windSpeed;
        @AuraEnabled public String condition;
        @AuraEnabled public String iconName;
        @AuraEnabled public String reportText;
        @AuraEnabled public Boolean hasWeather;
        @AuraEnabled public String source;
    }

    @AuraEnabled(cacheable=false)
    public static WeatherResult getWeather(
        Id recordId,
        String city,
        String state,
        String country,
        Decimal latitude,
        Decimal longitude,
        String contextMode
    ) {
        try {
            WeatherRequest request = new WeatherRequest();
            request.recordId = recordId;
            request.city = city;
            request.state = state;
            request.country = country;
            request.latitude = latitude;
            request.longitude = longitude;
            request.contextMode = contextMode;

            return GeoNamesService.getWeather(request);
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
}