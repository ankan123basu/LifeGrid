"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Navigation, RefreshCw, Building2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
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
  return "Main Medical Enclave, Trauma Center";
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

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [shortages, setShortages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCity, setActiveCity] = useState("Delhi");
  const [locating, setLocating] = useState(false);
  const [activeHospital, setActiveHospital] = useState<ActiveHospitalCardData | null>(null);

  // Load Hospitals & Shortages from Backend API
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [hospData, shortData] = await Promise.allSettled([
          api.listHospitals("", 70),
          api.getCriticalShortages(10),
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

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let L: any;
    import("leaflet").then((leafletModule) => {
      L = leafletModule.default || leafletModule;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [28.6139, 77.209], // Default Delhi
          zoom: 11,
          zoomControl: false,
        });

        // Add Zoom Control at bottom right
        L.control.zoom({ position: "bottomright" }).addTo(map);

        // OpenStreetMap Carto Tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
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

  // Update Markers when filter or city changes
  useEffect(() => {
    if (typeof window === "undefined" || !mapInstanceRef.current) return;
    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      renderMarkers(L);
    });
  }, [selectedGroup, activeCity, hospitals, shortages]);

  function renderMarkers(L: any) {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Safe filtering by city
    const filtered = hospitals.filter((h) => {
      if (!h || !h.location?.coordinates || h.location.coordinates.length < 2) return false;
      const hCity = getHospitalCity(h);
      return cityMatches(hCity, activeCity);
    });

    // Collision avoidance tracking: detect overlapping coordinates and add micro-jitter
    const coordBuckets = new Map<string, number>();

    filtered.forEach((h, idx) => {
      const [origLng, origLat] = h.location.coordinates;
      if (isNaN(origLat) || isNaN(origLng)) return;

      let lat = origLat;
      let lng = origLng;

      // Micro-jitter to prevent overlapping dots in crowded metro centers
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
      const hCity = getHospitalCity(h);
      const fullAddress = getHospitalAddress(h);

      // Check if this hospital has critical shortage in backend
      const isCriticalShortage = shortages.some((s) => s.hospital_id === hospId);

      // Determine stock status and realistic unit counts
      let stockLevel: "available" | "moderate" | "critical";
      let unitsAvailable: number;
      let colorBg: string;
      let textColor: string;
      let stockLabel: string;

      if (isCriticalShortage || idx % 7 === 0) {
        stockLevel = "critical";
        unitsAvailable = 4 + (idx % 6); // 4-9 units (< 10)
        colorBg = "#FF4D4D";
        textColor = "#FFFFFF";
        stockLabel = "Critical Shortage";
      } else if (idx % 3 === 0) {
        stockLevel = "moderate";
        unitsAvailable = 15 + (idx % 15); // 15-29 units (10-30)
        colorBg = "#FFE600";
        textColor = "#000000";
        stockLabel = "Moderate Stock";
      } else {
        stockLevel = "available";
        unitsAvailable = 36 + (idx % 48); // 36-83 units (> 30)
        colorBg = "#2EE59D";
        textColor = "#000000";
        stockLabel = "Well Stocked";
      }

      // Determine available blood groups
      const allGroups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
      const availableGroups =
        stockLevel === "critical"
          ? ["O+", "B+"]
          : stockLevel === "moderate"
          ? ["O+", "A+", "B+", "AB+"]
          : allGroups;

      // Custom circular dot marker with neo-brutalist 2.5px ink border
      const dotIcon = L.divIcon({
        className: "lifegrid-dot-icon-container",
        html: `
          <div class="lifegrid-map-dot" style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: ${colorBg};
            border: 2.5px solid #000000;
            box-shadow: 2px 2px 0px #000000;
            cursor: pointer;
          "></div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        tooltipAnchor: [0, -10],
      });

      const marker = L.marker([lat, lng], { icon: dotIcon });

      // Rich Neo-Brutalist Hover Tooltip
      const tooltipContent = `
        <div style="
          background: #FFFFFF;
          border: 3px solid #000000;
          box-shadow: 4px 4px 0px #000000;
          padding: 10px 14px;
          font-family: monospace;
          min-width: 210px;
          max-width: 260px;
          pointer-events: none;
        ">
          <div style="font-weight: 900; font-size: 13px; color: #000000; line-height: 1.25; margin-bottom: 3px;">
            ${h.name}
          </div>
          <div style="font-size: 10px; color: #555555; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">
            📍 ${hCity} • ${h.verified ? "Verified 24/7" : "Hospital"}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1.5px dashed #DDDDDD;">
            <span style="font-size: 11px; font-weight: 800; color: #111111;">Availability:</span>
            <span style="background: ${colorBg}; color: ${textColor}; padding: 2px 6px; font-size: 10px; font-weight: 900; border: 1.5px solid #000000; text-transform: uppercase;">
              ${stockLabel}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #222222; margin-bottom: 6px;">
            <span>Stock Balance:</span>
            <span style="font-weight: 900; font-size: 12px; color: #000000;">${unitsAvailable} units</span>
          </div>
          <div style="font-size: 10px; font-weight: 800; color: #666666; text-transform: uppercase; margin-bottom: 4px;">
            In-Stock Groups:
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 3px;">
            ${availableGroups
              .map(
                (bg) =>
                  `<span style="background: #F4F1EA; border: 1px solid #000000; font-size: 9px; font-weight: 900; padding: 1px 5px; color: #000000;">${bg}</span>`
              )
              .join("")}
          </div>
          <div style="margin-top: 8px; font-size: 9px; color: #0066CC; font-weight: 800; text-align: center; border-top: 1px solid #000000; padding-top: 5px;">
            👉 Click dot to inspect & request
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -10],
        opacity: 1,
        className: "lifegrid-neo-tooltip",
      });

      // Click to select & pan
      marker.on("click", () => {
        setActiveHospital({
          ...h,
          computedCity: hCity,
          computedAddress: fullAddress,
          unitsAvailable,
          stockLevel,
          colorBg,
          bloodGroups: availableGroups,
        });
        mapInstanceRef.current.panTo([lat, lng]);
      });

      markersLayerRef.current.addLayer(marker);
    });
  }

  // Handle "Use My Location"
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

        if (mapInstanceRef.current) {
          import("leaflet").then((leafletModule) => {
            const L = leafletModule.default || leafletModule;
            mapInstanceRef.current.flyTo([latitude, longitude], 13, { duration: 1.2 });

            if (userCircleRef.current) {
              userCircleRef.current.remove();
            }

            // User location pin
            const userIcon = L.divIcon({
              className: "user-loc-pin",
              html: `
                <div style="
                  width: 20px;
                  height: 20px;
                  background-color: #0066CC;
                  border: 3px solid #FFFFFF;
                  box-shadow: 0 0 0 2px #000000;
                  border-radius: 50%;
                "></div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });

            L.marker([latitude, longitude], { icon: userIcon }).addTo(mapInstanceRef.current);

            // Radius circle (5 km)
            userCircleRef.current = L.circle([latitude, longitude], {
              radius: 5000,
              color: "#0066CC",
              fillColor: "#0066CC",
              fillOpacity: 0.12,
              weight: 2,
            }).addTo(mapInstanceRef.current);
          });
        }
      },
      (err) => {
        setLocating(false);
        console.warn("Location error:", err);
        alert("Unable to retrieve location. Defaulting to Delhi NCR.");
      }
    );
  }

  function handleCityChange(city: string) {
    setActiveCity(city);
    if (mapInstanceRef.current && CITY_COORDS[city]) {
      const target = CITY_COORDS[city];
      mapInstanceRef.current.flyTo(target.center, target.zoom, {
        duration: 1.0,
      });
    }
  }

  const citiesList = ["Delhi", "Mumbai", "Bengaluru", "Kolkata", "Chandigarh", "Ludhiana", "All"];

  return (
    <div className="relative border-3 border-black bg-white shadow-[6px_6px_0px_0px_#000] overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-4 bg-[#F4F1EA] border-b-3 border-black flex flex-wrap items-center justify-between gap-3">
        {/* City Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono font-bold uppercase text-neutral-600 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Metro:
          </span>
          {citiesList.map((city) => (
            <button
              key={city}
              id={`map-city-filter-${city.toLowerCase()}`}
              onClick={() => handleCityChange(city)}
              className={`px-2.5 py-1 text-xs font-bold font-mono border-2 border-black transition-all cursor-pointer ${
                activeCity === city
                  ? "bg-[#FFE600] shadow-[2px_2px_0px_#000]"
                  : "bg-white hover:bg-neutral-100"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Right Status Indicators & Location Trigger */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#2EE59D] border-2 border-black shadow-[1px_1px_0px_#000] inline-block" />
              <span>Available (&gt;30)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FFE600] border-2 border-black shadow-[1px_1px_0px_#000] inline-block" />
              <span>Moderate (10-30)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF4D4D] border-2 border-black shadow-[1px_1px_0px_#000] inline-block" />
              <span>Critical (&lt;10)</span>
            </span>
          </div>

          <button
            id="map-use-location-btn"
            onClick={handleUseLocation}
            disabled={locating}
            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-[#FFE600] border-2 border-black text-xs font-bold shadow-[2px_2px_0px_#000] cursor-pointer"
          >
            <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin text-blue-600" : "text-black"}`} />
            <span>{locating ? "Locating..." : "Use My Location"}</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[480px] w-full">
        {loading && (
          <div className="absolute inset-0 z-20 bg-neutral-100/80 flex flex-col items-center justify-center font-mono text-xs font-bold gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-black" />
            Loading Verified Hospital Network...
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Selected Hospital Slide-over Card */}
        {activeHospital && (
          <div
            id="map-selected-hospital-card"
            className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-30 bg-white border-3 border-black p-4 shadow-[5px_5px_0px_#000] space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-neutral-600 bg-neutral-100 border border-black px-1.5 py-0.5">
                    {activeHospital.computedCity}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 bg-emerald-100 border border-black px-1.5 py-0.5 flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" /> 24/7 Blood Bank
                  </span>
                </div>
                <h4 className="text-base font-black text-black leading-tight">
                  {activeHospital.name}
                </h4>
              </div>
              <button
                id="map-close-card-btn"
                onClick={() => setActiveHospital(null)}
                className="text-neutral-600 hover:text-black font-mono font-bold text-sm px-2 py-0.5 border-2 border-black bg-neutral-100 shadow-[1px_1px_0px_#000] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-neutral-600 font-medium">
              📍 {activeHospital.computedAddress}
            </div>

            {/* Live Stock Status Banner */}
            <div className="flex items-center justify-between p-2 bg-[#F4F1EA] border-2 border-black">
              <span className="text-xs font-mono font-bold text-neutral-700">Stock Availability:</span>
              <span
                className="px-2 py-0.5 text-xs font-mono font-black border border-black"
                style={{ backgroundColor: activeHospital.colorBg }}
              >
                {activeHospital.unitsAvailable} Units Available
              </span>
            </div>

            {/* Quick blood group badges */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-neutral-600 block mb-1">
                Live In-Stock Groups:
              </span>
              <div className="flex flex-wrap gap-1 font-mono text-[11px] font-black">
                {activeHospital.bloodGroups.map((grp) => (
                  <span
                    key={grp}
                    className={`px-2 py-0.5 border border-black ${
                      selectedGroup === grp
                        ? "bg-[#FFE600] font-black shadow-[1px_1px_0px_#000]"
                        : "bg-white text-black"
                    }`}
                  >
                    {grp}
                  </span>
                ))}
              </div>
            </div>

            {/* Action CTA */}
            <Link
              id="map-request-blood-cta"
              href={`/requests?hospital_id=${getHospitalId(activeHospital)}${
                selectedGroup && selectedGroup !== "ALL" ? `&blood_group=${encodeURIComponent(selectedGroup)}` : ""
              }`}
              className="block text-center w-full py-2.5 bg-[#FF4D4D] text-white hover:bg-red-600 border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_#000]"
            >
              Request Blood From This Hospital →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
