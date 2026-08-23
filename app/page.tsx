 "use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
  loading: () => <div className="map-loading">Preparing your route…</div>,
});

type Stop = { name: string; lat: number; lon: number; displayName: string };
type Poi = { name: string; category: string; lat: number; lon: number };
type Day = {
  day: number; date: string; title: string; area: string; summary: string;
  morning: string; afternoon: string; evening: string; why: string;
  pace: string; tags: string[];
};
type Plan = {
  origin: Stop; destination: Stop;
  route: { distanceKm: number; durationMin: number; geometry: [number, number][]; modeLabel: string };
  weather: { date: string; description: string; temp: number; min: number; rain: number; label: string }[];
  pois: Poi[]; notes: string[]; days: Day[];
  trip: { start: string; days: number; end: string; mode: string; style: string; interests: string[] };
};

const interests = ["Mountains", "Beaches", "Culture", "Food", "Adventure", "Nature", "Wellness", "Nightlife", "Photography", "Road trip"];
const styles = ["Balanced", "Slow travel", "Packed", "Scenic", "Culture", "Budget", "Comfort"];
const modes = [
  { id: "private", label: "Private transport", icon: "🚗", note: "Car, cab or your own vehicle" },
  { id: "public", label: "Public transport", icon: "🚆", note: "Train, bus and local transit" },
  { id: "hybrid", label: "Mixed journey", icon: "🔀", note: "Public + private/local transfers" },
];

