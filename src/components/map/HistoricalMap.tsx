"use client";

import { useEffect, useRef, useState } from "react";
import type { DivIcon, LayerGroup, Map as LeafletMap } from "leaflet";
import type { HistoricalMapCategory, HistoricalMapMarker } from "../../lib/map/types";

type HistoricalMapProps = {
  markers: HistoricalMapMarker[];
  selectedMarkerId?: string;
  zoom: number;
  pan: { x: number; y: number };
  onSelect: (marker: HistoricalMapMarker) => void;
};

const categoryColors: Record<HistoricalMapCategory, string> = {
  battle: "#b8543f",
  politics: "#c49a54",
  empire: "#3f8f8c",
  culture: "#8fa7ff",
  trade: "#90c978",
  religion: "#c48bdd",
  other: "#f6f1e8",
  city: "#e6d0a0",
  person: "#f3a889",
  institution: "#b8c0d8",
  frontier: "#76b7a8",
  province: "#d5a86d",
};

function formatYear(year?: number) {
  if (typeof year !== "number") {
    return "Date unknown";
  }

  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

function markerIcon(leaflet: typeof import("leaflet"), marker: HistoricalMapMarker, isSelected: boolean): DivIcon {
  const color = categoryColors[marker.category] ?? "#f6f1e8";
  const size = isSelected ? 22 : 16;

  return leaflet.divIcon({
    className: "chronos-leaflet-icon",
    html: `<span class="chronos-map-marker${isSelected ? " is-selected" : ""}" style="--marker-color:${color};width:${size}px;height:${size}px"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function HistoricalMap({ markers, selectedMarkerId, zoom, pan, onSelect }: HistoricalMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const previousPanRef = useRef(pan);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const leaflet = await import("leaflet");
      if (cancelled || !containerRef.current) {
        return;
      }

      leafletRef.current = leaflet;

      const map = leaflet
        .map(containerRef.current, {
          center: [41.9028, 12.4964],
          zoom: 5,
          minZoom: 3,
          maxZoom: 10,
          zoomControl: false,
          attributionControl: true,
        })
        .setView([41.9028, 12.4964], 5);

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(map);

      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
    }

    initializeMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!mapReady || !leaflet || !layer) {
      return;
    }

    layer.clearLayers();

    for (const marker of markers) {
      const isSelected = selectedMarkerId === marker.markerId;
      leaflet
        .marker([marker.latitude, marker.longitude], {
          icon: markerIcon(leaflet, marker, isSelected),
          title: `${marker.name} - ${formatYear(marker.startYear)}`,
        })
        .bindTooltip(marker.name, { direction: "top", offset: [0, -10] })
        .on("click", () => onSelect(marker))
        .addTo(layer);
    }
  }, [mapReady, markers, onSelect, selectedMarkerId]);

  useEffect(() => {
    const selectedMarker = markers.find((marker) => marker.markerId === selectedMarkerId);
    if (!selectedMarker || !mapRef.current) {
      return;
    }

    mapRef.current.flyTo([selectedMarker.latitude, selectedMarker.longitude], Math.max(mapRef.current.getZoom(), 6), {
      animate: true,
      duration: 0.55,
    });
  }, [markers, selectedMarkerId]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.setZoom(Math.round(4 + zoom * 1.6));
  }, [zoom]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const previousPan = previousPanRef.current;
    const deltaX = pan.x - previousPan.x;
    const deltaY = pan.y - previousPan.y;
    previousPanRef.current = pan;

    if (deltaX !== 0 || deltaY !== 0) {
      mapRef.current.panBy([deltaX, deltaY], { animate: true, duration: 0.35 });
    }
  }, [pan]);

  return (
    <section className="relative min-h-[680px] overflow-hidden bg-[#d8c7a6]">
      <div ref={containerRef} className="h-[680px] w-full" />
      <div className="pointer-events-none absolute left-5 top-5 border border-ink/15 bg-[#f6f1e8]/88 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/58 shadow-2xl">
        OpenStreetMap geography
      </div>
      <div className="pointer-events-none absolute bottom-5 left-5 border border-ink/15 bg-[#f6f1e8]/88 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/58 shadow-2xl">
        {markers.length.toLocaleString()} markers
      </div>
    </section>
  );
}
