# Waypoint v3

Waypoint is an internet-connected travel planning prototype.

## Core behavior

- Travel modes: Private transport, Public transport, Mixed journey.
- Trip duration is explicitly treated as destination time.
- Day 1 is the transfer from origin to destination.
- Remaining days are destination exploration days.
- Start date and destination-day duration generate calendar dates.
- Destination POIs are discovered from OpenStreetMap/Overpass.
- Weather comes from Open-Meteo.
- Road backbone comes from OSRM.
- Itinerary is shaped from interests, style, weather and discovered places.

## Important data limitation

The public/mixed transport UI is intentional, but the current free backend does not provide live bus/train inventory or public-transit routing. For those modes, Waypoint uses the road route as a geographic backbone and explicitly tells the traveller that a dedicated transit provider is required for live schedules.

## Deploy

Push to GitHub and import the repository into Vercel. No environment variables are required for this prototype.
