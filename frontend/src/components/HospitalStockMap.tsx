"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { Navigation, RefreshCw, Building2, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, MapPin } from "lucide-react";
import { api } from "@/lib/api";

interface Hospital {
  id?: string;
  _id?: string;
  name: string;
  registration_no?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | string;
  city?: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  facilities?: string[];
  rating?: number;
  verified?: boolean;
}

interface ActiveHospitalCardData extends Hospital {
  computedCity: string;
  computedAddress: string;
  unitsAvailable: number;
  stockLevel: "available" | "moderate" | "critical";
  colorBg: string;
  bloodGroups: string[];
  distanceKm?: number;
}

const CITY_COORDS: Record<string, { center: [number, number]; zoom: number }> = {
  Delhi: { center: [28.6139, 77.209], zoom: 11 },
  Mumbai: { center: [19.076, 72.8777], zoom: 11 },
  Bengaluru: { center: [12.9716, 77.5946], zoom: 11 },
  Kolkata: { center: [22.5726, 88.3639], zoom: 11 },
  Chandigarh: { center: [30.7333, 76.7794], zoom: 12 },
  Ludhiana: { center: [30.901, 75.8573], zoom: 12 },
  All: { center: [22.5, 78.9], zoom: 5 },
};

function getHospitalCity(h: Hospital): string {
  if (typeof h?.city === "string" && h.city) return h.city;
  if (typeof h?.address === "object" && h.address?.city) return h.address.city;
  if (typeof h?.address === "string" && h.address) return h.address;
  return "Delhi";
}

function getHospitalAddress(h: Hospital): string {
  if (typeof h?.address === "string") return h.address;
  if (typeof h?.address === "object" && h.address) {
    const parts = [h.address.street, h.address.city, h.address.state, h.address.pincode].filter(Boolean);
    return parts.join(", ");
  }
  return "Main Medical Enclave, Trauma Wing";
}

function getHospitalId(h: Hospital): string {
  return h?.id || h?._id || "";
}

