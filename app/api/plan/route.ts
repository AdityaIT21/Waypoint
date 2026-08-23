import { NextRequest, NextResponse } from "next/server";

type TravelMode = "driving" | "cycling" | "walking";

type Location = {
  name: string;
  lat: number;
  lon: number;
  country: string;
};

type RouteData = {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][];
};

type WeatherDay = {
  date: string;
  description: string;
  temp: number;
  min: number;
  rain: number;
};

type ItineraryDay = {
  title: string;
  summary: string;
  activities: string[];
};

type TripRequest = {
  origin?: string;
  destination?: string;
  mode?: TravelMode;
  style?: string;
  interests?: string[];
  start?: string;
  end?: string;
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
    geometry: {
      coordinates: [number, number][];
    };
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

const headers = {
  "User-Agent": "Waypoint/2.0 travel planner",
};

const WEATHER_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

async function geocode(query: string): Promise<Location> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Geocoding service unavailable.");
  }

  const data = (await response.json()) as NominatimResult[];

  if (!data.length) {
    throw new Error(
      `Could not find "${query}". Try a city, landmark or region.`
    );
  }

  const result = data[0];

  return {
    name: result.display_name.split(",")[0],
    lat: Number(result.lat),
    lon: Number(result.lon),
    country: result.display_name,
  };
}

async function getRoute(
  origin: Location,
  destination: Location,
  mode: TravelMode
): Promise<RouteData> {
  const profile =
    mode === "cycling"
      ? "bike"
      : mode === "walking"
        ? "foot"
        : "car";

  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${origin.lon},${origin.lat};${destination.lon},${destination.lat}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Routing service unavailable.");
  }

  const data = (await response.json()) as OsrmResponse;

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No route found for those locations.");
  }

  const route = data.routes[0];

  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry.coordinates,
  };
}

async function getWeather(
  location: Location
): Promise<WeatherDay[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${location.lat}` +
    `&longitude=${location.lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto` +
    `&forecast_days=7`;

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as OpenMeteoResponse;

  const daily = data.daily;

  if (
    !daily?.time ||
    !daily.weather_code ||
    !daily.temperature_2m_max ||
    !daily.temperature_2m_min ||
    !daily.precipitation_probability_max
  ) {
    return [];
  }

  return daily.time.slice(0, 7).map(
    (date: string, index: number): WeatherDay => ({
      date,
      description:
        WEATHER_LABELS[daily.weather_code![index]] ??
        "Mixed conditions",
      temp: daily.temperature_2m_max![index],
      min: daily.temperature_2m_min![index],
      rain: daily.precipitation_probability_max![index],
    })
  );
}

function calculateTripDays(
  start?: string,
  end?: string,
  distanceKm?: number
): number {
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const difference =
      Math.round(
        (endDate.getTime() - startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    if (difference > 0) {
      return Math.min(14, difference);
    }
  }

  const distanceBasedDays = Math.ceil((distanceKm ?? 0) / 250);

  return Math.max(
    1,
    Math.min(7, distanceBasedDays || 1)
  );
}

function makeItinerary(
  origin: Location,
  destination: Location,
  style: string,
  interests: string[],
  distanceKm: number,
  start?: string,
  end?: string
): ItineraryDay[] {
  const numberOfDays = calculateTripDays(
    start,
    end,
    distanceKm
  );

  const primaryInterests =
    interests.length > 0 ? interests : ["Nature"];

  return Array.from(
    { length: numberOfDays },
    (_, index): ItineraryDay => {
      const interest =
        primaryInterests[
          index % primaryInterests.length
        ];

      const isFirstDay = index === 0;
      const isLastDay = index === numberOfDays - 1;

      let title: string;
      let summary: string;

      if (isFirstDay) {
        title = `Arrive in ${origin.name}`;

        summary =
          "Settle in, orient yourself and keep the first day deliberately light.";
      } else if (isLastDay) {
        title = `Reach ${destination.name}`;

        summary =
          "Make the final approach part of the experience rather than treating it as only a transfer.";
      } else {
        title = `Day ${index + 1} — explore at your pace`;

        summary =
          `A ${style.toLowerCase()} day shaped around ${interest.toLowerCase()}.`;
      }

      const activities = [
        interest,
        style === "Slow travel"
          ? "Long lunch"
          : "Local food",
        index % 2 === 0
          ? "Neighbourhood walk"
          : "Scenic stop",
      ];

      return {
        title,
        summary,
        activities,
      };
    }
  );
}

function buildTripNotes(
  route: RouteData,
  weather: WeatherDay[]
): string[] {
  const notes: string[] = [];

  const rainyDays = weather.filter(
    (day: WeatherDay) => day.rain >= 60
  ).length;

  if (rainyDays > 0) {
    notes.push(
      `${rainyDays} day(s) in the forecast have a 60%+ precipitation probability. Keep outdoor plans flexible.`
    );
  } else {
    notes.push(
      "No major precipitation signal in the 7-day destination forecast. Conditions can change beyond the forecast window."
    );
  }

  if (route.distanceKm > 500) {
    notes.push(
      "This is a long overland transfer. Consider breaking the route into an overnight stop rather than treating it as a single travel day."
    );
  } else {
    notes.push(
      "Route distance is manageable as a single transfer, but scenic stops can change the practical travel time."
    );
  }

  notes.push(
    "Live traffic and road-closure data is not included by the current free routing endpoint. Check live navigation and local authority information before departure."
  );

  return notes;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = (await request.json()) as TripRequest;

    if (!body.origin?.trim()) {
      return NextResponse.json(
        {
          error: "Origin is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.destination?.trim()) {
      return NextResponse.json(
        {
          error: "Destination is required.",
        },
        {
          status: 400,
        }
      );
    }

    const mode: TravelMode =
      body.mode === "cycling" ||
      body.mode === "walking"
        ? body.mode
        : "driving";

    const style = body.style || "Balanced";

    const interests = Array.isArray(body.interests)
      ? body.interests.filter(
          (interest): interest is string =>
            typeof interest === "string"
        )
      : [];

    const [origin, destination] =
      await Promise.all([
        geocode(body.origin),
        geocode(body.destination),
      ]);

    const route = await getRoute(
      origin,
      destination,
      mode
    );

    const weather = await getWeather(destination);

    const notes = buildTripNotes(
      route,
      weather
    );

    const days = makeItinerary(
      origin,
      destination,
      style,
      interests,
      route.distanceKm,
      body.start,
      body.end
    );

    const weatherWithLabels = weather.map(
      (day: WeatherDay) => ({
        ...day,
        label:
          day.rain >= 60
            ? "Rain risk"
            : "Favourable",
      })
    );

    return NextResponse.json({
      origin,
      destination,
      route,
      weather: weatherWithLabels,
      notes,
      days,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unexpected error.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
