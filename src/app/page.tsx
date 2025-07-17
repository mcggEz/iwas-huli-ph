/// <reference types="google.maps" />
'use client';

/**
 * @typedef {import('google.maps')} google
 */

import { useEffect, useRef, useState } from "react";


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

// Define a type for Google Maps stylers that allows both color and visibility
// Place this above the theme definitions

type MapStyle = {
  featureType?: string;
  elementType: string;
  stylers: ({ color?: string; visibility?: string })[];
};

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
  ] as MapStyle[]
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
  ] as MapStyle[]
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
  return false; // No hardcoded zones, so always false
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

// Add these above the Dashboard component
const REASON_OPTIONS = [
  'Poor signage',
  'Unclear rules',
  'Obstructed view',
  'Driver confusion',
  'Other',
];
const SOLUTION_OPTIONS = [
  'Better signage',
  'Install traffic lights',
  'Increase enforcement',
  'Public awareness campaign',
  'Other',
];

export default function Dashboard() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [highlightRoads, setHighlightRoads] = useState(true);
  const [isDrivingMode, setIsDrivingMode] = useState(false);
  const drivingWatchId = useRef<number | null>(null);
  const [violationPolygons, setViolationPolygons] = useState<google.maps.Polygon[]>([]);
  const [, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);
  const notifiedZonesRef = useRef<{ [key: string]: number }>({});

  // State for selected violation (for side panel)
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  // State for selected address
  const [selectedAddress, setSelectedAddress] = useState('');
  // Store all violation reports
  const [violationReports, setViolationReports] = useState<any[]>([]);
  // State for showing the graph
  const [showGraph, setShowGraph] = useState(false);
  // State for showing the mobile app panel
  const [showMobileAppPanel, setShowMobileAppPanel] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);

  // Settings state
  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [vibrationAlerts, setVibrationAlerts] = useState(false);
  const [alertDistance, setAlertDistance] = useState(200);
  const [language, setLanguage] = useState('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [formData, setFormData] = useState({
    violationType: "",
    reasons: "",
    solutions: ""
  });

  const [showLandmarks, setShowLandmarks] = useState(true);
  const [reasonOther, setReasonOther] = useState('');
  const [solutionOther, setSolutionOther] = useState('');
  // In Dashboard component state:
  const [violationTypeOther, setViolationTypeOther] = useState('');

  // Function to generate map styles (normal roads)
  const generateMapStyles = () => {
    const baseTheme = isDarkMode ? DARK_THEME : LIGHT_THEME;
    let styles = [...baseTheme.mapStyles];
    if (!showLandmarks) {
      styles = [
        ...styles,
        { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "poi.business", elementType: "all", stylers: [{ visibility: "off" }] },
        { featureType: "poi.park", elementType: "all", stylers: [{ visibility: "off" }] },
        { featureType: "poi.attraction", elementType: "all", stylers: [{ visibility: "off" }] },
        { featureType: "poi.place_of_worship", elementType: "all", stylers: [{ visibility: "off" }] },
        { featureType: "poi.school", elementType: "all", stylers: [{ visibility: "off" }] },
        { featureType: "poi.medical", elementType: "all", stylers: [{ visibility: "off" }] },
      ];
    }
    return styles;
  };

  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  // Initialize map
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

        // User location will be added when driving mode is enabled

        // Add violation zone markers
        infoWindow = new (window as any).google.maps.InfoWindow();
        
      }
    });
    return () => {};
  }, [isDarkMode, highlightRoads, showLandmarks]);

  // Update map styles when theme changes
  useEffect(() => {
    if (map) {
      map.setOptions({ styles: generateMapStyles() });
    }
  }, [isDarkMode, showLandmarks]);

  // Manage violation zone highlighting when toggled
  useEffect(() => {
    if (map) {
      // Remove existing polygons
      violationPolygons.forEach(polygon => {
        polygon.setMap(null);
      });
      
      if (highlightRoads) {
        // Create red-tinted areas that make roads appear red within violation zones
        const newPolygons: any[] = [];
        setViolationPolygons(newPolygons);
      } else {
        setViolationPolygons([]);
      }
    }
  }, [highlightRoads, map]);

  // Removed automatic permission requests - will only request when driving mode is activated

  // Handler for driving mode toggle with permission requests
  const handleDrivingModeToggle = async () => {
    if (!isDrivingMode) {
      // Request permissions when turning ON driving mode
      if (typeof window !== 'undefined' && 'geolocation' in navigator && 'Notification' in window) {
        try {
          console.log('Requesting permissions for driving mode...');
          
          // Step 1: Request notification permission
          console.log('Requesting notification permission...');
          const notificationPermission = await Notification.requestPermission();
          console.log('Notification permission result:', notificationPermission);
          
          // Step 2: Request geolocation permission
          console.log('Requesting geolocation permission...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Both permissions granted successfully
              console.log('✅ Both permissions granted!');
              console.log('Geolocation permission granted');
              console.log('User location:', position.coords);
              
              const { latitude, longitude } = position.coords;
              setUserLocation({ lat: latitude, lng: longitude });
              if (map) {
                map.setCenter({ lat: latitude, lng: longitude });
              }
              
              // Create user location marker
              const marker = new (window as any).google.maps.Marker({
                position: { lat: latitude, lng: longitude },
                map: map,
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
              
              setIsDrivingMode(true);
              console.log('Driving mode enabled successfully!');
            },
            (error) => {
              // Geolocation permission denied or error
              console.error('❌ Geolocation error:', error);
              let errorMessage = 'Location permission is required for driving mode. ';
              
              switch (error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage += 'Please enable location access in your browser settings.';
                  console.log('User denied location permission');
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage += 'Location information is unavailable.';
                  console.log('Location information unavailable');
                  break;
                case error.TIMEOUT:
                  errorMessage += 'Location request timed out.';
                  console.log('Location request timed out');
                  break;
                default:
                  errorMessage += 'An unknown error occurred.';
                  console.log('Unknown geolocation error');
              }
              
              alert(errorMessage);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          );
        } catch (error) {
          console.error('❌ Error requesting permissions:', error);
          alert('Unable to request permissions. Please check your browser settings.');
        }
      } else {
        // Fallback if APIs not available
        console.log('⚠️ Geolocation or Notification APIs not available');
        setIsDrivingMode(true);
      }
    } else {
      // Turning OFF driving mode
      console.log('Turning off driving mode...');
      setIsDrivingMode(false);
    }
  };

  // Driving Mode: Center map on user and keep updated
  useEffect(() => {
    if (!map) return;
    if (isDrivingMode) {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        drivingWatchId.current = navigator.geolocation.watchPosition((position) => {
          const { latitude, longitude } = position.coords;
          map.setCenter({ lat: latitude, lng: longitude });
          
          // Check proximity to violation zones
          checkProximityToViolations(latitude, longitude);
        });
      }
    } else {
      if (drivingWatchId.current !== null) {
        navigator.geolocation.clearWatch(drivingWatchId.current);
        drivingWatchId.current = null;
      }
    }
    // Cleanup on unmount or mode change
    return () => {
      if (drivingWatchId.current !== null) {
        navigator.geolocation.clearWatch(drivingWatchId.current);
        drivingWatchId.current = null;
      }
    };
  }, [isDrivingMode, map, proximityAlerts, alertDistance, violationReports]);

  // User location marker will be managed by driving mode

  // Function to play alert sound
  const playAlertSound = () => {
    if (soundAlerts) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
      } catch (error) {
        console.log('Audio not supported');
      }
    }
  };

  // Function to trigger vibration
  const triggerVibration = () => {
    if (vibrationAlerts && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (error) {
        console.log('Vibration not supported');
      }
    }
  };

  // Function to show notification
  const showNotification = (title: string, body: string) => {
    if (proximityAlerts && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'violation-alert'
        });
      } catch (error) {
        console.log('Notification failed:', error);
      }
    }
  };

  // Function to trigger all alerts
  const triggerAlerts = (title: string, body: string) => {
    showNotification(title, body);
    playAlertSound();
    triggerVibration();
  };

  // Function to check proximity to violation zones
  const checkProximityToViolations = (userLat: number, userLng: number) => {
    if (!proximityAlerts || !isDrivingMode) return;

    violationReports.forEach((violation, index) => {
      const distance = calculateDistance(userLat, userLng, violation.lat, violation.lng);
      
      if (distance <= alertDistance) {
        const title = 'Violation Zone Ahead!';
        const body = `${violation.type} violation zone detected within ${Math.round(distance)}m`;
        triggerAlerts(title, body);
      }
    });
  };

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
    
    // Create violation zone circle and marker only when form is submitted
    if (selectedLocation && map) {
      // Create violation zone polygon
      const newPolygon = new (window as any).google.maps.Polygon({
        paths: generateCirclePath(selectedLocation.lat, selectedLocation.lng, 50), // 50 meter radius
        strokeColor: '#ff4444',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#ff4444',
        fillOpacity: 0.2,
        map: map
      });
      setViolationPolygons(prev => [...prev, newPolygon]);

      // Create new marker with violation data
      const newMarker = new (window as any).google.maps.Marker({
        position: selectedLocation,
        map: map,
        title: formData.violationType || "User Violation",
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#ff4444" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new (window as any).google.maps.Size(24, 24)
        }
      });

      // Add click listener to show violation details in side panel
      newMarker.addListener("click", () => {
        const pos = newMarker.getPosition();
        setSelectedViolation({
          type: formData.violationType,
          reasons: formData.reasons,
          solutions: formData.solutions,
          lat: pos.lat(),
          lng: pos.lng(),
        });
      });

     // Add this report to the violationReports array
     setViolationReports(prev => [
       ...prev,
       {
         type: formData.violationType,
         reasons: formData.reasons,
         solutions: formData.solutions,
         lat: selectedLocation.lat,
         lng: selectedLocation.lng,
         timestamp: Date.now(),
       }
     ]);

    }

    // Reset form and close modal
    setFormData({
      violationType: "",
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



  // Fetch address when a violation is selected
  useEffect(() => {
    if (selectedViolation && selectedViolation.lat && selectedViolation.lng) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setSelectedAddress('API key not set');
        return;
      }
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedViolation.lat},${selectedViolation.lng}&key=${apiKey}`)
        .then(res => res.json())
        .then(data => {
          if (data.results && data.results[0]) {
            setSelectedAddress(data.results[0].formatted_address);
          } else {
            setSelectedAddress('Address not found');
          }
        })
        .catch(() => setSelectedAddress('Address not found'));
    } else {
      setSelectedAddress('');
    }
  }, [selectedViolation]);

  // Handler for '+ I also have this violation' button
  const handleAddAnotherViolation = () => {
    if (selectedViolation && selectedViolation.lat && selectedViolation.lng) {
      setSelectedLocation({ lat: selectedViolation.lat, lng: selectedViolation.lng });
      setShowForm(true);
    }
  };
  // Handler for '+ I have another violation here' button
  const handleAddDifferentViolation = () => {
    if (selectedViolation && selectedViolation.lat && selectedViolation.lng) {
      setSelectedLocation({ lat: selectedViolation.lat, lng: selectedViolation.lng });
      setFormData({ violationType: '', reasons: '', solutions: '' });
      setShowForm(true);
    }
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: theme.bg,
      }}
    >
      {/* Map background */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />
      
      {/* Top Bar: Search + Hamburger in one row */}
      <div className="absolute top-2 sm:top-4 md:top-6 left-1/2 -translate-x-1/2 w-full max-w-[95%] sm:max-w-2xl lg:max-w-4xl z-10 flex flex-row items-center justify-center gap-x-1 sm:gap-x-2 px-2 sm:px-0">
        {/* Search Bar */}
        <div className="flex items-center flex-1 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 shadow-lg backdrop-blur-sm" style={{ 
          backgroundColor: `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`, 
          border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}` 
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-2 sm:mr-3 flex-shrink-0" style={{ color: isDarkMode ? '#cccccc' : '#666666' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search location..."
            className="flex-1 bg-transparent outline-none text-sm sm:text-base font-medium min-w-0"
            style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
          />
          <button
            onClick={handleSearch}
            className="ml-2 sm:ml-3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 hover:scale-105"
            style={{ 
              backgroundColor: '#ff4444', 
              color: '#ffffff' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b71c1c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ff4444';
            }}
          >
            Search
          </button>
          </div>

        {/* Graph Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowGraph(true)}
            className="rounded-lg sm:rounded-xl w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm mr-1 sm:mr-2"
            style={{ 
              backgroundColor: `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`, 
              border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
              color: isDarkMode ? '#cccccc' : '#666666'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#333333' : '#f8f9fa';
              e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
              e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
            }}
            title="Show Graph"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="12" width="4" height="8" rx="1" strokeWidth="2" />
              <rect x="9" y="8" width="4" height="12" rx="1" strokeWidth="2" />
              <rect x="15" y="4" width="4" height="16" rx="1" strokeWidth="2" />
            </svg>
          </button>
          </div>

        {/* Hamburger Menu Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg sm:rounded-xl w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
            style={{ 
              backgroundColor: `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`, 
              border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
              color: isDarkMode ? '#cccccc' : '#666666'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#333333' : '#f8f9fa';
              e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
              e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
            }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2"/>
              <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/>
              <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2"/>
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute top-12 sm:top-14 right-0 rounded-lg sm:rounded-xl min-w-[180px] sm:min-w-[220px] shadow-xl backdrop-blur-sm z-20" style={{ 
              backgroundColor: `${isDarkMode ? '#1a1a1a' : '#ffffff'}f0`, 
              border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
              backdropFilter: 'blur(10px)'
            }}>
              <div className="py-2">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowSettings(true);
                  }}
                  className="w-full px-4 py-3 text-left font-medium text-sm flex items-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <div className="my-1" style={{ borderTop: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}` }}></div>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    window.location.href = '/about-us';
                  }}
                  className="w-full px-4 py-3 text-left font-medium text-sm flex items-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: '#ff4444' }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-3">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  About the app
                </button>
        </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Buttons - Responsive Layout */}
      <div className="absolute bottom-2 sm:bottom-4 md:bottom-8 left-2 sm:left-4 md:left-8 flex flex-wrap gap-2 sm:gap-3 z-10">
        {/* Landmarks Toggle Button */}
        <button
          onClick={() => setShowLandmarks((v) => !v)}
          className="rounded-lg sm:rounded-xl w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
          style={{
            backgroundColor: showLandmarks ? '#ff4444' : `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`,
            border: `1px solid ${showLandmarks ? '#ff4444' : isDarkMode ? '#333333' : '#e5e5e5'}`,
            color: showLandmarks ? '#fff' : isDarkMode ? '#cccccc' : '#666666'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ff4444';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#ff4444';
          }}
          onMouseLeave={(e) => {
            if (showLandmarks) {
              e.currentTarget.style.backgroundColor = '#ff4444';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#ff4444';
            } else {
              e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
              e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
              e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
            }
          }}
          title={showLandmarks ? "Hide Place Landmarks" : "Show Place Landmarks"}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
            { !showLandmarks && <line x1="4" y1="4" x2="20" y2="20" stroke="#fff" strokeWidth="2" /> }
          </svg>
        </button>
        {/* Road Highlight Toggle Button */}
      <button
        onClick={() => setHighlightRoads(!highlightRoads)}
          className="rounded-lg sm:rounded-xl w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
        style={{ 
            backgroundColor: highlightRoads ? '#ff4444' : `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`,
            border: `1px solid ${highlightRoads ? '#ff4444' : isDarkMode ? '#333333' : '#e5e5e5'}`,
            color: highlightRoads ? '#fff' : isDarkMode ? '#cccccc' : '#666666'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#ff4444';
          e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#ff4444';
        }}
        onMouseLeave={(e) => {
          if (highlightRoads) {
            e.currentTarget.style.backgroundColor = '#ff4444';
            e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#ff4444';
          } else {
              e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
              e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
              e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
          }
        }}
        title={highlightRoads ? "Violation Zones ON" : "Violation Zones OFF"}
      >
          {(() => {
            const iconColor = highlightRoads ? '#fff' : '#888888';
            return (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={iconColor}>
                <path d="M12 4L2 20h20L12 4z" stroke={iconColor} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="9" x2="12" y2="14" stroke={iconColor} strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1.2" fill={iconColor} />
              </svg>
            );
          })()}
      </button>

        {/* Driving Mode Toggle Button */}
      <button
                        onClick={handleDrivingModeToggle}
          className="rounded-lg sm:rounded-xl w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
        style={{
            backgroundColor: isDrivingMode ? '#4285F4' : `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`,
            border: `1px solid ${isDrivingMode ? '#4285F4' : isDarkMode ? '#333333' : '#e5e5e5'}`,
            color: isDrivingMode ? '#fff' : isDarkMode ? '#cccccc' : '#666666'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#4285F4';
          e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#4285F4';
        }}
        onMouseLeave={(e) => {
          if (isDrivingMode) {
            e.currentTarget.style.backgroundColor = '#4285F4';
            e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#4285F4';
          } else {
              e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
              e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
              e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
          }
        }}
        title={isDrivingMode ? "Driving Mode ON" : "Driving Mode OFF"}
      >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="4" y="11" width="16" height="7" rx="2" strokeWidth="2" />
          <circle cx="7.5" cy="18.5" r="1.5" />
          <circle cx="16.5" cy="18.5" r="1.5" />
          <rect x="7" y="7" width="10" height="4" rx="2" strokeWidth="2" />
        </svg>
      </button>

        {/* Crosshair Button */}
        <button
          onClick={() => setShowCrosshair(!showCrosshair)}
          className="rounded-lg sm:rounded-xl w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
          style={{
            backgroundColor: showCrosshair ? '#ffffff' : `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`,
            border: `1px solid ${showCrosshair ? '#ffffff' : isDarkMode ? '#333333' : '#e5e5e5'}`,
            color: showCrosshair ? '#000000' : isDarkMode ? '#cccccc' : '#666666'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.color = '#000000';
            e.currentTarget.style.borderColor = '#ffffff';
          }}
          onMouseLeave={(e) => {
            if (showCrosshair) {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#000000';
              e.currentTarget.style.borderColor = '#ffffff';
            } else {
              e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
              e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
              e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
            }
          }}
          title={showCrosshair ? "Crosshair ON" : "Crosshair OFF"}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <line x1="12" y1="2" x2="12" y2="22" strokeWidth="2" />
            <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2" />
          </svg>
        </button>
          </div>

      {/* Add Violation Zone Button - Bottom of Screen */}
      {showCrosshair && (
        <button
                      onClick={(e) => {
              // Add click effect - turn red when clicked
              e.currentTarget.style.backgroundColor = '#8b0000';
              e.currentTarget.style.borderColor = '#8b0000';
              
              // Reset after a short delay
              setTimeout(() => {
                // Check if the element still exists before modifying its style
                if (e.currentTarget && e.currentTarget.style) {
                  e.currentTarget.style.backgroundColor = '#ff4444';
                  e.currentTarget.style.borderColor = '#ff4444';
                }
              }, 150);
              
              if (map) {
                // Get the center of the map (where crosshair is pointing)
                const center = map.getCenter();
                if (center) {
                  // Set the selected location and open the violation form
                  setSelectedLocation({ lat: center.lat(), lng: center.lng() });
                  setFormData({ violationType: '', reasons: '', solutions: '' });
                  setShowForm(true);
                }
                setShowCrosshair(false);
              }
            }}
          className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 transform -translate-x-1/2 px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-white font-medium text-sm sm:text-base rounded-lg sm:rounded-xl border transition-all duration-200 shadow-xl backdrop-blur-sm z-10 hover:scale-105 active:scale-95"
          style={{
            backgroundColor: '#ff4444',
            border: '1px solid #ff4444',
            color: '#ffffff',
            transition: 'all 0.2s ease-in-out',
            minWidth: 'max-content'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#b71c1c';
            e.currentTarget.style.borderColor = '#b71c1c';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 68, 68, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ff4444';
            e.currentTarget.style.borderColor = '#ff4444';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          }}
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Violation Zone
          </span>
        </button>
      )}

      {/* Centered Crosshair Overlay */}
      {showCrosshair && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {/* Centered Crosshair */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 pointer-events-none">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ffffff" strokeWidth="2">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>
          

            </div>
      )}





      {/* Violation Report Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-0 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" style={{ 
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
            boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b" style={{ 
              borderColor: isDarkMode ? '#333333' : '#e5e5e5',
              backgroundColor: isDarkMode ? '#0f0f0f' : '#f8f9fa'
            }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ff4444' }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ffffff">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
            </div>
                <div>
                  <h2 className="text-2xl font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Report Violation</h2>
                  <p className="text-sm" style={{ color: isDarkMode ? '#888888' : '#666666' }}>Document traffic violation details</p>
            </div>
          </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedLocation(null);
                  setFormData({
                    violationType: "",
                    reasons: "",
                    solutions: ""
                  });
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: isDarkMode ? '#888888' : '#666666' }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
        </div>

            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
            <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* Violation Type */}
              <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: isDarkMode ? '#cccccc' : '#666666' }}>
                    Violation Type
                  </label>
                <select
                  name="violationType"
                  value={formData.violationType}
                  onChange={e => {
                    handleInputChange(e);
                    if (e.target.value !== 'Other') setViolationTypeOther('');
                  }}
                  required
                  className="w-full p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    borderColor: isDarkMode ? '#333333' : '#e5e5e5',
                    color: isDarkMode ? '#ffffff' : '#1a1a1a'
                  }}
                >
                  <option value="">Select violation type</option>
                  {VIOLATION_TYPES.filter(type => type !== 'Other').map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {formData.violationType === 'Other' && (
                  <input
                    type="text"
                    className="w-full mt-3 p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', borderColor: isDarkMode ? '#333333' : '#e5e5e5', color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                    placeholder="Enter other violation type"
                    value={violationTypeOther}
                    onChange={e => setViolationTypeOther(e.target.value)}
                    required
                  />
                )}
          </div>



                {/* Reasons */}
              <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: isDarkMode ? '#cccccc' : '#666666' }}>
                    Reasons
                  </label>
                <select
                  name="reasons"
                  value={formData.reasons}
                  onChange={e => {
                    handleInputChange(e);
                    if (e.target.value !== 'Other') setReasonOther('');
                  }}
                  required
                  className="w-full p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    borderColor: isDarkMode ? '#333333' : '#e5e5e5',
                    color: isDarkMode ? '#ffffff' : '#1a1a1a'
                  }}
                >
                  <option value="">Select reason</option>
                  {REASON_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {formData.reasons === 'Other' && (
                  <input
                    type="text"
                    className="w-full mt-3 p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', borderColor: isDarkMode ? '#333333' : '#e5e5e5', color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                    placeholder="Enter other reason"
                    value={reasonOther}
                    onChange={e => setReasonOther(e.target.value)}
                    required
                  />
                )}
              </div>

                {/* Solutions */}
              <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: isDarkMode ? '#cccccc' : '#666666' }}>
                    Suggested Solutions
                  </label>
                <select
                  name="solutions"
                  value={formData.solutions}
                  onChange={e => {
                    handleInputChange(e);
                    if (e.target.value !== 'Other') setSolutionOther('');
                  }}
                  required
                  className="w-full p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    borderColor: isDarkMode ? '#333333' : '#e5e5e5',
                    color: isDarkMode ? '#ffffff' : '#1a1a1a'
                  }}
                >
                  <option value="">Select solution</option>
                  {SOLUTION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {formData.solutions === 'Other' && (
                  <input
                    type="text"
                    className="w-full mt-3 p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    style={{ backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', borderColor: isDarkMode ? '#333333' : '#e5e5e5', color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                    placeholder="Enter other solution"
                    value={solutionOther}
                    onChange={e => setSolutionOther(e.target.value)}
                    required
                  />
                )}
                </div>
              </form>
              </div>

            {/* Footer (sticky) */}
            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-inherit z-10" style={{ 
              borderColor: isDarkMode ? '#333333' : '#e5e5e5',
              backgroundColor: isDarkMode ? '#0f0f0f' : '#f8f9fa'
            }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedLocation(null);
                    setFormData({
                      violationType: "",
                      reasons: "",
                      solutions: ""
                    });
                  }}
                className="px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: isDarkMode ? '#888888' : '#666666' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleFormSubmit}
                className="px-6 py-2 rounded-lg font-medium transition-all duration-200 text-white"
                style={{ backgroundColor: '#ff4444' }}
                  onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#b71c1c';
                  }}
                  onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ff4444';
                  }}
                >
                Submit Report
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-0 max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" style={{ 
            backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
            boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b" style={{ 
              borderColor: isDarkMode ? '#333333' : '#e5e5e5',
              backgroundColor: isDarkMode ? '#0f0f0f' : '#f8f9fa'
            }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ff4444' }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ffffff">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Settings</h2>
                  <p className="text-sm" style={{ color: isDarkMode ? '#888888' : '#666666' }}>Configure your preferences</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: isDarkMode ? '#888888' : '#666666' }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)] flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Notifications Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.19 4.19A4 4 0 014 6v6a4 4 0 01-4 4h2a2 2 0 002 2h8a2 2 0 002-2h2a4 4 0 004-4V6a4 4 0 00-4-4H8a4 4 0 00-2.81 1.19z" />
                    </svg>
                    Notifications
                  </h3>
                  <div className="space-y-3">
                    {/* Master Notifications Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ 
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`
                    }}>
                      <div className="flex items-center gap-3">
                        <span className="font-medium" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Enable Notifications</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notificationsEnabled}
                          onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    {/* Proximity Alerts (as Alert Distance) */}
                    <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ 
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`
                    }}>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Proximity Alert Distance</span>
                        <span className="text-xs" style={{ color: isDarkMode ? '#cccccc' : '#888888' }}>How close before you get notified</span>
                      </div>
                      <select 
                        value={alertDistance} 
                        onChange={(e) => setAlertDistance(Number(e.target.value))}
                        className="w-36 p-2 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        style={{ 
                          backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                          borderColor: isDarkMode ? '#333333' : '#e5e5e5',
                          color: isDarkMode ? '#ffffff' : '#1a1a1a',
                          opacity: notificationsEnabled ? 1 : 0.5,
                          pointerEvents: notificationsEnabled ? 'auto' : 'none'
                        }}
                        disabled={!notificationsEnabled}
                      >
                        <option value={100}>100 meters</option>
                        <option value={200}>200 meters</option>
                        <option value={500}>500 meters</option>
                        <option value={1000}>1 kilometer</option>
                      </select>
                    </div>
                    {/* Sound Alerts */}
                    <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ 
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`
                    }}>
                      <div className="flex items-center gap-3">
                        <span className="font-medium" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Sound Alerts</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={soundAlerts}
                          onChange={() => setSoundAlerts(!soundAlerts)}
                          disabled={!notificationsEnabled}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" style={{ opacity: notificationsEnabled ? 1 : 0.5 }}></div>
                      </label>
                    </div>
                    {/* Vibration Alerts */}
                    <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ 
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`
                    }}>
                      <div className="flex items-center gap-3">
                        <span className="font-medium" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Vibration Alerts</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={vibrationAlerts}
                          onChange={() => setVibrationAlerts(!vibrationAlerts)}
                          disabled={!notificationsEnabled}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" style={{ opacity: notificationsEnabled ? 1 : 0.5 }}></div>
                      </label>
                    </div>
                </div>
              </div>

              {/* User Settings Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                    User Preferences
                  </h3>
                  <div className="space-y-3">
                  <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#cccccc' : '#666666' }}>Language</label>
                      <select 
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full p-3 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        style={{ 
                          backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                          borderColor: isDarkMode ? '#333333' : '#e5e5e5',
                          color: isDarkMode ? '#ffffff' : '#1a1a1a'
                        }}
                      >
                        <option value="en">English</option>
                        <option value="tl">Tagalog</option>
                        <option value="ceb">Cebuano</option>
                      </select>
              </div>
                    <div className="flex items-center justify-between p-3 rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ 
                      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`
                    }}>
                      <div className="flex items-center gap-3">
                        <span className="font-medium" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Dark Mode</span>
            </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isDarkMode}
                        onChange={() => setIsDarkMode(!isDarkMode)}
                      />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

                {/* Mobile App Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Mobile App
                  </h3>
                  <div className="p-4 rounded-lg border-2 border-dashed transition-all duration-200 hover:border-blue-500 cursor-pointer" style={{ 
                    borderColor: isDarkMode ? '#333333' : '#e5e5e5',
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff'
                  }}>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ff4444' }}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ffffff">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4" />
                          <rect x="6" y="17" width="12" height="4" rx="2" strokeWidth="2" />
                </svg>
              </div>
                      <h4 className="font-semibold mb-1" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Get Mobile App</h4>
                      <p className="text-sm" style={{ color: isDarkMode ? '#888888' : '#666666' }}>Install for better experience</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer (sticky) */}
            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-inherit z-10" style={{ 
              borderColor: isDarkMode ? '#333333' : '#e5e5e5',
              backgroundColor: isDarkMode ? '#0f0f0f' : '#f8f9fa'
            }}>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 rounded-full font-medium flex items-center gap-2 border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-transparent"
                  style={{
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="inline-block">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 rounded-full font-semibold flex items-center gap-2 transition-all duration-200 text-white bg-gradient-to-r from-[#ff4444] to-[#b71c1c] shadow-md hover:from-[#b71c1c] hover:to-[#8b0000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400"
                  style={{
                    border: 'none',
                  }}
                >
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="inline-block">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Settings
                </button>
            </div>
          </div>
        </div>
      )}


      {/* Violation Details Side Panel */}
      {selectedViolation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '400px',
            height: '100%',
            background: isDarkMode ? '#1a1a1a' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#1a1a1a',
            boxShadow: isDarkMode ? '-8px 0 32px rgba(0,0,0,0.4)' : '-8px 0 32px rgba(0,0,0,0.15)',
            zIndex: 100,
            padding: '0',
            overflowY: 'auto',
            borderLeft: '4px solid #ff4444',
            fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(10px)',
            // Responsive styles
            ...(typeof window !== 'undefined' && window.innerWidth <= 640
              ? {
                  left: 0,
                  right: 0,
                  width: '100vw',
                  height: '100vh',
                  borderLeft: 'none',
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  boxShadow: '0 0 0 transparent',
                  zIndex: 9999,
                }
              : {}),
          }}
        >
          {/* Header */}
          <div style={{
            padding: '24px 24px 16px 24px',
            borderBottom: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
            background: isDarkMode ? '#0f0f0f' : '#f8f9fa',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ff4444, #b71c1c)',
                  borderRadius: '12px',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)',
                }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: isDarkMode ? '#ffffff' : '#1a1a1a',
                    margin: 0,
                    letterSpacing: '-0.025em',
                  }}>
                    Violation Details
                  </h2>
                  <p style={{
                    fontSize: '0.875rem',
                    color: isDarkMode ? '#888888' : '#666666',
                    margin: 0,
                    marginTop: '2px',
                  }}>
                    Report Information
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedViolation(null)}
            style={{
                  background: isDarkMode ? '#333333' : '#f1f1f1',
              border: 'none',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
              cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: isDarkMode ? '#888888' : '#666666',
            }}
                onMouseOver={e => {
                  e.currentTarget.style.background = isDarkMode ? '#444444' : '#e5e5e5';
                  e.currentTarget.style.color = '#ff4444';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = isDarkMode ? '#333333' : '#f1f1f1';
                  e.currentTarget.style.color = isDarkMode ? '#888888' : '#666666';
                }}
            aria-label="Close"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
        </div>
            
            {/* Violation Type Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #ff4444, #b71c1c)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(255, 68, 68, 0.3)',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {selectedViolation.type}
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>


            {/* Reasons Section */}
            <div style={{
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
            }}>
              <div style={{
                background: '#ff4444',
                  borderRadius: '6px',
                  width: '24px',
                  height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: isDarkMode ? '#ffffff' : '#1a1a1a',
                  margin: 0,
              }}>
                  Reasons
                </h3>
              </div>
              <p style={{
                fontSize: '0.95rem',
                color: isDarkMode ? '#cccccc' : '#666666',
                margin: 0,
                lineHeight: '1.5',
              }}>
                {selectedViolation.reasons}
              </p>
            </div>

            {/* Solutions Section */}
            <div style={{
              background: isDarkMode ? '#1a1a1a' : '#ffffff',
              border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
              borderRadius: '12px',
              padding: '20px',
              boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}>
                <div style={{
                  background: '#ff4444',
                  borderRadius: '6px',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
            </div>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: isDarkMode ? '#ffffff' : '#1a1a1a',
                  margin: 0,
                }}>
                  Suggested Solutions
                </h3>
            </div>
              <p style={{
                fontSize: '0.95rem',
                color: isDarkMode ? '#cccccc' : '#666666',
                margin: 0,
                lineHeight: '1.5',
              }}>
                {selectedViolation.solutions}
              </p>
            </div>

            {/* Status Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: isDarkMode ? '#1a1a1a' : '#f8f9fa',
                color: '#ff4444',
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '0.75rem',
              fontWeight: 600,
                border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              User Reported
          </div>
        </div>

            {/* Location Section */}
            {selectedViolation.lat && selectedViolation.lng && (
              <div style={{
                background: isDarkMode ? '#1a1a1a' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                  <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    background: '#ff4444',
                    borderRadius: '6px',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
          </div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: isDarkMode ? '#ffffff' : '#1a1a1a',
                    margin: 0,
                  }}>
                    Location
                  </h3>
          </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#cccccc' : '#666666',
                  marginBottom: '8px',
                }}>
                  <span style={{ fontWeight: 600, color: '#ff4444' }}>Coordinates:</span>
                  <span style={{ marginLeft: '8px' }}>
                    {selectedViolation.lat.toFixed(6)}, {selectedViolation.lng.toFixed(6)}
                  </span>
        </div>
                {selectedAddress && (
                  <div style={{
                    fontSize: '0.875rem',
                    color: isDarkMode ? '#cccccc' : '#666666',
                    wordBreak: 'break-word',
                  }}>
                    <span style={{ fontWeight: 600, color: '#ff4444' }}>Address:</span>
                    <span style={{ marginLeft: '8px' }}>{selectedAddress}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <button
                onClick={handleAddAnotherViolation}
                style={{
                  background: 'linear-gradient(135deg, #ff4444, #b71c1c)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 68, 68, 0.4)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.3)';
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                I also have this violation
              </button>
              <button
                onClick={handleAddDifferentViolation}
                style={{
                  background: 'transparent',
                  border: `2px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
                  borderRadius: '12px',
                  color: isDarkMode ? '#ffffff' : '#1a1a1a',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = isDarkMode ? '#333333' : '#f8f9fa';
                  e.currentTarget.style.borderColor = '#ff4444';
                  e.currentTarget.style.color = '#ff4444';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
                  e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#1a1a1a';
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                I have another violation here
              </button>
            </div>

            {/* Reports List Section */}
            {(() => {
              const reports = violationReports.filter(r =>
                r.lat === selectedViolation.lat && r.lng === selectedViolation.lng
              );
              if (reports.length > 0) {
                return (
                  <div style={{
                    background: isDarkMode ? '#1a1a1a' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}>
                      <div style={{
                        background: '#ff4444',
                        borderRadius: '6px',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                      <h3 style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: isDarkMode ? '#ffffff' : '#1a1a1a',
                        margin: 0,
                      }}>
                        Reports for this location ({reports.length})
                      </h3>
                    </div>
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      paddingRight: '8px',
                    }}>
                      {reports.map((r, i) => (
                        <div key={r.timestamp + '-' + i} style={{
                          background: isDarkMode ? '#0f0f0f' : '#f8f9fa',
                          border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
                          borderRadius: '8px',
                          padding: '16px',
                          marginBottom: '12px',
                          fontSize: '0.875rem',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                        }}>
                            <div style={{
                              background: '#ff4444',
                              borderRadius: '4px',
                              width: '16px',
                              height: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span style={{
                              fontWeight: 600,
                              color: '#ff4444',
                              fontSize: '0.8rem',
                            }}>
                              {r.type}
                            </span>
                          </div>

                          <div style={{
                            color: isDarkMode ? '#cccccc' : '#666666',
                            marginBottom: '8px',
                            lineHeight: '1.4',
                          }}>
                            <strong style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Reasons:</strong> {r.reasons}
                          </div>
                          <div style={{
                            color: isDarkMode ? '#cccccc' : '#666666',
                            lineHeight: '1.4',
                          }}>
                            <strong style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>Solutions:</strong> {r.solutions}
                          </div>
                        </div>
                      ))}
                    </div>
    </div>
  );
}
              return null;
            })()}
          </div>
            {/* Violation Statistics Graph */}
          {(() => {
            const reports = violationReports.filter(r =>
              r.lat === selectedViolation.lat && r.lng === selectedViolation.lng
            );
            const typeCounts: Record<string, number> = {};
            reports.forEach(r => {
              typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
            });
            const maxCount = Math.max(1, ...Object.values(typeCounts));
            return (
              <div style={{
                  background: isDarkMode ? '#1a1a1a' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}>
                    <div style={{
                      background: '#ff4444',
                      borderRadius: '6px',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: isDarkMode ? '#ffffff' : '#1a1a1a',
                      margin: 0,
                    }}>
                      Violation Statistics
                    </h3>
                </div>
                {Object.keys(typeCounts).length === 0 ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px 20px',
                      color: isDarkMode ? '#888888' : '#999999',
                      fontSize: '0.9rem',
                      fontStyle: 'italic',
                    }}>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ marginRight: '8px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      No reports yet for this location
                    </div>
                  ) : (
                        <div style={{
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '16px',
                      padding: '8px 0',
                    }}>
                      {Object.entries(typeCounts).map(([type, count], index) => (
                        <div key={type} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <span style={{
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              color: isDarkMode ? '#ffffff' : '#1a1a1a',
                              flex: 1,
                            }}>
                              {type}
                            </span>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#ff4444',
                              minWidth: '20px',
                              textAlign: 'right',
                            }}>
                              {count}
                            </span>
                          </div>
                          <div style={{
                            position: 'relative',
                            height: '24px',
                            background: isDarkMode ? '#333333' : '#e5e5e5',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                          }}>
                            <div style={{
                              height: '100%',
                              background: `linear-gradient(135deg, #ff4444, #b71c1c)`,
                              borderRadius: '12px',
                              width: `${Math.max(4, (count / maxCount) * 100)}%`,
                              transition: 'width 0.8s ease-out',
                              boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)',
                              position: 'relative',
                            }}>
                              {/* Bar shine effect */}
                              <div style={{
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                right: '0',
                                height: '50%',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                                borderRadius: '12px 12px 0 0',
                              }} />
                            </div>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
      {/* Graph Card Side Panel */}
      {showGraph && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '370px',
            height: '100%',
            background: isDarkMode ? '#18181b' : '#fff',
            color: isDarkMode ? '#f4f4f5' : '#232323',
            boxShadow: '-4px 0 32px rgba(60,60,60,0.18)',
            zIndex: 100,
            padding: '0',
            overflowY: 'auto',
            borderLeft: '3px solid #ff4444',
            fontFamily: "'Roboto', 'Arial', sans-serif",
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            // Responsive styles
            ...(typeof window !== 'undefined' && window.innerWidth <= 640
              ? {
                  left: 0,
                  right: 0,
                  width: '100vw',
                  height: '100vh',
                  borderLeft: 'none',
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  boxShadow: '0 0 0 transparent',
                  zIndex: 9999,
                }
              : {}),
          }}
        >
          <button
            onClick={() => setShowGraph(false)}
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 28,
              color: '#ff4444',
              cursor: 'pointer',
              transition: 'color 0.2s',
              zIndex: 2,
            }}
            onMouseOver={e => (e.currentTarget.style.color = '#b71c1c')}
            onMouseOut={e => (e.currentTarget.style.color = '#ff4444')}
            aria-label="Close"
          >×</button>
          <div style={{
            padding: '38px 32px 24px 32px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}>
              <div style={{
                background: '#ff4444',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff">
                  <rect x="3" y="12" width="4" height="8" rx="1" strokeWidth="2" />
                  <rect x="9" y="8" width="4" height="12" rx="1" strokeWidth="2" />
                  <rect x="15" y="4" width="4" height="16" rx="1" strokeWidth="2" />
                </svg>
              </div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#ff4444',
                letterSpacing: '0.5px',
              }}>
                Graph Overview
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: isDarkMode ? '1.5px solid #232326' : '1.5px solid #ffeaea', margin: '0 -32px' }} />
            {/* Comprehensive Violation Statistics */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              marginTop: 18,
            }}>
              {/* Summary Card */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '8px',
              }}>
                <div style={{
                  background: isDarkMode ? '#232326' : '#f8f9fa',
                  border: `1px solid ${isDarkMode ? '#333' : '#e9ecef'}`,
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  minWidth: '160px',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: '#ff4444',
                    marginBottom: '6px',
                  }}>
                    {violationReports.length}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: isDarkMode ? '#888' : '#666',
                    fontWeight: 500,
                  }}>
                    Total Reports
                  </div>
                </div>
              </div>

              {/* Violations by Type Chart */}
              <div style={{
                background: isDarkMode ? '#232326' : '#f8f9fa',
                border: `1px solid ${isDarkMode ? '#333' : '#e9ecef'}`,
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    background: '#ff4444',
                    borderRadius: '6px',
                    width: '20px',
                    height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
            </div>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: isDarkMode ? '#ffffff' : '#1a1a1a',
                    margin: 0,
                  }}>
                    Violations by Type
                  </h4>
                </div>

                {(() => {
                  const typeCounts: Record<string, number> = {};
                  violationReports.forEach(r => {
                    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
                  });
                  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
                  const maxCount = Math.max(1, ...Object.values(typeCounts));

                  return (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      {sortedTypes.map(([type, count], index) => (
                        <div key={type} style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              color: isDarkMode ? '#ffffff' : '#1a1a1a',
                              flex: 1,
                            }}>
                              {type}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#ff4444',
                              minWidth: '16px',
                              textAlign: 'right',
                            }}>
                              {count}
                            </span>
                          </div>
                          <div style={{
                            position: 'relative',
                            height: '20px',
                            background: isDarkMode ? '#333333' : '#e5e5e5',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                          }}>
                            <div style={{
                              height: '100%',
                              background: `linear-gradient(135deg, #ff4444, #b71c1c)`,
                              borderRadius: '10px',
                              width: `${Math.max(3, (count / maxCount) * 100)}%`,
                              transition: 'width 0.8s ease-out',
                              boxShadow: '0 2px 6px rgba(255, 68, 68, 0.4)',
                              position: 'relative',
                            }}>
                              <div style={{
                                position: 'absolute',
                                top: '0',
                                left: '0',
                                right: '0',
                                height: '50%',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
                                borderRadius: '10px 10px 0 0',
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Recent Activity */}
              <div style={{
                background: isDarkMode ? '#232326' : '#f8f9fa',
                border: `1px solid ${isDarkMode ? '#333' : '#e9ecef'}`,
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    background: '#00aa00',
                    borderRadius: '6px',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: isDarkMode ? '#ffffff' : '#1a1a1a',
                    margin: 0,
                  }}>
                    Recent Activity
                  </h4>
                </div>

                <div style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}>
                  {violationReports.slice(0, 5).map((report, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 0',
                      borderBottom: index < 4 ? `1px solid ${isDarkMode ? '#333' : '#e9ecef'}` : 'none',
                    }}>
                      <div style={{
                        background: '#ff4444',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div style={{
                        flex: 1,
                        minWidth: 0,
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: isDarkMode ? '#ffffff' : '#1a1a1a',
                          marginBottom: '2px',
                        }}>
                          {report.type}
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: isDarkMode ? '#888' : '#666',
                        }}>
                          {new Date(report.timestamp).toLocaleDateString()} • {new Date(report.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Heatmap Summary */}
              <div style={{
                background: isDarkMode ? '#232326' : '#f8f9fa',
                border: `1px solid ${isDarkMode ? '#333' : '#e9ecef'}`,
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    background: '#ff8800',
                    borderRadius: '6px',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: isDarkMode ? '#ffffff' : '#1a1a1a',
                    margin: 0,
                  }}>
                    Hotspots
                  </h4>
                </div>

                {(() => {
                  const locationCounts: Record<string, number> = {};
                  violationReports.forEach(r => {
                    const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
                    locationCounts[key] = (locationCounts[key] || 0) + 1;
                  });
                  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

                  return (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      {sortedLocations.map(([location, count], index) => (
                        <div key={location} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          background: isDarkMode ? '#1a1a1a' : '#ffffff',
                          border: `1px solid ${isDarkMode ? '#333' : '#e9ecef'}`,
                          borderRadius: '8px',
                        }}>
                          <div style={{
                            background: index === 0 ? '#ff4444' : index === 1 ? '#ff8800' : '#ffaa00',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#fff',
                          }}>
                            {index + 1}
                          </div>
                          <div style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            color: isDarkMode ? '#cccccc' : '#666666',
                          }}>
                            {location}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#ff4444',
                          }}>
                            {count} reports
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mobile App Side Panel */}
      {showMobileAppPanel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '370px',
            height: '100%',
            background: isDarkMode ? '#18181b' : '#fff',
            color: isDarkMode ? '#f4f4f5' : '#232323',
            boxShadow: '-4px 0 32px rgba(60,60,60,0.18)',
            zIndex: 100,
            padding: '0',
            overflowY: 'auto',
            borderLeft: '3px solid #ff4444',
            fontFamily: "'Roboto', 'Arial', sans-serif",
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            ...(typeof window !== 'undefined' && window.innerWidth <= 640
              ? {
                  left: 0,
                  right: 0,
                  width: '100vw',
                  height: '100vh',
                  borderLeft: 'none',
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  boxShadow: '0 0 0 transparent',
                  zIndex: 9999,
                }
              : {}),
          }}
        >
          <button
            onClick={() => setShowMobileAppPanel(false)}
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 28,
              color: '#ff4444',
              cursor: 'pointer',
              transition: 'color 0.2s',
              zIndex: 2,
            }}
            onMouseOver={e => (e.currentTarget.style.color = '#b71c1c')}
            onMouseOut={e => (e.currentTarget.style.color = '#ff4444')}
            aria-label="Close"
          >×</button>
          <div style={{
            padding: '38px 32px 24px 32px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}>
              <div style={{
                background: '#ff4444',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#fff">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4" />
                  <rect x="6" y="17" width="12" height="4" rx="2" strokeWidth="2" />
                </svg>
              </div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#ff4444',
                letterSpacing: '0.5px',
              }}>
                Get the Mobile App
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: isDarkMode ? '1.5px solid #232326' : '1.5px solid #ffeaea', margin: '0 -32px' }} />
            {/* Placeholder for mobile app info */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDarkMode ? '#888' : '#bbb',
              fontSize: '1.1rem',
              fontStyle: 'italic',
              border: isDarkMode ? '1.5px dashed #444' : '1.5px dashed #eee',
              borderRadius: 12,
              background: isDarkMode ? '#232326' : '#f3f3f3',
              marginTop: 18,
              minHeight: 220,
            }}>
              [Mobile app install instructions or info will appear here]
            </div>
          </div>
        </div>
      )}
      {/* Responsive mobile style: adjust padding/font size for mobile */}
      <style>{`
        @media (max-width: 640px) {
          .violation-panel-content { padding: 24px 10px 16px 10px !important; font-size: 1rem !important; }
          .violation-panel-content h2 { font-size: 1.1rem !important; }
        }
      `}</style>
    </div>
  );
} 