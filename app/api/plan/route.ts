import { NextRequest, NextResponse } from "next/server";

type TravelMode = "private" | "public" | "hybrid";

type Location = {
  name: string;
  lat: number;
  lon: number;
  displayName: string;
};

type RouteData = {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][];
  modeLabel: string;
};

type WeatherDay = {
  date: string;
  description: string;
  temp: number;
  min: number;
  rain: number;
};

type Poi = {
  name: string;
  category: string;
  lat: number;
  lon: number;
};

type ItineraryDay = {
  day: number;
  date: string;
  title: string;
  area: string;
  summary: string;
  morning: string;
  afternoon: string;
  evening: string;
  why: string;
  pace: string;
  tags: string[];
};

type TripRequest = {
  origin?: string;
  destination?: string;
  mode?: TravelMode;
  style?: string;
  interests?: string[];
  start?: string;
  end?: string;
  durationDays?: number;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type OsrmResponse = {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }>;
};

type OpenMeteoResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
};

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { name?: string; tourism?: string; historic?: string; leisure?: string; natural?: string; amenity?: string };
};

const headers = {
  "User-Agent": "Waypoint Travel Planner/3.0",
};

const WEATHER_LABELS: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
  55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
  81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorm",
};

const INTEREST_TERMS: Record<string, string[]> = {
  Mountains: ["peak", "viewpoint", "nature", "park", "hill"],
  Beaches: ["beach", "coast", "water"],
  Culture: ["museum", "heritage", "historic", "temple", "monument"],
  Food: ["restaurant", "cafe", "market"],
  Adventure: ["park", "sport", "nature", "peak"],
  Nature: ["park", "nature", "water", "forest"],
  Wellness: ["spa", "wellness", "yoga"],
  Nightlife: ["bar", "pub", "nightclub"],
  Photography: ["viewpoint", "historic", "nature", "monument"],
  "Road trip": ["viewpoint", "nature", "historic"],
};

async function geocode(query: string): Promise<Location> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error("Location search is temporarily unavailable.");
  const data = (await response.json()) as NominatimResult[];
  if (!data.length) throw new Error(`Could not find "${query}". Try a city, landmark or region.`);
  return {
    name: data[0].display_name.split(",")[0],
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    displayName: data[0].display_name,
  };
}

async function getRoadRoute(origin: Location, destination: Location): Promise<RouteData> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
    `?overview=full&geometries=geojson`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Route service is temporarily unavailable.");
  const data = (await response.json()) as OsrmResponse;
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("No road route could be found.");
  const route = data.routes[0];
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry.coordinates,
    modeLabel: "Road backbone",
  };
}

async function getWeather(destination: Location): Promise<WeatherDay[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${destination.lat}` +
    `&longitude=${destination.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=7`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];
  const data = (await response.json()) as OpenMeteoResponse;
  const d = data.daily;
  if (!d?.time || !d.weather_code || !d.temperature_2m_max || !d.temperature_2m_min || !d.precipitation_probability_max) return [];
  return d.time.slice(0, 7).map((date, i) => ({
    date,
    description: WEATHER_LABELS[d.weather_code![i]] ?? "Mixed conditions",
    temp: d.temperature_2m_max![i],
    min: d.temperature_2m_min![i],
    rain: d.precipitation_probability_max![i],
  }));
}

async function getPois(destination: Location): Promise<Poi[]> {
  const radius = 18000;
  const query = `[out:json][timeout:20];(
    node["tourism"~"attraction|museum|viewpoint|gallery"](around:${radius},${destination.lat},${destination.lon});
    node["historic"](around:${radius},${destination.lat},${destination.lon});
    node["natural"](around:${radius},${destination.lat},${destination.lon});
    node["leisure"~"park|nature_reserve"](around:${radius},${destination.lat},${destination.lon});
    node["amenity"~"restaurant|cafe|bar"](around:${radius},${destination.lat},${destination.lon});
  );out center;`;
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain", ...headers },
      body: query,
      cache: "no-store",
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { elements: OverpassElement[] };
    const seen = new Set<string>();
    return data.elements
      .map((e) => {
        const lat = e.lat ?? e.center?.lat;
        const lon = e.lon ?? e.center?.lon;
        const tags = e.tags ?? {};
        const name = tags.name;
        const category = tags.tourism ?? tags.historic ?? tags.natural ?? tags.leisure ?? tags.amenity ?? "place";
        if (!name || lat == null || lon == null) return null;
        return { name, category, lat, lon };
      })
      .filter((p): p is Poi => Boolean(p))
      .filter((p) => {
        const key = `${p.name}|${p.lat.toFixed(3)}|${p.lon.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 80);
  } catch {
    return [];
  }
}

