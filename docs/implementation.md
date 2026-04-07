# Implementation Notes

## Overview

This project delivers:
- a reusable `weatherLookup` LWC
- GeoNames weather integration through Apex
- a public Screen Flow: `[Texei] Weather Lookup`
- a public frontend under `front/` that embeds the hosted Salesforce page
- browser geolocation support
- weather display for temperature, humidity, wind speed, condition, and icon
- a `Send Weather Report` action
- sent-date updates on `Account` and `User`
- recipient pickers for contacts and org users
- HTML weather report emails

## Main Metadata

Core Salesforce files:
- `force-app/main/default/lwc/weatherLookup/*`
- `force-app/main/default/classes/WeatherController.cls`
- `force-app/main/default/classes/GeoNamesService.cls`
- `force-app/main/default/classes/WeatherReportService.cls`
- `force-app/main/default/flows/Texei_Weather_Lookup.flow-meta.xml`
- `force-app/main/default/namedCredentials/GeoNames.namedCredential-meta.xml`
- `force-app/main/default/labels/CustomLabels.labels-meta.xml`
- `force-app/main/default/objects/Account/fields/Weather_Report_Sent_Date__c.field-meta.xml`
- `force-app/main/default/objects/User/fields/Weather_Report_Sent_Date__c.field-meta.xml`

Frontend files:
- `front/app/page.tsx`
- `front/.env.example`

## Weather Behavior

Supported input paths:
1. city name
2. latitude / longitude
3. browser geolocation via `Use My Location`

Lookup flow:
1. if lat/lng is provided, call GeoNames `findNearByWeatherJSON`
2. if city is provided, call GeoNames `searchJSON`
3. resolve coordinates
4. call `findNearByWeatherJSON`
5. normalize the response for the LWC

Displayed output:
- resolved location
- temperature
- humidity
- wind speed
- current weather condition
- current weather icon

## Weather Condition Handling

GeoNames frequently returns incomplete values such as `n/a`.

`GeoNamesService` derives a usable condition from:
- `weatherCondition`
- `cloudsCode`
- `clouds`

Examples:
- `CAVOK`, `CLR`, `SKC`, `NSC`, `NCD` -> `Clear`
- `FEW`, `SCT`, `BKN`, `OVC` -> `Cloudy`

The LWC renders weather glyphs for:
- sunny
- cloudy
- rain
- snow
- storm
- fallback weather state

## Send Weather Report

The component includes a `Send Weather Report` action.

Behavior by context:
- `Account` context:
  - button label: `Send To Contacts`
  - related contacts with email addresses are loaded into a searchable multi-select picker
  - if no contacts are selected, the report is sent to all related contacts with emails
  - updates `Account.Weather_Report_Sent_Date__c`
- non-`Account` context:
  - button label: `Send To Org Users`
  - active org users with email addresses are loaded into a searchable multi-select picker
  - the current authenticated user is preselected by default
  - if no users are selected, the report is sent to all org users with emails
  - updates `User.Weather_Report_Sent_Date__c`

Guest/public note:
- guest users do not get a current-user default
- the org-user picker is intended for authenticated internal context, not anonymous public guest usage

Email format:
- plain-text summary
- HTML card layout with location, condition, temperature, humidity, and wind speed

## Public Flow

Flow file:
- `force-app/main/default/flows/Texei_Weather_Lookup.flow-meta.xml`

Current flow characteristics:
- single-screen flow
- active
- intended for public embedding
- runs in `SystemModeWithoutSharing`
- uses `c:weatherLookup`
- header hidden for cleaner public presentation

Current screen behavior:
- enter city or coordinates
- use browser location
- view weather summary
- send the weather report from the same screen

## GeoNames Configuration

The project uses:
- Named Credential: `GeoNames`
- Custom Label: `GeoNames_Username`

Current endpoint:
- `https://secure.geonames.org`

Important note:
- `https://api.geonames.org` had TLS/certificate issues from Salesforce during implementation
- `https://secure.geonames.org` works correctly for callouts in this org

## Apex Notes

`WeatherController.getWeather(...)` uses a flattened method signature instead of a nested Aura wrapper parameter.

This was required because the original wrapper approach dropped lat/lng values during live Flow deserialization.

Current weather entry point:

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

Additional Apex endpoints:

```apex
WeatherController.sendWeatherReport(...)
WeatherController.getAccountContacts(Id accountId)
WeatherController.getOrgUsers()
```

## LWC Notes

The component is exposed for:
- `lightning__FlowScreen`
- `lightning__HomePage`
- `lightning__RecordPage`

Flow inputs:
- `recordId`
- `city`
- `state`
- `country`
- `latitude`
- `longitude`
- `mode`
- `allowBrowserLocation`
- `autoLoad`

Flow outputs:
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

## External Hosting In `front/`

The repository includes a Next.js frontend under `front/`.

Current frontend behavior:
- centered title
- centered embedded Salesforce page
- no extra scrolling in the Next.js shell

The frontend embeds the hosted Salesforce page in an iframe.

Required env variable:

```bash
NEXT_PUBLIC_SF_PUBLIC_FLOW_URL=https://your-public-site-domain.example.com/texeiweatherpage/
```

The iframe includes `allow="geolocation"` so the embedded page can still use browser location.

If you expose the flow through a public site page wrapper, use that page URL here rather than a guessed `/flow/...` route.

## Localhost Framing Setup

If the Salesforce page fails inside the frontend iframe with an error like:

```text
Framing 'https://...my.site.com/' violates the following Content Security Policy directive: "frame-ancestors 'self'".
```

the issue is on the Salesforce site side, not the Next.js app.

To allow localhost or another external host to embed the page:
1. open `Setup -> Digital Experiences -> All Sites`
2. open the site
3. go to site security settings
4. add the external origin to trusted iframe / trusted domains settings
5. for local development, add the exact origin such as `http://localhost:3000`
6. publish the site again

The origin must match exactly, including protocol and port.

## Deployment

Typical deploy command:

```powershell
sf project deploy start --source-dir force-app/main/default --target-org texei-test --wait 10
```

Frontend build command:

```powershell
npm run build
```

Run it from `front/`.

## Validation

Validated in org:
- GeoNames callout through Named Credential
- city lookup
- direct lat/lng lookup
- browser geolocation path in the LWC
- active Screen Flow deployment
- condition icon rendering after normalization
- Account contact recipient loading
- org user recipient loading
- current-user default selection for org users
- send-report metadata deployment

Example weather result:
- `Temperature: 17 C`
- `Humidity: 48%`
- `Wind Speed: 05 kn`
- `Condition: Clear`
- `Icon: sunny`

## Deployed URLs

Frontend:
- `https://sf-weather-app-external-site.vercel.app/`

Salesforce public page:
- `https://curious-hawk-k5iriy-dev-ed.trailblaze.my.site.com/texeiweatherpage/`

## Security Note

Do not commit passwords or org credentials to source control.
The repository intentionally keeps credentials out of tracked files.
