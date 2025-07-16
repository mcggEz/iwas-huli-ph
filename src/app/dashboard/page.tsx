'use client';

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

function loadGoogleMapsScript(apiKey: string): Promise<void> | undefined {
  if (typeof window === "undefined") return;
  if ((window as any).google && (window as any).google.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const VIOLATION_ZONES = [
  {
    position: { lat: 14.5995, lng: 120.9842 },
    title: "Quiapo",
    description: "Frequent no parking violations.",
    radius: 200 // meters
  },
  {
    position: { lat: 14.6091, lng: 121.0223 },
    title: "EDSA Cubao",
    description: "Speeding and lane violations.",
    radius: 300 // meters
  },
  {
    position: { lat: 14.5611, lng: 121.0133 },
    title: "Makati CBD",
    description: "One-way and illegal turn violations.",
    radius: 250 // meters
  }
];

const VIOLATION_TYPES = [
  "No Parking",
  "Speeding",
  "Illegal Turn",
  "One-Way Violation",
  "Red Light Violation",
  "Illegal Overtaking",
  "Blocking Intersection",
  "No Helmet (Motorcycle)",
  "Overloading",
  "Other"
];

// Theme configurations
const DARK_THEME = {
  bg: "#1a1a1a",
  bgSecondary: "#0a0a0a",
  text: "#ffffff",
  textSecondary: "#888888",
  border: "#ffffff",
  accent: "#ff4444",
  success: "#00ff00",
  mapStyles: [
    { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#3a3a3a" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a4a4a" }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] }
  ]
};

const LIGHT_THEME = {
  bg: "#f8f9fa",
  bgSecondary: "#e9ecef",
  text: "#1a1a1a",
  textSecondary: "#666666",
  border: "#1a1a1a",
  accent: "#ff4444",
  success: "#00aa00",
  mapStyles: [
    { elementType: "geometry", stylers: [{ color: "#f8f9fa" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#1a1a1a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f8f9fa" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#cccccc" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#bbbbbb" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#999999" }] },
    { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#dddddd" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#e3f2fd" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#eeeeee" }] }
  ]
};

// Helper function to calculate distance between two points in meters
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper function to check if a point is near any violation zone
function isNearViolationZone(lat: number, lng: number): boolean {
  return VIOLATION_ZONES.some(zone => {
    const distance = calculateDistance(lat, lng, zone.position.lat, zone.position.lng);
    return distance <= zone.radius;
  });
}

// Helper function to generate circle path for polygon
function generateCirclePath(centerLat: number, centerLng: number, radius: number): any[] {
  const points = [];
  const numPoints = 32;
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const lat = centerLat + (radius / 111320) * Math.cos(angle);
    const lng = centerLng + (radius / (111320 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
    points.push({ lat, lng });
  }
  
  return points;
}

export default function Dashboard() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropMode, setIsDropMode] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [userMarkers, setUserMarkers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [highlightRoads, setHighlightRoads] = useState(true);
  const [violationPolygons, setViolationPolygons] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<any>(null);
  const notifiedZonesRef = useRef<{ [key: string]: number }>({});

  const [formData, setFormData] = useState({
    violationType: "",
    description: "",
    reasons: "",
    solutions: ""
  });

  // Function to generate map styles (normal roads)
  const generateMapStyles = () => {
    const baseTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;
    return [...baseTheme.mapStyles];
  };

  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return; // Don't load if not set
    let markers: any[] = [];
    let infoWindow: any = null;
    let mapInstance: any = null;
    
    loadGoogleMapsScript(apiKey)?.then(() => {
      if (mapRef.current && (window as any).google) {
        // @ts-ignore
        mapInstance = new (window as any).google.maps.Map(mapRef.current, {
          center: { lat: 14.5995, lng: 120.9842 },
          zoom: 12,
          disableDefaultUI: true,
          styles: generateMapStyles()
        });
        setMap(mapInstance);

        // Add user geolocation marker
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            mapInstance.setCenter({ lat: latitude, lng: longitude });
            // Add marker or blue dot
            const marker = new (window as any).google.maps.Marker({
              position: { lat: latitude, lng: longitude },
              map: mapInstance,
              title: 'You are here',
              icon: {
                path: (window as any).google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
              }
            });
            setUserLocationMarker(marker);
          });
        }

        // Add violation zone markers
        infoWindow = new (window as any).google.maps.InfoWindow();
        
        markers = VIOLATION_ZONES.map((zone) => {
          const marker = new (window as any).google.maps.Marker({
            position: zone.position,
            map: mapInstance,
            title: zone.title,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#ff4444" stroke="#ffffff" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new (window as any).google.maps.Size(36, 36)
            }
          });
          
          marker.addListener("click", () => {
            infoWindow.setContent(`
              <div style="background: #171717; color: #ededed; font-family: 'Geist Mono', 'Fira Mono', 'monospace'; border: 1.5px solid #ff4444; border-radius: 8px; box-shadow: 0 2px 12px #000a; padding: 16px; min-width: 220px; max-width: 320px;">
                <div style="font-size: 1.1rem; font-weight: bold; color: #ff4444; margin-bottom: 6px; letter-spacing: 1px;">${zone.title}</div>
                <div style="font-size: 0.95rem; color: #ededed; margin-bottom: 8px;">${zone.description}</div>
                <div style="font-size: 0.85rem; color: #888;">Violation Zone</div>
              </div>
            `);
            infoWindow.open(mapInstance, marker);
          });
          return marker;
        });

        // Add click listener for drop mode
        mapInstance.addListener("click", (event: any) => {
          if (isDropMode) {
            setSelectedLocation(event.latLng);
            setShowForm(true);
            setIsDropMode(false);
          }
        });
      }
    });
    return () => {};
  }, [isDropMode, isDarkMode, highlightRoads]);

  // Update map styles when theme changes
  useEffect(() => {
    if (map) {
      map.setOptions({ styles: generateMapStyles() });
    }
  }, [isDarkMode]);

  // Manage violation zone highlighting when toggled
  useEffect(() => {
    if (map) {
      // Remove existing polygons
      violationPolygons.forEach(polygon => {
        polygon.setMap(null);
      });
      
      if (highlightRoads) {
        // Create red-tinted areas that make roads appear red within violation zones
        const newPolygons = VIOLATION_ZONES.map((zone) => {
          return new (window as any).google.maps.Polygon({
            paths: generateCirclePath(zone.position.lat, zone.position.lng, zone.radius),
            strokeColor: '#ff6666',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#ff6666',
            fillOpacity: 0.6, // High opacity to make roads clearly appear red
            map: map,
          });
        });
        setViolationPolygons(newPolygons);
      } else {
        setViolationPolygons([]);
      }
    }
  }, [highlightRoads, map]);

  useEffect(() => {
    let watchId: number | undefined;
    if (typeof window !== 'undefined' && 'geolocation' in navigator && 'Notification' in window) {
      Notification.requestPermission();
      watchId = navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        VIOLATION_ZONES.forEach(zone => {
          const distance = calculateDistance(latitude, longitude, zone.position.lat, zone.position.lng);
          if (distance <= zone.radius) {
            // Only notify if not notified in the last 2 minutes for this zone
            const now = Date.now();
            if (!notifiedZonesRef.current[zone.title] || now - notifiedZonesRef.current[zone.title] > 2 * 60 * 1000) {
              if (Notification.permission === 'granted') {
                new Notification('IWAS HULI ALERT', {
                  body: `You are near ${zone.title}: ${zone.description}`,
                  icon: '/favicon.ico'
                });
                notifiedZonesRef.current[zone.title] = now;
              }
            }
          }
        });
      });
    }
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim() && map) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery + ", Manila, Philippines" }, (results: any, status: any) => {
        if (status === 'OK') {
          map.setCenter(results[0].geometry.location);
          map.setZoom(15);
        }
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new marker with violation data
    if (selectedLocation && map) {
      const newMarker = new (window as any).google.maps.Marker({
        position: selectedLocation,
        map: map,
        title: formData.violationType || "User Violation",
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#00ff00" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new (window as any).google.maps.Size(24, 24)
        }
      });

      // Add click listener to show violation details
      const infoWindow = new (window as any).google.maps.InfoWindow();
      newMarker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="background: #171717; color: #ededed; font-family: 'Geist Mono', 'Fira Mono', 'monospace'; border: 1.5px solid #00ff00; border-radius: 8px; box-shadow: 0 2px 12px #000a; padding: 16px; min-width: 220px; max-width: 320px;">
            <div style="font-size: 1.1rem; font-weight: bold; color: #00ff00; margin-bottom: 6px; letter-spacing: 1px;">${formData.violationType}</div>
            <div style="font-size: 0.95rem; color: #ededed; margin-bottom: 8px;"><b>Description:</b> ${formData.description}</div>
            <div style="font-size: 0.95rem; color: #ededed; margin-bottom: 8px;"><b>Reasons:</b> ${formData.reasons}</div>
            <div style="font-size: 0.95rem; color: #ededed; margin-bottom: 8px;"><b>Solutions:</b> ${formData.solutions}</div>
            <div style="font-size: 0.85rem; color: #888;">User Reported</div>
          </div>
        `);
        infoWindow.open(map, newMarker);
      });

      setUserMarkers(prev => [...prev, newMarker]);
    }

    // Reset form and close modal
    setFormData({
      violationType: "",
      description: "",
      reasons: "",
      solutions: ""
    });
    setShowForm(false);
    setSelectedLocation(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden" style={{ backgroundColor: theme.bg }}>
      {/* Map background */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />
      
      {/* Top Bar: Search + Hamburger in one row */}
      <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 w-full max-w-xs sm:max-w-xl z-10 flex flex-row items-center justify-center gap-x-2 px-2 sm:px-0">
        <div className="flex items-center flex-1 rounded-none px-2 sm:px-4 py-2 sm:py-3 shadow-lg" style={{ backgroundColor: `${theme.bg}95`, border: `1px solid ${theme.border}` }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-2 sm:mr-3" style={{ color: theme.text }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search location..."
            className="flex-1 bg-transparent outline-none text-sm sm:text-base font-mono"
            style={{ color: theme.text }}
          />
          <button
            onClick={handleSearch}
            className="ml-2 sm:ml-3 px-2 sm:px-4 py-1 font-mono text-xs sm:text-sm transition-colors"
            style={{ 
              backgroundColor: theme.bg, 
              border: `1px solid ${theme.border}`, 
              color: theme.text 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.border;
              e.currentTarget.style.color = theme.bg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.bg;
              e.currentTarget.style.color = theme.text;
            }}
          >
            SEARCH
          </button>
        </div>
        {/* Hamburger Menu Button - always in row */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-none w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center transition-colors"
            style={{ 
              backgroundColor: `${theme.bg}95`, 
              border: `1px solid ${theme.border}`, 
              color: theme.text 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.border;
              e.currentTarget.style.color = theme.bg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.bg}95`;
              e.currentTarget.style.color = theme.text;
            }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2"/>
              <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/>
              <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2"/>
            </svg>
          </button>
          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute top-12 sm:top-14 right-0 rounded-none min-w-[160px] sm:min-w-[200px] shadow-lg" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
              <div className="py-2">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowSettings(true);
                  }}
                  className="w-full px-4 py-3 text-left font-mono text-sm flex items-center transition-colors"
                  style={{ color: theme.text }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.border;
                    e.currentTarget.style.color = theme.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.text;
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  SETTINGS
                </button>
                <div className="my-1" style={{ borderTop: `1px solid ${theme.border}` }}></div>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    window.location.href = '/';
                  }}
                  className="w-full px-4 py-3 text-left font-mono text-sm flex items-center transition-colors"
                  style={{ color: theme.accent }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.accent;
                    e.currentTarget.style.color = theme.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme.accent;
                  }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  LOGOUT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Road Highlight Toggle Button - Lower Left */}
      <button
        onClick={() => setHighlightRoads(!highlightRoads)}
        className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 rounded-none w-12 sm:w-16 h-12 sm:h-16 flex items-center justify-center transition-colors z-10"
        style={{ 
          backgroundColor: highlightRoads ? theme.accent : `${theme.bg}95`, 
          border: `1px solid ${theme.border}`, 
          color: highlightRoads ? theme.bg : theme.text
        }}
        onMouseEnter={(e) => {
          if (!highlightRoads) {
            e.currentTarget.style.backgroundColor = theme.accent;
            e.currentTarget.style.color = theme.bg;
          }
        }}
        onMouseLeave={(e) => {
          if (!highlightRoads) {
            e.currentTarget.style.backgroundColor = `${theme.bg}95`;
            e.currentTarget.style.color = theme.text;
          }
        }}
        title={highlightRoads ? "Road highlighting ON" : "Road highlighting OFF"}
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </button>

      {/* Drop Landmark Button - Lower Left (moved up) */}
      <button
        onClick={() => setIsDropMode(!isDropMode)}
        className="absolute bottom-4 sm:bottom-8 left-20 sm:left-28 rounded-none w-12 sm:w-16 h-12 sm:h-16 flex items-center justify-center transition-colors z-10"
        style={{ 
          backgroundColor: isDropMode ? theme.border : `${theme.bg}95`, 
          border: `1px solid ${theme.border}`, 
          color: isDropMode ? theme.bg : theme.text
        }}
        onMouseEnter={(e) => {
          if (!isDropMode) {
            e.currentTarget.style.backgroundColor = theme.border;
            e.currentTarget.style.color = theme.bg;
          }
        }}
        onMouseLeave={(e) => {
          if (!isDropMode) {
            e.currentTarget.style.backgroundColor = `${theme.bg}95`;
            e.currentTarget.style.color = theme.text;
          }
        }}
        title={isDropMode ? "Click on map to drop landmark" : "Drop Landmark"}
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
          <line x1="12" y1="8" x2="12" y2="16" strokeWidth="2"/>
          <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2"/>
        </svg>
      </button>

      {/* Drop Mode Indicator */}
      {isDropMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-2 sm:px-4 py-2 font-mono text-xs sm:text-sm z-10" style={{ backgroundColor: `${theme.bg}95`, border: `1px solid ${theme.border}`, color: theme.text }}>
          CLICK ON MAP TO DROP LANDMARK
        </div>
      )}

      {/* Current Location Button - Lower Right */}
      <button
        className="absolute bottom-4 sm:bottom-8 right-4 sm:right-8 rounded-none w-12 sm:w-16 h-12 sm:h-16 flex items-center justify-center transition-colors z-10"
        style={{ 
          backgroundColor: `${theme.bg}95`, 
          border: `1px solid ${theme.border}`, 
          color: theme.text 
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.border;
          e.currentTarget.style.color = theme.bg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = `${theme.bg}95`;
          e.currentTarget.style.color = theme.text;
        }}
        title="Current Location"
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5A6.5 6.5 0 1 0 12 5.5a6.5 6.5 0 0 0 0 13zm0 0v2m0-2v-2m0 2h2m-2 0h-2" />
        </svg>
      </button>

      {/* Violation Report Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-none p-8 max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-mono" style={{ color: theme.text }}>REPORT VIOLATION</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedLocation(null);
                  setFormData({
                    violationType: "",
                    description: "",
                    reasons: "",
                    solutions: ""
                  });
                }}
                className="font-mono hover:text-[#ff4444] transition-colors"
                style={{ color: theme.text }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <label className="block font-mono mb-2" style={{ color: theme.text }}>VIOLATION TYPE</label>
                <select
                  name="violationType"
                  value={formData.violationType}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 font-mono rounded-none focus:outline-none"
                  style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, color: theme.text }}
                >
                  <option value="">Select violation type</option>
                  {VIOLATION_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono mb-2" style={{ color: theme.text }}>DESCRIPTION</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Describe what happened..."
                  className="w-full p-3 font-mono rounded-none h-24 resize-none focus:outline-none"
                  style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>

              <div>
                <label className="block font-mono mb-2" style={{ color: theme.text }}>REASONS</label>
                <textarea
                  name="reasons"
                  value={formData.reasons}
                  onChange={handleInputChange}
                  required
                  placeholder="Why did this violation occur? (poor signage, unclear rules, etc.)"
                  className="w-full p-3 font-mono rounded-none h-24 resize-none focus:outline-none"
                  style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>

              <div>
                <label className="block font-mono mb-2" style={{ color: theme.text }}>SUGGESTED SOLUTIONS</label>
                <textarea
                  name="solutions"
                  value={formData.solutions}
                  onChange={handleInputChange}
                  required
                  placeholder="How can this be improved? (better signage, traffic lights, etc.)"
                  className="w-full p-3 font-mono rounded-none h-24 resize-none focus:outline-none"
                  style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 font-bold py-3 font-mono rounded-none transition-colors"
                  style={{ backgroundColor: theme.success, color: theme.bg }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.success === "#00ff00" ? "#00cc00" : "#008800";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.success;
                  }}
                >
                  SUBMIT REPORT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedLocation(null);
                    setFormData({
                      violationType: "",
                      description: "",
                      reasons: "",
                      solutions: ""
                    });
                  }}
                  className="flex-1 font-bold py-3 font-mono rounded-none transition-colors"
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.border;
                    e.currentTarget.style.color = theme.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.bg;
                    e.currentTarget.style.color = theme.text;
                  }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-none p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold font-mono" style={{ color: theme.text }}>SETTINGS</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="font-mono text-2xl hover:text-[#ff4444] transition-colors"
                style={{ color: theme.text }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-8">
              {/* Notifications Section */}
              <div className="p-6" style={{ border: `1px solid ${theme.border}` }}>
                <h3 className="text-xl font-bold font-mono mb-4" style={{ color: theme.text }}>NOTIFICATIONS</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono" style={{ color: theme.text }}>PROXIMITY ALERTS</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff4444] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00ff00]" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}` }}></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono" style={{ color: theme.text }}>SOUND ALERTS</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff4444] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00ff00]" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}` }}></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono" style={{ color: theme.text }}>VIBRATION ALERTS</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff4444] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00ff00]" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}` }}></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Map Settings Section */}
              <div className="p-6" style={{ border: `1px solid ${theme.border}` }}>
                <h3 className="text-xl font-bold font-mono mb-4" style={{ color: theme.text }}>MAP SETTINGS</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono mb-2" style={{ color: theme.text }}>ALERT DISTANCE</label>
                    <select defaultValue="200" className="w-full p-3 font-mono rounded-none focus:outline-none" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, color: theme.text }}>
                      <option value="100">100 meters</option>
                      <option value="200">200 meters</option>
                      <option value="500">500 meters</option>
                      <option value="1000">1 kilometer</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono" style={{ color: theme.text }}>SHOW USER MARKERS</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff4444] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00ff00]" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}` }}></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono" style={{ color: theme.text }}>AUTO-CENTER ON LOCATION</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff4444] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00ff00]" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}` }}></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono" style={{ color: theme.text }}>HIGHLIGHT VIOLATION ZONE ROADS</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={highlightRoads}
                        onChange={() => setHighlightRoads(!highlightRoads)}
                      />
                      <div className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff4444] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00ff00]" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}` }}></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* User Settings Section */}
              <div className="p-6" style={{ border: `1px solid ${theme.border}` }}>
                <h3 className="text-xl font-bold font-mono mb-4" style={{ color: theme.text }}>USER SETTINGS</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono mb-2" style={{ color: theme.text }}>LANGUAGE</label>
                    <select defaultValue="en" className="w-full p-3 font-mono rounded-none focus:outline-none" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, color: theme.text }}>
                      <option value="en">English</option>
                      <option value="tl">Tagalog</option>
                      <option value="ceb">Cebuano</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono" style={{ color: theme.text }}>DARK MODE</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isDarkMode}
                        onChange={() => setIsDarkMode(!isDarkMode)}
                      />
                      <div className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff4444] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border-gray-300 after:border after:rounded-none after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00ff00]" style={{ backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}` }}></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 font-bold py-3 font-mono rounded-none transition-colors"
                  style={{ backgroundColor: theme.success, color: theme.bg }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.success === "#00ff00" ? "#00cc00" : "#008800";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.success;
                  }}
                >
                  SAVE SETTINGS
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 font-bold py-3 font-mono rounded-none transition-colors"
                  style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.border;
                    e.currentTarget.style.color = theme.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.bg;
                    e.currentTarget.style.color = theme.text;
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 