function selectPois(pois: Poi[], interests: string[], style: string, days: number): Poi[] {
  const terms = interests.flatMap((interest) => INTEREST_TERMS[interest] ?? []);
  const scored = pois.map((poi) => {
    let score = 0;
    const text = `${poi.name} ${poi.category}`.toLowerCase();
    for (const term of terms) if (text.includes(term)) score += 4;
    if (style === "Scenic" && /view|nature|natural|park/.test(text)) score += 3;
    if (style === "Culture" && /historic|museum|temple|monument/.test(text)) score += 3;
    if (style === "Slow travel" && /cafe|park|nature|view/.test(text)) score += 2;
    return { poi, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, Math.max(12, days * 4)).map((x) => x.poi);
}

function addDays(start: string, count: number): string[] {
  const base = new Date(`${start}T12:00:00`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function displayDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", weekday: "short" }).format(new Date(`${date}T12:00:00`));
}

function buildItinerary(
  origin: Location,
  destination: Location,
  days: number,
  start: string,
  style: string,
  interests: string[],
  pois: Poi[],
  weather: WeatherDay[],
  mode: TravelMode,
): ItineraryDay[] {
  const dates = addDays(start, days);
  const chosen = selectPois(pois, interests, style, days);
  const chunks = Array.from({ length: Math.max(1, days - 1) }, () => [] as Poi[]);
  chosen.forEach((poi, i) => chunks[i % chunks.length].push(poi));
  const interest = interests[0] ?? "Nature";

  return dates.map((date, i) => {
    if (i === 0) {
      return {
        day: 1, date, title: `Travel to ${destination.name}`, area: `${origin.name} → ${destination.name}`,
        summary: `Leave ${origin.name}, arrive in ${destination.name}, check in and keep the evening intentionally light.`,
        morning: mode === "public" ? "Use the best available public-transport connection for the departure." : "Begin the journey from your starting point.",
        afternoon: `Arrive in ${destination.name}, check in and orient yourself around the neighbourhood.`,
        evening: "Easy local walk, dinner and an early night.",
        why: "The first day is treated as a transfer day, so the destination experience starts after arrival rather than being wasted on a fictional 'arrival in the origin'.",
        pace: "Light", tags: ["Transfer", "Check-in", interest],
      };
    }
    const dayPois = chunks[i - 1] ?? [];
    const first = dayPois[0]?.name ?? `${interest} experience`;
    const second = dayPois[1]?.name ?? "Explore a local neighbourhood";
    const third = dayPois[2]?.name ?? "Local dinner";
    const rain = weather.find((w) => w.date === date)?.rain ?? 0;
    const outdoor = rain >= 60 ? "Keep the outdoor portion flexible and move it to the clearest window." : "Use the best weather window for the outdoor portion.";
    const titleOptions = [
      `Discover ${destination.name}`,
      `The ${interest.toLowerCase()} day`,
      `Beyond the obvious`,
      `A slower side of ${destination.name}`,
      `Local rhythm & hidden corners`,
    ];
    return {
      day: i + 1, date, title: titleOptions[(i - 1) % titleOptions.length],
      area: `${destination.name} & nearby`,
      summary: `A ${style.toLowerCase()} day built around ${interest.toLowerCase()}, with enough slack to wander rather than race between pins.`,
      morning: `${first}. Start early enough to have the place before the busiest period.`,
      afternoon: `${second}. ${outdoor}`,
      evening: `${third}. Finish with an unhurried meal and time back at your stay.`,
      why: `Selected around your ${interest.toLowerCase()} preference and the shape of the trip, not as a generic checklist.`,
      pace: style === "Packed" ? "Full" : style === "Slow travel" ? "Easy" : "Balanced",
      tags: [interest, dayPois[0]?.category ?? "Explore", rain >= 60 ? "Weather-aware" : "Outdoor window"],
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TripRequest;
    if (!body.origin?.trim() || !body.destination?.trim()) {
      return NextResponse.json({ error: "Please enter both an origin and destination." }, { status: 400 });
    }
    const start = body.start || new Date().toISOString().slice(0, 10);
    const requestedDays = Number(body.durationDays);
    const days = Number.isFinite(requestedDays) && requestedDays > 0
      ? Math.min(30, Math.round(requestedDays))
      : body.end
        ? Math.min(30, Math.max(1, Math.round((new Date(body.end).getTime() - new Date(start).getTime()) / 86400000) + 1))
        : 5;
    const mode: TravelMode = body.mode === "public" || body.mode === "hybrid" ? body.mode : "private";
    const style = body.style || "Balanced";
    const interests = Array.isArray(body.interests) ? body.interests.filter((x): x is string => typeof x === "string") : [];
    const [origin, destination] = await Promise.all([geocode(body.origin), geocode(body.destination)]);
    const [route, weather, pois] = await Promise.all([getRoadRoute(origin, destination), getWeather(destination), getPois(destination)]);
    const itinerary = buildItinerary(origin, destination, days, start, style, interests, pois, weather, mode);
    const wetDays = weather.filter((w) => w.rain >= 60).length;
    const notes = [
      wetDays ? `${wetDays} forecast day(s) have a 60%+ precipitation probability. Outdoor blocks are flagged so the plan can flex.` : "No major precipitation signal in the current 7-day destination forecast.",
      mode === "private" ? "Private transport is planned around the road network." : mode === "public" ? "Public transport is your preferred mode. The displayed route is the road backbone; live train/bus inventory requires a dedicated transit provider." : "Hybrid travel lets you combine public transport for the long leg with private/local transfers.",
      route.distanceKm > 500 ? "For a long transfer, consider a break or overnight stop if the journey becomes tiring." : "The transfer is short enough to keep the first destination day useful after arrival.",
      "Weather and route data are live web data at planning time; traffic incidents and closures can change after the plan is generated.",
    ];
    return NextResponse.json({
      origin, destination,
      route: { ...route, modeLabel: mode === "private" ? "Private transport" : mode === "public" ? "Public transport" : "Mixed / hybrid" },
      weather: weather.map((w) => ({ ...w, label: w.rain >= 60 ? "Rain risk" : "Good window" })),
      pois: pois.slice(0, 30),
      notes,
      days: itinerary,
      trip: { start, days, end: datesEnd(start, days), mode, style, interests },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Waypoint could not build this trip.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function datesEnd(start: string, days: number): string {
  const dates = addDays(start, days);
  return dates[dates.length - 1];
}