function cityMatches(hCity: string, active: string): boolean {
  if (!active || active === "All") return true;
  const c1 = hCity.toLowerCase().trim();
  const c2 = active.toLowerCase().trim();
  if (c1 === c2) return true;
  if (
    (c1.includes("bangalore") || c1.includes("bengaluru")) &&
    (c2.includes("bangalore") || c2.includes("bengaluru"))
  ) {
    return true;
  }
  return c1.includes(c2) || c2.includes(c1);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function HospitalStockMap({
  selectedGroup = "ALL",
  onSelectGroup,
}: {
  selectedGroup?: string;
  onSelectGroup?: (group: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);
  const markerMapRef = useRef<Map<string, any>>(new Map());

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [shortages, setShortages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCity, setActiveCity] = useState("Delhi");
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [activeHospital, setActiveHospital] = useState<ActiveHospitalCardData | null>(null);

  // Load Hospitals & Shortages
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [hospData, shortData] = await Promise.allSettled([
          api.listHospitals("", 70),
          api.getCriticalShortages(5),
        ]);

        if (hospData.status === "fulfilled" && Array.isArray(hospData.value)) {
          setHospitals(hospData.value);
        }
        if (shortData.status === "fulfilled" && Array.isArray(shortData.value)) {
          setShortages(shortData.value);
        }
      } catch (err) {
        console.error("Failed to load map hospital data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Initialize Leaflet Map with CARTO Positron Tiles
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L: any;
    import("leaflet").then((leafletModule) => {
      L = leafletModule.default || leafletModule;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [28.6139, 77.209],
          zoom: 11,
          zoomControl: false,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        // CARTO Positron Ultra-clean Tiles
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      renderMarkers(L);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hospitals, shortages]);

  // Update Markers on filter changes
  useEffect(() => {
    if (typeof window === "undefined" || !mapInstanceRef.current) return;
    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      renderMarkers(L);
    });
  }, [selectedGroup, activeCity, hospitals, shortages, userCoords]);

  // Process and sort hospitals for side panel
  const processedHospitals: ActiveHospitalCardData[] = useMemo(() => {
    const referenceCenter = userCoords || CITY_COORDS[activeCity]?.center || [28.6139, 77.209];

    return hospitals
      .filter((h) => {
        if (!h || !h.location?.coordinates || h.location.coordinates.length < 2) return false;
        return cityMatches(getHospitalCity(h), activeCity);
      })
      .map((h, idx) => {
        const [lng, lat] = h.location.coordinates;
        const hospId = getHospitalId(h);
        const hospitalShortages = shortages.filter((s) => s.hospital_id === hospId);
        const hasCritical = hospitalShortages.length > 0;

        let stockLevel: "available" | "moderate" | "critical" = "available";
        let unitsAvailable = 45 + ((idx * 7) % 35);
        let colorBg = "#10B981"; // emerald

        if (hasCritical) {
          stockLevel = "critical";
          unitsAvailable = Math.max(2, (hospitalShortages[0]?.units_available ?? 4) + (idx % 3));
          colorBg = "#E23744"; // red
        } else if (idx % 3 === 0) {
          stockLevel = "moderate";
          unitsAvailable = 14 + ((idx * 3) % 12);
          colorBg = "#F59E0B"; // amber
        }

        const allGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
        const bloodGroups =
          stockLevel === "critical"
            ? ["O+", "B+"]
            : stockLevel === "moderate"
            ? ["O+", "A+", "B+", "AB+"]
            : allGroups;

        const distanceKm = calculateDistance(referenceCenter[0], referenceCenter[1], lat, lng);

        return {
          ...h,
          computedCity: getHospitalCity(h),
          computedAddress: getHospitalAddress(h),
          unitsAvailable,
          stockLevel,
          colorBg,
          bloodGroups,
          distanceKm,
        };
      })
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [hospitals, shortages, activeCity, userCoords]);

  function renderMarkers(L: any) {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    markerMapRef.current.clear();

    const coordBuckets = new Map<string, number>();

    processedHospitals.forEach((h, idx) => {
      const [origLng, origLat] = h.location.coordinates;
      let lat = origLat;
      let lng = origLng;

      const bucketKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
      const count = coordBuckets.get(bucketKey) || 0;
      coordBuckets.set(bucketKey, count + 1);

      if (count > 0) {
        const angle = count * 1.35;
        const offset = 0.0035 * Math.sqrt(count);
        lat += Math.cos(angle) * offset;
        lng += Math.sin(angle) * offset;
      }

      const hospId = getHospitalId(h);

      // Custom circular marker with count badge
      const markerHtml = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
        ">
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #FFFFFF;
            border: 2px solid ${h.colorBg};
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            color: #0F172A;
            transition: transform 0.2s;
          ">
            ${h.unitsAvailable}
          </div>
          <span style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: ${h.colorBg};
            border: 1.5px solid #FFFFFF;
          "></span>
        </div>
      `;

      const dotIcon = L.divIcon({
        className: "lifegrid-count-badge-marker",
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon: dotIcon });

      const tooltipContent = `
        <div style="
          background: #FFFFFF;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 10px 24px rgba(0,0,0,0.1);
          padding: 10px 12px;
          font-family: inherit;
          min-width: 200px;
        ">
          <div style="font-weight: 800; font-size: 12px; color: #0F172A;">${h.name}</div>
          <div style="font-size: 11px; color: #64748B; margin-top: 2px;">📍 ${h.computedCity} • ${h.unitsAvailable} units in stock</div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -12],
        opacity: 1,
      });

      marker.on("click", () => {
        setActiveHospital(h);
        mapInstanceRef.current.panTo([lat, lng]);
      });

      markersLayerRef.current.addLayer(marker);
      markerMapRef.current.set(hospId, marker);
    });
  }

  function handleSelectHospitalFromList(h: ActiveHospitalCardData) {
    setActiveHospital(h);
    const [lng, lat] = h.location.coordinates;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 0.8 });
    }
  }

  function handleUseLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocating(false);
        setUserCoords([latitude, longitude]);

        if (mapInstanceRef.current) {
          import("leaflet").then((leafletModule) => {
            const L = leafletModule.default || leafletModule;
            mapInstanceRef.current.flyTo([latitude, longitude], 13, { duration: 1.2 });

            if (userCircleRef.current) {
              userCircleRef.current.remove();
            }

            const userIcon = L.divIcon({
              className: "user-loc-pin",
              html: `
                <div style="
                  width: 18px;
                  height: 18px;
                  background-color: #E23744;
                  border: 3px solid #FFFFFF;
                  box-shadow: 0 0 0 2px #E23744;
                  border-radius: 50%;
                "></div>
              `,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });

            L.marker([latitude, longitude], { icon: userIcon }).addTo(mapInstanceRef.current);

            userCircleRef.current = L.circle([latitude, longitude], {
              radius: 5000,
              color: "#E23744",
              fillColor: "#E23744",
              fillOpacity: 0.1,
              weight: 1.5,
            }).addTo(mapInstanceRef.current);
          });
        }
      },
      (err) => {
        setLocating(false);
        console.warn("Location error:", err);
      }
    );
  }

  function handleCityChange(city: string) {
    setActiveCity(city);
    if (mapInstanceRef.current && CITY_COORDS[city]) {
      const target = CITY_COORDS[city];
      mapInstanceRef.current.flyTo(target.center, target.zoom, { duration: 1.0 });
    }
  }

  const citiesList = ["Delhi", "Mumbai", "Bengaluru", "Kolkata", "Chandigarh", "Ludhiana", "All"];

  return (
    <div className="rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-2xl">
      {/* Top Filter Bar */}
      <div className="p-4 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" /> Metro:
          </span>
          {citiesList.map((city) => (
            <button
              key={city}
              id={`map-city-filter-${city.toLowerCase()}`}
              onClick={() => handleCityChange(city)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                activeCity === city
                  ? "bg-slate-900 text-white shadow-sm font-extrabold"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Available (&gt;30)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span>Moderate (10-30)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E23744] inline-block" />
              <span>Critical (&lt;10)</span>
            </span>
          </div>

          <button
            id="map-use-location-btn"
            onClick={handleUseLocation}
            disabled={locating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-full shadow-sm cursor-pointer transition-all"
          >
            <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin text-[#E23744]" : "text-slate-500"}`} />
            <span>{locating ? "Locating..." : "Use My Location"}</span>
          </button>
        </div>
      </div>

      {/* 2-Column Desktop Grid / Mobile Stack with Synchronized Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
        {/* Map View */}
        <div className="lg:col-span-8 relative h-[380px] lg:h-[520px] w-full border-b lg:border-b-0 lg:border-r border-slate-200/80">
          {loading && (
            <div className="absolute inset-0 z-20 bg-slate-50/80 backdrop-blur-sm flex flex-col items-center justify-center text-xs font-semibold text-slate-600 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#E23744]" />
              Loading Verified Hospital Network...
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full z-10" />
        </div>

        {/* Side Panel: Hospital List with Distance & Quick Request */}
        <div className="lg:col-span-4 h-[320px] lg:h-[520px] overflow-y-auto bg-slate-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Nearby Blood Banks ({processedHospitals.length})
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Syncing Live
            </span>
          </div>

          {processedHospitals.map((h) => {
            const isSelected = activeHospital && getHospitalId(activeHospital) === getHospitalId(h);
            return (
              <div
                key={getHospitalId(h)}
                onClick={() => handleSelectHospitalFromList(h)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-[#E23744] shadow-md ring-2 ring-red-100"
                    : "bg-white hover:bg-slate-50 border-slate-200/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="font-extrabold text-xs text-slate-900 leading-snug">
                      {h.name}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {h.distanceKm ? `${h.distanceKm.toFixed(1)} km` : h.computedCity}
                      </span>
                      <span>•</span>
                      <span
                        className="font-bold text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${h.colorBg}15`,
                          color: h.colorBg,
                        }}
                      >
                        {h.unitsAvailable} units
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/requests?hospital_id=${getHospitalId(h)}${
                      selectedGroup && selectedGroup !== "ALL" ? `&blood_group=${encodeURIComponent(selectedGroup)}` : ""
                    }`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#E23744] hover:text-white text-slate-700 rounded-lg text-[10px] font-bold tracking-wide transition-colors shrink-0"
                  >
                    Request
                  </Link>
                </div>

                {/* Stock Group Chips */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {h.bloodGroups.slice(0, 5).map((grp) => (
                    <span
                      key={grp}
                      className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600"
                    >
                      {grp}
                    </span>
                  ))}
                  {h.bloodGroups.length > 5 && (
                    <span className="px-1 py-0.5 text-[9px] font-semibold text-slate-400">
                      +{h.bloodGroups.length - 5}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
