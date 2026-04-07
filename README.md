# Texei Weather Lookup

Salesforce implementation for the weather coding assessment.

This project currently delivers:
- a reusable `weatherLookup` LWC
- an Apex integration to GeoNames weather services
- an active public-facing Screen Flow: `[Texei] Weather Lookup`
- browser geolocation support for the public website use case
- weather metrics display for temperature, humidity, wind speed, and condition icon

This project does not yet deliver:
- the `Send Weather Report` action
- the `Last Report Sent` field update flow

## Implemented Solution

The current implementation is built around a single reusable LWC that can run in:
- `lightning__FlowScreen`
- `lightning__HomePage`
- `lightning__RecordPage` on `Account`

For the public website scenario, the LWC is hosted inside the active flow `Texei_Weather_Lookup`.

## Main Metadata

Core files:
- `force-app/main/default/lwc/weatherLookup/*`
- `force-app/main/default/classes/WeatherController.cls`
- `force-app/main/default/classes/GeoNamesService.cls`
- `force-app/main/default/flows/Texei_Weather_Lookup.flow-meta.xml`
- `force-app/main/default/namedCredentials/GeoNames.namedCredential-meta.xml`
- `force-app/main/default/labels/CustomLabels.labels-meta.xml`

## Functional Behavior

The component supports three input paths:
1. manual city lookup
2. manual latitude / longitude lookup
3. browser geolocation via `Use My Location`

The lookup flow is:
1. If lat/lng is provided, call GeoNames `findNearByWeatherJSON`
2. If city is provided, call GeoNames `searchJSON`
3. Use the resolved coordinates to call `findNearByWeatherJSON`
4. Normalize the response for the LWC

Displayed output:
- resolved location
- temperature
- humidity
- wind speed
- current weather condition
- current weather condition icon

## Weather Condition Icon Handling

GeoNames often returns incomplete weather condition text such as `n/a`.

To handle that, `GeoNamesService` derives a usable condition from:
- `weatherCondition`
- `cloudsCode`
- `clouds`

Examples:
- `CAVOK`, `CLR`, `SKC`, `NSC`, `NCD` -> `Clear`
- `FEW`, `SCT`, `BKN`, `OVC` -> `Cloudy`

The LWC renders a visual weather glyph for:
- sunny
- cloudy
- rain
- snow
- storm
- fallback weather state

## Public Flow

Flow file:
- `force-app/main/default/flows/Texei_Weather_Lookup.flow-meta.xml`

Flow characteristics:
- single-screen flow
- active status
- intended for public website embedding
- uses the `c:weatherLookup` LWC directly
- includes a short intro text for end users

Current flow screen behavior:
- user can enter city or coordinates
- user can use browser location
- user sees live weather summary on the same screen

## GeoNames Configuration

The project uses:
- Named Credential: `GeoNames`
- Custom Label: `GeoNames_Username`

Current endpoint:
- `https://secure.geonames.org`

Important note:
- `https://api.geonames.org` had TLS/certificate issues from Salesforce during implementation
- `https://secure.geonames.org` works correctly for Salesforce callouts in this org

Named Credential metadata:
- `force-app/main/default/namedCredentials/GeoNames.namedCredential-meta.xml`

Username label metadata:
- `force-app/main/default/labels/CustomLabels.labels-meta.xml`

## Apex Notes

`WeatherController.getWeather(...)` uses a flattened method signature instead of taking a nested Aura wrapper parameter.

This change was required because the original nested request object caused lat/lng values sent from the LWC to be lost during server-side deserialization in the live flow path.

Current Apex entry point:

```apex
WeatherController.getWeather(
    Id recordId,
    String city,
    String state,
    String country,
    Decimal latitude,
    Decimal longitude,
    String contextMode
)
```

## LWC Notes

The component keeps support for Flow, Home page, and Account record page.

Flow input properties:
- `recordId`
- `city`
- `state`
- `country`
- `latitude`
- `longitude`
- `mode`
- `allowBrowserLocation`
- `autoLoad`

Flow output properties:
- `resolvedLocation`
- `resolvedLatitude`
- `resolvedLongitude`
- `temperature`
- `humidity`
- `windSpeed`
- `condition`
- `iconName`
- `reportText`
- `hasWeather`
- `errorMessage`

## Deployment

Typical deploy command:

```powershell
sf project deploy start --source-dir force-app/main/default --target-org texei-test --wait 10
```

## Manual Validation Completed

Validated in org:
- GeoNames callout through Named Credential
- city lookup
- direct lat/lng lookup
- browser geolocation path in the LWC
- active Screen Flow deployment
- condition icon rendering after condition normalization

Example verified response path:
- coordinates around Paris
- `Temperature: 17 C`
- `Humidity: 48%`
- `Wind Speed: 05 kn`
- `Condition: Clear`
- `Icon: sunny`

## Remaining Work

To fully complete the original assessment, still add:
1. `Send Weather Report` action from the component or flow
2. recipient resolution by context
3. last-sent field update on `Account` or `User`
4. public-site page hosting details and final hosted URL

## Test Credentials

Salesforce:
- use the target org credentials shared out of band

GeoNames:
- username is configured in `CustomLabels`
- keep passwords and org credentials out of source control
