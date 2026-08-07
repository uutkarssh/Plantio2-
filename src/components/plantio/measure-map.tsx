"use client";

/* Measure Land — full-screen Leaflet satellite map with pin-drop area measurement.
 * Dynamically imported by /measure/page.tsx with ssr:false (Leaflet needs window).
 */

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
import {
  Search,
  LocateFixed,
  Undo2,
  Trash2,
  Calculator,
  X,
  Save,
  MapPin,
  Layers,
  AlertCircle,
  Pencil,
  Check,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Maximize2,
} from "lucide-react";
import { StickerButton, StickerCard } from "@/components/plantio/sticker";
import {
  getSavedFields,
  saveSavedField,
  deleteSavedField,
  renameSavedField,
  clearSavedFields,
  type SavedField,
} from "@/lib/plantio/storage";

type LatLng = [number, number];

const DEFAULT_CENTER: LatLng = [22.5, 78.9];
const DEFAULT_ZOOM = 5;
const ESRI_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

/* Build a numbered Leaflet DivIcon — white circle, black border, leaf-green number, hard shadow */
function pinIcon(number: number): L.DivIcon {
  return L.divIcon({
    className: "plantio-pin",
    html: `<div style="
      width:32px;height:32px;background:#FFFFFF;border:3px solid #161611;
      border-radius:9999px;display:flex;align-items:center;justify-content:center;
      font-family:var(--font-bakbak),'Bakbak One',sans-serif;font-weight:700;
      color:#3C8C4A;font-size:14px;line-height:1;box-shadow:3px 3px 0px 0px #161611;
    ">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/* Compute area (sqm) from [lat, lng] pins using Turf — Turf expects [lng, lat] and a closed ring */
function computeAreaSqm(pins: LatLng[]): number {
  if (pins.length < 3) return 0;
  const ring: [number, number][] = pins.map(([lat, lng]) => [lng, lat]);
  ring.push(ring[0]); // close the ring
  try {
    const poly = turf.polygon([ring]);
    return turf.area(poly);
  } catch {
    return 0;
  }
}

/* Hook: capture map clicks */
function MapClickHandler({ onClick }: { onClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

/* Hook: expose the Leaflet map instance to the parent for flyTo/fitBounds */
function MapRefSetter({ onMap }: { onMap: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
  }, [map, onMap]);
  return null;
}

/* Format a numeric area nicely depending on magnitude */
function formatArea(v: number): string {
  if (!isFinite(v)) return "0";
  if (v < 1) return v.toFixed(3);
  if (v < 100) return v.toFixed(2);
  if (v < 10000) return v.toFixed(1);
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function AreaCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "leaf" | "gold" | "forest";
}) {
  const colors: Record<string, string> = {
    leaf: "bg-leaf text-ink",
    gold: "bg-gold text-ink",
    forest: "bg-forest text-white",
  };
  return (
    <div
      className={`${colors[color]} p-2.5 text-center border-[3px] border-ink rounded-2xl`}
      style={{ boxShadow: "3px 3px 0px 0px #161611" }}
    >
      <div className="font-display text-xl sm:text-2xl font-bold leading-none">
        {formatArea(value)}
      </div>
      <div className="font-display text-[10px] font-bold uppercase tracking-wide mt-1 opacity-90">
        {label}
      </div>
    </div>
  );
}

export function MeasureMap() {
  const [pins, setPins] = useState<LatLng[]>([]);
  const [areaSqm, setAreaSqm] = useState<number | null>(null);
  const [savedFields, setSavedFields] = useState<SavedField[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [locating, setLocating] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  /* Load saved fields + listen for updates */
  useEffect(() => {
    const refresh = () => setSavedFields(getSavedFields());
    refresh();
    window.addEventListener("plantio-fields-updated", refresh);
    return () => window.removeEventListener("plantio-fields-updated", refresh);
  }, []);

  /* Silent one-shot GPS on mount — keep default center if denied */
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    if (!map) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 14, { animate: false });
      },
      () => {
        /* denied — keep default center, never block */
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
    return () => {
      cancelled = true;
    };
  }, [map]);

  const handleMapClick = useCallback((latlng: LatLng) => {
    setPins((prev) => [...prev, latlng]);
    setAreaSqm(null);
    setSavedName(null);
    setSaveError("");
  }, []);

  const handleUndo = useCallback(() => {
    setPins((prev) => prev.slice(0, -1));
    setAreaSqm(null);
    setSavedName(null);
  }, []);

  const handleClear = useCallback(() => {
    setPins([]);
    setAreaSqm(null);
    setSavedName(null);
    setFieldName("");
    setSaveError("");
  }, []);

  const handleCalculate = useCallback(() => {
    if (pins.length < 3) return;
    const area = computeAreaSqm(pins);
    setAreaSqm(area);
    setSavedName(null);
    setFieldName("");
    setSaveError("");
  }, [pins]);

  const handleSaveField = useCallback(() => {
    const name = fieldName.trim();
    if (!name) {
      setSaveError("Please enter a name for this field.");
      return;
    }
    if (pins.length < 3 || areaSqm == null) {
      setSaveError("Calculate the area before saving.");
      return;
    }
    const field: SavedField = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      coordinates: pins,
      areaSqm,
      createdAt: Date.now(),
    };
    saveSavedField(field);
    setSavedName(name);
    setSaveError("");
    setFieldName("");
  }, [fieldName, pins, areaSqm]);

  const handleDeleteField = useCallback((id: string) => {
    deleteSavedField(id);
    if (renamingId === id) setRenamingId(null);
  }, [renamingId]);

  const startRename = useCallback((field: SavedField) => {
    setRenamingId(field.id);
    setRenameValue(field.name);
  }, []);

  const commitRename = useCallback(() => {
    if (!renamingId) return;
    const v = renameValue.trim();
    if (v) {
      renameSavedField(renamingId, v);
      // if we're currently viewing this field, update the visible saved name too
      setSavedName((cur) => (cur && savedFields.find((f) => f.id === renamingId) ? v : cur));
    }
    setRenamingId(null);
    setRenameValue("");
  }, [renamingId, renameValue, savedFields]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue("");
  }, []);

  const handleViewField = useCallback(
    (field: SavedField) => {
      const coords = field.coordinates as LatLng[];
      setPins(coords);
      setAreaSqm(field.areaSqm);
      setSavedName(field.name);
      setFieldName("");
      setSaveError("");
      if (map && coords.length > 0) {
        const bounds = L.latLngBounds(
          coords.map(([lat, lng]) => L.latLng(lat, lng))
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      }
    },
    [map]
  );

  const handleSearch = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const q = searchQuery.trim();
      if (!q) return;
      setSearching(true);
      setSearchError("");
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q
          )}&limit=1`
        );
        if (!res.ok) throw new Error("geocode failed");
        const data = (await res.json()) as
          | Array<{ lat: string; lon: string }>
          | null;
        if (!data || data.length === 0) {
          setSearchError("Place not found. Try another name.");
          return;
        }
        const { lat, lon } = data[0];
        map?.flyTo([parseFloat(lat), parseFloat(lon)], 15, { duration: 1.2 });
      } catch {
        setSearchError("Search failed. Check your connection.");
      } finally {
        setSearching(false);
      }
    },
    [searchQuery, map]
  );

  const handleLocate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setSearchError("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map?.flyTo([latitude, longitude], 16, { duration: 1.2 });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setSearchError("Could not get your location. Check permissions.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [map]);

  /* Polygon positions (react-leaflet closes it automatically for Polygon) */
  const positions = useMemo(() => pins, [pins]);

  const acres = areaSqm != null ? areaSqm / 4046.86 : 0;
  const hectares = areaSqm != null ? areaSqm / 10000 : 0;
  const sqm = areaSqm ?? 0;

  const showResult = areaSqm !== null;

  const helperText =
    pins.length === 0
      ? "Tap the map to drop your first pin."
      : pins.length < 3
      ? `${pins.length} pin${pins.length > 1 ? "s" : ""} placed — need ${
          3 - pins.length
        } more to calculate.`
      : `${pins.length} pins placed. Tap Calculate to measure.`;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: "calc(100dvh - 76px - env(safe-area-inset-bottom))",
      }}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="absolute inset-0 w-full h-full"
        style={{ background: "#AADAFF" }}
      >
        <TileLayer
          url={ESRI_URL}
          attribution='Tiles &copy; Esri'
          maxZoom={19}
        />

        {/* Open polyline connecting pins in leaf-green */}
        {positions.length >= 2 && (
          <Polyline
            positions={positions}
            pathOptions={{ color: "#8FD14F", weight: 4 }}
          />
        )}

        {/* Closed polygon outline + semi-transparent fill once 3+ pins */}
        {positions.length >= 3 && (
          <Polygon
            positions={positions}
            pathOptions={{
              color: "#1F4D36",
              weight: 3,
              fillColor: "#8FD14F",
              fillOpacity: 0.25,
            }}
          />
        )}

        {/* Numbered pins */}
        {pins.map((pos, i) => (
          <Marker
            key={`${pos[0].toFixed(6)}-${pos[1].toFixed(6)}-${i}`}
            position={pos}
            icon={pinIcon(i + 1)}
          />
        ))}

        <MapClickHandler onClick={handleMapClick} />
        <MapRefSetter onMap={setMap} />
      </MapContainer>

      {/* Search bar — top-left, leaves room for the global hamburger on the right */}
      <div className="absolute top-4 left-4 right-20 z-[1200]">
        <div className="sticker-card bg-cream p-1.5 flex items-center gap-2">
          <Search
            className="w-5 h-5 text-ink ml-2 shrink-0"
            strokeWidth={2.5}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search a place…"
            className="flex-1 bg-transparent outline-none text-sm min-h-[36px] placeholder:text-ink/50"
            aria-label="Search a place"
            enterKeyHint="search"
          />
          {searching && (
            <span
              aria-hidden
              className="w-4 h-4 mr-2 rounded-full border-2 border-ink border-t-transparent animate-spin shrink-0"
            />
          )}
        </div>
        {searchError && (
          <p className="text-xs text-warn mt-1.5 px-2 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
            {searchError}
          </p>
        )}
      </div>

      {/* Saved field chips — below search bar */}
      {savedFields.length > 0 && (
        <div className="absolute top-[68px] left-4 right-4 z-[1100]">
          <div className="flex gap-2 overflow-x-auto scroll-plantio pb-1">
            {savedFields.map((field) => {
              const isRenaming = renamingId === field.id;
              return (
                <div
                  key={field.id}
                  className="sticker-pill bg-white px-3 py-1.5 flex items-center gap-2 shrink-0 text-xs select-none"
                >
                  <MapPin
                    className="w-3.5 h-3.5 text-forest shrink-0"
                    strokeWidth={2.5}
                  />
                  {isRenaming ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      maxLength={40}
                      className="font-display font-bold uppercase tracking-wide text-ink bg-cream border-[2px] border-ink rounded-full px-2 py-0.5 outline-none min-w-[80px] text-xs"
                      aria-label="Rename field"
                    />
                  ) : (
                    <span
                      className="font-display font-bold uppercase tracking-wide text-ink max-w-[100px] truncate cursor-pointer"
                      onClick={() => handleViewField(field)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleViewField(field);
                        }
                      }}
                      title={`View ${field.name}`}
                    >
                      {field.name}
                    </span>
                  )}
                  {isRenaming ? (
                    <>
                      <button
                        type="button"
                        aria-label="Save name"
                        className="w-5 h-5 rounded-full bg-leaf border-[2px] border-ink flex items-center justify-center shrink-0"
                        onClick={commitRename}
                      >
                        <Check className="w-3 h-3 text-ink" strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel rename"
                        className="w-5 h-5 rounded-full bg-cream border-[2px] border-ink flex items-center justify-center shrink-0"
                        onClick={cancelRename}
                      >
                        <X className="w-3 h-3 text-ink" strokeWidth={3} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={`Rename ${field.name}`}
                        className="w-5 h-5 rounded-full bg-cream border-[2px] border-ink flex items-center justify-center shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(field);
                        }}
                      >
                        <Pencil className="w-3 h-3 text-ink" strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${field.name}`}
                        className="w-5 h-5 rounded-full bg-warn border-[2px] border-ink flex items-center justify-center shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteField(field.id);
                        }}
                      >
                        <X className="w-3 h-3 text-white" strokeWidth={3} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locate Me — floating circular button, above the control panel */}
      {!showResult && (
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          aria-label="Locate me"
          className="absolute bottom-[210px] right-4 z-[1100] w-14 h-14 rounded-full bg-white border-[3px] border-ink shadow-[5px_5px_0px_0px_#161611] flex items-center justify-center active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#161611] transition-all disabled:opacity-60"
        >
          {locating ? (
            <span
              aria-hidden
              className="w-5 h-5 rounded-full border-[3px] border-ink border-t-transparent animate-spin"
            />
          ) : (
            <LocateFixed
              className="w-6 h-6 text-forest"
              strokeWidth={2.5}
            />
          )}
        </button>
      )}

      {/* Bottom control panel OR result sheet — sits above the global bottom nav */}
      <div className="absolute bottom-[84px] left-4 right-4 z-[1200]">
        {showResult ? (
          <StickerCard className="bg-cream p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers
                  className="w-5 h-5 text-forest"
                  strokeWidth={2.5}
                />
                <h3 className="font-display text-lg font-bold uppercase tracking-wide">
                  Calculated Area
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close result"
                onClick={() => setAreaSqm(null)}
                className="w-8 h-8 rounded-full bg-white border-[2.5px] border-ink flex items-center justify-center active:translate-y-[1px]"
              >
                <X className="w-4 h-4 text-ink" strokeWidth={3} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <AreaCard label="Acres" value={acres} color="leaf" />
              <AreaCard label="Hectares" value={hectares} color="gold" />
              <AreaCard label="Sq Meters" value={sqm} color="forest" />
            </div>

            {/* Save form OR confirmation */}
            <div className="mt-3">
              {savedName ? (
                <div className="sticker-pill bg-leaf px-3 py-2 flex items-center justify-center gap-2">
                  <MapPin
                    className="w-4 h-4 text-ink"
                    strokeWidth={2.5}
                  />
                  <span className="font-display text-sm font-bold uppercase text-ink truncate">
                    Saved as &ldquo;{savedName}&rdquo;
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => {
                      setFieldName(e.target.value);
                      setSaveError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveField();
                    }}
                    placeholder="Name this field..."
                    maxLength={40}
                    className="flex-1 bg-white border-[3px] border-ink rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-ink/50 min-w-0"
                    aria-label="Field name"
                  />
                  <StickerButton
                    variant="forest"
                    size="sm"
                    onClick={handleSaveField}
                  >
                    <Save className="w-4 h-4" strokeWidth={2.5} />
                    Save
                  </StickerButton>
                </div>
              )}
              {saveError && (
                <p className="text-xs text-warn mt-1.5 flex items-center gap-1 font-semibold">
                  <AlertCircle
                    className="w-3.5 h-3.5"
                    strokeWidth={2.5}
                  />
                  {saveError}
                </p>
              )}
            </div>
          </StickerCard>
        ) : (
          <StickerCard className="bg-cream p-3">
            {/* Primary action — Calculate Area (full-width, more breathing room) */}
            <StickerButton
              variant="leaf"
              size="md"
              className="w-full"
              onClick={handleCalculate}
              disabled={pins.length < 3}
            >
              <Calculator className="w-5 h-5" strokeWidth={2.5} />
              Calculate Area
            </StickerButton>

            {/* Secondary actions — Undo + Clear side by side, icon-led */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <StickerButton
                variant="cream"
                size="sm"
                onClick={handleUndo}
                disabled={pins.length === 0}
              >
                <Undo2 className="w-4 h-4" strokeWidth={2.5} />
                Undo
              </StickerButton>
              <StickerButton
                variant="cream"
                size="sm"
                onClick={handleClear}
                disabled={pins.length === 0}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                Clear
              </StickerButton>
            </div>

            <div className="flex items-start gap-2 mt-2 px-1">
              <MapPin
                className="w-3.5 h-3.5 text-forest shrink-0 mt-[1px]"
                strokeWidth={2.5}
              />
              <p className="text-xs text-ink/80 leading-snug">
                {helperText}
              </p>
            </div>
            <p className="text-[10px] text-ink/60 mt-1 px-1 leading-snug">
              Satellite tiles require an internet connection — Measure Land
              does not work fully offline.
            </p>
          </StickerCard>
        )}
      </div>

      {/* Saved Fields collapsible panel — bottom of screen, above global nav */}
      {savedFields.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-[1199]">
          {/* Collapsible header tab — always visible */}
          <button
            type="button"
            onClick={() => setSavedPanelOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-forest text-white border-t-[3px] border-ink px-5 py-2.5"
            aria-expanded={savedPanelOpen}
            aria-label={`Saved Fields (${savedFields.length})`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-leaf" strokeWidth={2.5} />
              <span className="font-display text-sm font-bold uppercase tracking-wide">
                Saved Fields ({savedFields.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {savedFields.length >= 2 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompareOpen((v) => !v);
                  }}
                  aria-label="Compare fields"
                  className="w-7 h-7 rounded-full bg-leaf border-[2px] border-ink flex items-center justify-center"
                >
                  <GitCompareArrows className="w-3.5 h-3.5 text-ink" strokeWidth={2.5} />
                </button>
              )}
              {savedPanelOpen ? (
                <ChevronDown className="w-4 h-4 text-leaf" strokeWidth={2.5} />
              ) : (
                <ChevronUp className="w-4 h-4 text-leaf" strokeWidth={2.5} />
              )}
            </div>
          </button>

          {/* Expandable panel body */}
          {savedPanelOpen && (
            <div
              className="bg-cream border-t-[2px] border-ink max-h-56 overflow-y-auto scroll-plantio px-4 py-3 space-y-2"
            >
              {savedFields.map((field) => {
                const fAcres = field.areaSqm / 4046.86;
                const fHa = field.areaSqm / 10000;
                const dateStr = new Date(field.createdAt).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric", year: "numeric" }
                );
                const isRenaming = renamingId === field.id;
                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 bg-white border-[2.5px] border-ink rounded-2xl p-2.5 shadow-[3px_3px_0px_0px_#161611]"
                  >
                    <MapPin
                      className="w-4 h-4 text-forest shrink-0"
                      strokeWidth={2.5}
                    />
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          maxLength={40}
                          className="font-display font-bold uppercase tracking-wide text-ink bg-cream border-[2px] border-ink rounded-full px-2 py-0.5 outline-none min-w-[80px] text-xs w-full"
                          aria-label="Rename field"
                        />
                      ) : (
                        <span className="font-display text-xs font-bold uppercase tracking-wide text-ink truncate block">
                          {field.name}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-ink/70">
                          {formatArea(fAcres)} ac
                        </span>
                        <span className="text-[10px] text-ink/40">/</span>
                        <span className="text-[10px] text-ink/70">
                          {formatArea(fHa)} ha
                        </span>
                        <span className="text-[10px] text-ink/40">/</span>
                        <span className="text-[10px] text-ink/70">
                          {formatArea(field.areaSqm)} sqm
                        </span>
                      </div>
                      <span className="text-[9px] text-ink/50 block mt-0.5">
                        {dateStr}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isRenaming ? (
                        <>
                          <button
                            type="button"
                            aria-label="Save name"
                            className="w-6 h-6 rounded-full bg-leaf border-[2px] border-ink flex items-center justify-center"
                            onClick={commitRename}
                          >
                            <Check className="w-3 h-3 text-ink" strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancel rename"
                            className="w-6 h-6 rounded-full bg-cream border-[2px] border-ink flex items-center justify-center"
                            onClick={cancelRename}
                          >
                            <X className="w-3 h-3 text-ink" strokeWidth={3} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={`Load ${field.name}`}
                            className="w-6 h-6 rounded-full bg-leaf border-[2px] border-ink flex items-center justify-center"
                            onClick={() => handleViewField(field)}
                          >
                            <Maximize2 className="w-3 h-3 text-ink" strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Rename ${field.name}`}
                            className="w-6 h-6 rounded-full bg-cream border-[2px] border-ink flex items-center justify-center"
                            onClick={() => startRename(field)}
                          >
                            <Pencil className="w-3 h-3 text-ink" strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${field.name}`}
                            className="w-6 h-6 rounded-full bg-warn border-[2px] border-ink flex items-center justify-center"
                            onClick={() => handleDeleteField(field.id)}
                          >
                            <Trash2 className="w-3 h-3 text-white" strokeWidth={2.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Field comparison card — appears above the panel when toggle open */}
          {compareOpen && savedFields.length >= 2 && (
            <div className="bg-gold border-t-[2px] border-ink px-4 py-3 max-h-48 overflow-y-auto scroll-plantio">
              <div className="flex items-center gap-2 mb-2">
                <GitCompareArrows
                  className="w-4 h-4 text-ink"
                  strokeWidth={2.5}
                />
                <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">
                  Compare Fields
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto scroll-plantio pb-1">
                {(() => {
                  const maxArea = Math.max(
                    ...savedFields.map((f) => f.areaSqm)
                  );
                  return savedFields.map((field) => {
                    const fAcres = field.areaSqm / 4046.86;
                    const isLargest = field.areaSqm === maxArea;
                    return (
                      <div
                        key={field.id}
                        className={`shrink-0 border-[2.5px] border-ink rounded-2xl p-2.5 shadow-[3px_3px_0px_0px_#161611] min-w-[100px] ${
                          isLargest ? "bg-leaf" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {isLargest && (
                            <Maximize2
                              className="w-3 h-3 text-ink shrink-0"
                              strokeWidth={2.5}
                            />
                          )}
                          <span
                            className={`font-display text-[10px] font-bold uppercase tracking-wide truncate ${
                              isLargest ? "text-ink" : "text-ink/80"
                            }`}
                          >
                            {field.name}
                          </span>
                        </div>
                        <div
                          className={`font-display text-lg font-bold leading-none mt-1 ${
                            isLargest ? "text-ink" : "text-forest"
                          }`}
                        >
                          {formatArea(fAcres)}
                        </div>
                        <span
                          className={`font-display text-[9px] font-bold uppercase ${
                            isLargest ? "text-ink/70" : "text-ink/60"
                          }`}
                        >
                          acres
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
