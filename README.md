# Waypoint v2

A Vercel-ready full-stack travel planner. It geocodes places, builds routes, checks live weather forecasts, and generates a preference-aware itinerary skeleton.

## Stack
- Next.js 15 + React 19 + TypeScript
- OpenStreetMap Nominatim for geocoding
- OSRM for routing
- Open-Meteo for forecast data
- Leaflet / OpenStreetMap tiles for the interactive map

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Deploy to Vercel
1. Create a Git repository and upload this project.
2. Import the repository into Vercel.
3. Framework preset: Next.js.
4. Build command: `next build` (Vercel detects this automatically).
5. No API key is required for the included public-data services.

## Important production note
The included routing source provides route geometry and estimated travel time, but not authoritative live traffic or road-closure information. For a commercial production release, add a licensed traffic/road-incident provider and cache/geocode responsibly in accordance with each provider's terms.
