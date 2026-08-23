 "use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

type Place = { name: string; lat: number; lon: number; displayName?: string };
type Poi = { name: string; category: string; lat: number; lon: number };

const icon = (label: string) =>
  L.divIcon({
    html: `<div class="pin">${label}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

function FitBounds({ geometry }: { geometry: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!geometry.length) return;
    const bounds = L.latLngBounds(geometry.map(([lon, lat]) => [lat, lon] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [geometry, map]);
  return null;
}

export default function MapView({
  origin,
  destination,
  geometry,
  pois,
}: {
  origin: Place;
  destination: Place;
  geometry: [number, number][];
  pois: Poi[];
}) {
  const positions = geometry.map(([lon, lat]) => [lat, lon] as [number, number]);
  const center: [number, number] = [(origin.lat + destination.lat) / 2, (origin.lon + destination.lon) / 2];

  return (
    <MapContainer center={center} zoom={7} scrollWheelZoom className="map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds geometry={geometry} />
      <Polyline positions={positions} pathOptions={{ className: "route-polyline" }} />
      <Marker position={[origin.lat, origin.lon]} icon={icon("A")}><Popup><b>{origin.name}</b><br />Starting point</Popup></Marker>
      <Marker position={[destination.lat, destination.lon]} icon={icon("B")}><Popup><b>{destination.name}</b><br />Your destination</Popup></Marker>
      {pois.map((p) => (
        <CircleMarker key={`${p.name}-${p.lat}`} center={[p.lat, p.lon]} radius={5} pathOptions={{ className: "poi-marker" }}>
          <Tooltip direction="top">{p.name}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
