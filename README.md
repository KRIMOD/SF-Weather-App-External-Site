# Texei Weather Lookup

Salesforce weather lookup assessment with a public Salesforce-hosted flow and a simple Next.js host app.

## Includes

- reusable `weatherLookup` LWC
- GeoNames weather integration
- public Screen Flow: `Texei_Weather_Lookup`
- public frontend: `https://sf-weather-app-external-site.vercel.app/`
- weather report email sending
- recipient pickers for contacts and org users
- sent-date updates on `Account` and `User`

## Main Links

- GitHub: `https://github.com/KRIMOD/SF-Weather-App-External-Site`
- Frontend: `https://sf-weather-app-external-site.vercel.app/`
- Salesforce public page: `https://curious-hawk-k5iriy-dev-ed.trailblaze.my.site.com/texeiweatherpage/`

## Main Files

- `force-app/main/default/lwc/weatherLookup/*`
- `force-app/main/default/classes/WeatherController.cls`
- `force-app/main/default/classes/GeoNamesService.cls`
- `force-app/main/default/classes/WeatherReportService.cls`
- `force-app/main/default/flows/Texei_Weather_Lookup.flow-meta.xml`
- `front/app/page.tsx`

## Docs

- `docs/implementation.md`

## Notes

- GeoNames uses the `GeoNames` Named Credential and `GeoNames_Username` custom label.
- The frontend embeds the Salesforce public page in an iframe.
- For localhost iframe testing, add your frontend origin to the Experience Cloud trusted iframe / trusted domains settings.

## Security

Do not commit org or service passwords to source control.
