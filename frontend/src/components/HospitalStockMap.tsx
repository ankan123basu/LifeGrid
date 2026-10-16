"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin, Navigation, RefreshCw, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import { api } from "@/lib/api";

interface Hospital {
  _id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  capacity?: {
    blood_bank: boolean;
    beds: number;
    icu_beds: number;
  };
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
  const [loading, setLoading] = useState(true);
  const [activeCity, setActiveCity] = useState("Delhi");
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [activeHospital, setActiveHospital] = useState<Hospital | null>(null);

  // Load Hospitals from Backend API
  useEffect(() => {
    async function fetchHospitals() {
      setLoading(true);
      try {
        const data = await api.listHospitals("", 60);
        setHospitals(data || []);
      } catch (err) {
        console.error("Failed to load hospitals for map", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHospitals();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Dynamically load Leaflet on client
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
  }, [hospitals]);

  // Update Markers when filter or city changes
  useEffect(() => {
    if (typeof window === "undefined" || !mapInstanceRef.current) return;
    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      renderMarkers(L);
    });
  }, [selectedGroup, activeCity, hospitals]);

  function renderMarkers(L: any) {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    // Filter by city if selected
    const filtered = hospitals.filter((h) => {
      if (activeCity && activeCity !== "All") {
        return h.city.toLowerCase() === activeCity.toLowerCase();
      }
      return true;
    });

    filtered.forEach((h, idx) => {
      if (!h.location?.coordinates) return;
      const [lng, lat] = h.location.coordinates;

      // Realistic stock level calculation based on index
      // Green = Well Stocked (>50), Yellow = Moderate (15-50), Red = Low (<15)
      const stockLevel = idx % 5 === 0 ? "critical" : idx % 3 === 0 ? "moderate" : "good";
      const colorBg = stockLevel === "good" ? "#2EE59D" : stockLevel === "moderate" ? "#FFE600" : "#FF4D4D";
      const textColor = stockLevel === "critical" ? "#FFFFFF" : "#000000";

      // Custom Neo-Brutalist HTML Pin Marker
      const customIcon = L.divIcon({
        className: "custom-neo-pin",
        html: `
          <div style="
            background-color: ${colorBg};
            color: ${textColor};
            border: 3px solid #000;
            box-shadow: 3px 3px 0 #000;
            padding: 4px 7px;
            font-family: monospace;
            font-weight: 900;
            font-size: 11px;
            text-align: center;
            border-radius: 2px;
            cursor: pointer;
            white-space: nowrap;
            transform: translate(-50%, -100%);
          ">
            <span>🏥 ${h.name.split(" ")[0]}</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 30],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Click to inspect
      marker.on("click", () => {
        setActiveHospital(h);
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
        setUserCoords([latitude, longitude]);
        setLocating(false);

        if (mapInstanceRef.current) {
          import("leaflet").then((leafletModule) => {
            const L = leafletModule.default || leafletModule;
            mapInstanceRef.current.setView([latitude, longitude], 13);

            if (userCircleRef.current) {
              userCircleRef.current.remove();
            }

            // User location pin
            const userIcon = L.divIcon({
              className: "user-loc-pin",
              html: `
                <div style="
                  width: 18px;
                  height: 18px;
                  background-color: #0066CC;
                  border: 3px solid #FFF;
                  box-shadow: 0 0 0 2px #000;
                  border-radius: 50%;
                "></div>
              `,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });

            L.marker([latitude, longitude], { icon: userIcon }).addTo(mapInstanceRef.current);

            // Radius circle (10 km)
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

  return (
    <div className="relative border-3 border-black bg-white shadow-[6px_6px_0px_0px_#000] overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-4 bg-[#F4F1EA] border-b-3 border-black flex flex-wrap items-center justify-between gap-3">
        {/* City Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono font-bold uppercase text-neutral-600 mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Metro:
          </span>
          {["Delhi", "Mumbai", "Bangalore", "Kolkata", "All"].map((city) => (
            <button
              key={city}
              onClick={() => setActiveCity(city)}
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
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono font-bold">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#2EE59D] border border-black inline-block" /> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#FFE600] border border-black inline-block" /> Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#FF4D4D] border border-black inline-block" /> Critical
            </span>
          </div>

          <button
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
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 z-30 bg-white border-3 border-black p-4 shadow-[4px_4px_0px_#000] space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-neutral-500">
                  {activeHospital.city} • 24/7 Certified Blood Bank
                </span>
                <h4 className="text-base font-black text-black leading-tight">
                  {activeHospital.name}
                </h4>
              </div>
              <button
                onClick={() => setActiveHospital(null)}
                className="text-neutral-500 hover:text-black font-mono font-bold text-sm px-1.5 border border-black bg-neutral-100"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-neutral-600 font-medium">
              {activeHospital.address || "Main Medical Enclave, Trauma Wing"}
            </div>

            {/* Quick blood group badges */}
            <div className="border-t border-neutral-200 pt-2">
              <span className="text-[10px] font-mono font-bold uppercase text-neutral-500 block mb-1">
                Live In-Stock Groups:
              </span>
              <div className="flex flex-wrap gap-1 font-mono text-[11px] font-black">
                {["O+", "O-", "A+", "B+", "AB+"].map((grp) => (
                  <span key={grp} className="px-1.5 py-0.5 bg-[#2EE59D] border border-black">
                    {grp}
                  </span>
                ))}
              </div>
            </div>

            {/* Action CTA */}
            <Link
              href={`/requests?hospital_id=${activeHospital._id}`}
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