export default function Home() {
  const [origin, setOrigin] = useState("Delhi");
  const [destination, setDestination] = useState("Rishikesh");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState("10");
  const [style, setStyle] = useState("Balanced");
  const [mode, setMode] = useState("private");
  const [selected, setSelected] = useState<string[]>(["Nature", "Culture"]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (x: string) => setSelected((s) => s.includes(x) ? s.filter((i) => i !== x) : [...s, x]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ origin, destination, start, durationDays: Number(duration), style, mode, interests: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not build this trip.");
      setPlan(data);
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="mark">W</span><span>WAYPOINT</span></div>
        <nav><a href="#planner">Plan</a><a href="#explore">Explore</a><a href="#results">Your trip</a></nav>
        <span className="tag">TRAVEL, WITH INTENTION.</span>
      </header>

      <section className="hero">
        <div className="hero-copy-wrap">
          <p className="eyebrow">THE TRAVEL PLANNER FOR CURIOUS PEOPLE</p>
          <h1>Go somewhere.<br /><em>Then see where it takes you.</em></h1>
          <p className="hero-copy">Tell Waypoint where you are starting, where you want to go, how long you have and what you care about. We build the journey around the destination — not the other way around.</p>
          <div className="hero-actions"><button onClick={() => document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" })}>Start exploring <span>↓</span></button><span>LIVE ROUTES · WEATHER · PLACES</span></div>
        </div>
        <div className="hero-landscape" aria-hidden="true">
          <div className="sun" /><div className="mountain m1" /><div className="mountain m2" /><div className="mountain m3" />
          <div className="route-line" /><div className="hero-card"><small>WAYPOINT</small><strong>Plan less.<br />Experience more.</strong></div>
        </div>
      </section>

      <section className="explore-strip" id="explore">
        <div><p className="eyebrow">EXPLORE BY MOOD</p><h2>Where could you go next?</h2></div>
        <div className="destination-teasers">
          {["Rishikesh", "Udaipur", "Manali", "Goa"].map((x, i) => (
            <button key={x} onClick={() => { setDestination(x); document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span>{["🌊", "🏛️", "⛰️", "🌴"][i]}</span><b>{x}</b><small>{["River · wellness", "Lakes · culture", "Mountains · trails", "Beaches · food"][i]}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="planner" id="planner">
        <div className="section-intro"><div><p className="eyebrow">01 / SET THE JOURNEY</p><h2>Start with a place.<br /><em>We’ll shape the days.</em></h2></div><p>Waypoint treats the transfer as one part of the trip. Once you arrive, the remaining days belong to the destination.</p></div>

        <div className="planner-card">
          <div className="mode-heading"><div><span className="step">A</span><h3>How do you want to travel?</h3></div><div className="mode-grid">{modes.map((m) => <button key={m.id} className={mode === m.id ? "mode-card active" : "mode-card"} onClick={() => setMode(m.id)}><span className="mode-icon">{m.icon}</span><strong>{m.label}</strong><small>{m.note}</small></button>)}</div></div>

          <div className="route-fields">
            <label><span>STARTING FROM</span><input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Delhi" /></label>
            <div className="route-arrow">→</div>
            <label><span>GOING TO</span><input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Rishikesh" /></label>
          </div>

          <div className="trip-settings">
            <label><span>DEPARTURE DATE</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label><span>DAYS AT DESTINATION</span><div className="number-input"><button onClick={() => setDuration(String(Math.max(1, Number(duration) - 1)))}>−</button><input type="number" min="1" max="30" value={duration} onChange={(e) => setDuration(e.target.value)} /><button onClick={() => setDuration(String(Math.min(30, Number(duration) + 1)))}>+</button></div></label>
            <label><span>TRAVEL STYLE</span><select value={style} onChange={(e) => setStyle(e.target.value)}>{styles.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>

          <div className="interest-block"><div><span className="step">B</span><h3>What are you curious about?</h3><p>Pick as many as you want. Waypoint uses these to shape the days.</p></div><div className="chips">{interests.map((x) => <button key={x} className={selected.includes(x) ? "chip selected" : "chip"} onClick={() => toggle(x)}>{x}</button>)}</div></div>

          <button className="generate" onClick={generate} disabled={loading}>{loading ? "BUILDING YOUR JOURNEY…" : "BUILD MY WAYPOINT"} <span>↗</span></button>
          {error && <div className="error">{error}</div>}
        </div>
      </section>

      {plan && <section className="results" id="results">
        <div className="result-hero">
          <div><p className="eyebrow">02 / YOUR JOURNEY</p><h2>{plan.origin.name} <span>→</span> {plan.destination.name}</h2><p className="result-sub">{plan.trip.days} days · {plan.trip.start} → {plan.trip.end} · {plan.route.modeLabel}</p></div>
          <div className="weather-pill"><span>NOW AT DESTINATION</span><strong>{plan.weather[0]?.temp ? `${Math.round(plan.weather[0].temp)}°` : "—"}</strong><small>{plan.weather[0]?.description}</small></div>
        </div>

        <div className="map-wrap"><MapView origin={plan.origin} destination={plan.destination} geometry={plan.route.geometry} pois={plan.pois.slice(0, 18)} /></div>

        <div className="route-summary"><div><span>DISTANCE</span><strong>{Math.round(plan.route.distanceKm)} km</strong></div><div><span>ROAD TIME</span><strong>{Math.floor(plan.route.durationMin / 60)}h {Math.round(plan.route.durationMin % 60)}m</strong></div><div><span>YOUR STAY</span><strong>{plan.trip.days} days</strong></div><div><span>TRAVEL MODE</span><strong>{plan.route.modeLabel}</strong></div></div>

        <div className="conditions"><div><p className="eyebrow">03 / REAL-WORLD CHECK</p><h2>Know before you go.</h2><div className="notes">{plan.notes.map((n, i) => <div className="note" key={i}><span>0{i + 1}</span><p>{n}</p></div>)}</div></div><div className="forecast"><p className="eyebrow">7-DAY DESTINATION FORECAST</p>{plan.weather.map((w) => <div className="forecast-row" key={w.date}><div><b>{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${w.date}T12:00:00`))}</b><span>{w.description}</span></div><strong>{Math.round(w.temp)}°</strong><small>{w.rain}% rain</small></div>)}</div></div>

        <div className="itinerary"><div className="itinerary-heading"><div><p className="eyebrow">04 / YOUR DAYS</p><h2>A detailed plan, with room to wander.</h2></div><p>Day 1 gets you there. The rest of the plan belongs to {plan.destination.name}.</p></div>
          <div className="days">{plan.days.map((d) => <article className="day-card" key={d.day}><div className="day-marker"><span>DAY</span><b>{String(d.day).padStart(2, "0")}</b><small>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${d.date}T12:00:00`))}</small></div><div className="day-content"><div className="day-top"><div><span className="area">{d.area}</span><h3>{d.title}</h3></div><span className="pace">{d.pace}</span></div><p className="day-summary">{d.summary}</p><div className="timeline"><div><span>09:00 — MORNING</span><p>{d.morning}</p></div><div><span>14:00 — AFTERNOON</span><p>{d.afternoon}</p></div><div><span>19:00 — EVENING</span><p>{d.evening}</p></div></div><div className="day-bottom"><div className="tags">{d.tags.map((t) => <span key={t}>{t}</span>)}</div><p><b>Why this day:</b> {d.why}</p></div></div></article>)}</div>
        </div>
      </section>}

      <footer><span>WAYPOINT</span><span>Travel, with intention.</span><span>ROUTES · PLACES · WEATHER</span></footer>
    </main>
  );
}
