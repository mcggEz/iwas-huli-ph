/// <reference types="google.maps" />
'use client';

/**
 * @typedef {import('google.maps')} google
 */

import { useEffect, useRef, useState } from "react";
import { violationsApi, statsApi } from "../lib/api";
import { Location } from "../lib/supabase";


// Global variable to track if script is already loading
let googleMapsScriptLoading = false;
let googleMapsScriptLoaded = false;

function loadGoogleMapsScript(apiKey: string): Promise<void> | undefined {
  if (typeof window === "undefined") return;
  
  // Check if already loaded
  if (googleMapsScriptLoaded || ((window as any).google && (window as any).google.maps)) {
    googleMapsScriptLoaded = true;
    return Promise.resolve();
  }
  
  // Check if already loading
  if (googleMapsScriptLoading) {
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (googleMapsScriptLoaded || ((window as any).google && (window as any).google.maps)) {
          googleMapsScriptLoaded = true;
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
  }
  
  // Check if script tag already exists
  const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existingScript) {
    googleMapsScriptLoading = false;
    googleMapsScriptLoaded = true;
    return Promise.resolve();
  }
  
  googleMapsScriptLoading = true;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      googleMapsScriptLoading = false;
      googleMapsScriptLoaded = true;
      resolve();
    };
    script.onerror = (error) => {
      googleMapsScriptLoading = false;
      reject(error);
    };
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null);
  const notifiedZonesRef = useRef<{ [key: string]: number }>({});

  // State for selected location (for side panel)
  const [selectedLocationForSidebar, setSelectedLocationForSidebar] = useState<any>(null);
  // State for selected address
  const [selectedAddress, setSelectedAddress] = useState('');
  // Store all locations from database
  const [locations, setLocations] = useState<Location[]>([]);
  // State for showing the graph
  const [showGraph, setShowGraph] = useState(false);
  // State for showing the mobile app panel
  const [showMobileAppPanel, setShowMobileAppPanel] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsData, setDirectionsData] = useState<any>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeViolationZones, setRouteViolationZones] = useState<any[]>([]);
  const [selectedViolationMarker, setSelectedViolationMarker] = useState<google.maps.Marker | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<any>(null);

  // Settings state
  const [proximityAlerts, setProximityAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [vibrationAlerts, setVibrationAlerts] = useState(false);
  const [alertDistance, setAlertDistance] = useState(200);
  const [language, setLanguage] = useState('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Permission states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [vibrationSupported, setVibrationSupported] = useState(false);

  const [formData, setFormData] = useState({
    violationType: "",
    reasons: "",
    solutions: ""
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({
    violationType: "",
    reasons: "",
    solutions: "",
    rateLimit: ""
  });

  const [showLandmarks, setShowLandmarks] = useState(true);
  const [reasonOther, setReasonOther] = useState('');
  const [solutionOther, setSolutionOther] = useState('');
  // In Dashboard component state:
  const [violationTypeOther, setViolationTypeOther] = useState('');

  // Rate limiting and spam protection
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownEndTime, setCooldownEndTime] = useState(0);
  
  // UI notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'error' | 'warning' | 'success';
    visible: boolean;
  }>({
    message: '',
    type: 'error',
    visible: false
  });

  // Rate limiting constants
  const RATE_LIMIT = {
    MAX_SUBMISSIONS_PER_HOUR: 5,
    MIN_INTERVAL_BETWEEN_SUBMISSIONS: 30000, // 30 seconds
    COOLDOWN_DURATION: 3600000, // 1 hour in milliseconds
  };

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

  // Check permissions and capabilities on mount
  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    
    // Check vibration support
    if ('vibrate' in navigator) {
      setVibrationSupported(true);
    }
  }, []);

  // Load violation zones from database
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('📖 Loading violation zones from database...');
        const response = await violationsApi.getAll();
        console.log(`✅ Loaded ${response.data.length} violation zones`);
        setLocations(response.data);
      } catch (error) {
        console.error('❌ Error loading violation zones:', error);
      }
    };

    loadData();
  }, []);

  // Note: Real-time subscriptions removed - using API routes instead

  // Load Google Maps script (only once)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return; // Don't load if not set
    
    loadGoogleMapsScript(apiKey)?.then(() => {
      console.log('✅ Google Maps script loaded successfully');
    }).catch((error) => {
      console.error('❌ Failed to load Google Maps script:', error);
    });
  }, []); // Empty dependency array - only run once

  // Initialize map after script is loaded
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).google || !mapRef.current) return;
    
    console.log('🗺️ Initializing map...');
    
        // @ts-ignore
    const mapInstance = new (window as any).google.maps.Map(mapRef.current, {
          center: { lat: 14.5995, lng: 120.9842 },
          zoom: 12,
          disableDefaultUI: true,
          styles: generateMapStyles()
        });
    
        setMap(mapInstance);
    console.log('✅ Map initialized successfully');

        // Add violation zone markers
    const infoWindow = new (window as any).google.maps.InfoWindow();
    
  }, [googleMapsScriptLoaded]); // Use the global tracking variable instead

  // Render locations on map when data changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!map) return;
    
    // Remove all existing markers and polygons
    if ((window as any).violationZoneMarkers) {
      (window as any).violationZoneMarkers.forEach((m: any) => m.setMap(null));
    }
    if ((window as any).violationZonePolygons) {
      (window as any).violationZonePolygons.forEach((p: any) => p.setMap(null));
    }
    (window as any).violationZoneMarkers = [];
    (window as any).violationZonePolygons = [];

    if (!highlightRoads) return;

    // Add location markers and polygons
    locations.forEach((location: Location) => {
      // Create marker for each location
      const marker = new (window as any).google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map,
        title: location.address,
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
      marker.setMap(map);
      (window as any).violationZoneMarkers.push(marker);

      // Add click listener to show location details
      marker.addListener("click", () => {
        // Show the first violation from this location
        if (location.violations.length > 0) {
          const firstViolation = location.violations[0];
          const firstReport = firstViolation.reports[0];
                  setSelectedLocationForSidebar(location);
        }
      });

      // Create location polygon (red circle)
      const polygon = new (window as any).google.maps.Polygon({
        paths: generateCirclePath(location.lat, location.lng, 50), // 50 meter radius
        strokeColor: '#ff4444',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#ff4444',
        fillOpacity: 0.2,
        map: map
      });
      polygon.setMap(map);
      (window as any).violationZonePolygons.push(polygon);
    });

    // Cleanup function
    return () => {
      if ((window as any).violationZoneMarkers) {
        (window as any).violationZoneMarkers.forEach((m: any) => m.setMap(null));
      }
      if ((window as any).violationZonePolygons) {
        (window as any).violationZonePolygons.forEach((p: any) => p.setMap(null));
      }
    };
  }, [map, locations, highlightRoads]);

  // Add Places Autocomplete to search input
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!map || !(window as any).google) {
      console.log('❌ Cannot setup search autocomplete:', { hasMap: !!map, hasGoogle: !!(window as any).google });
      return;
    }
    
    const input = document.querySelector('input[placeholder="Search location..."]') as HTMLInputElement;
    if (!input) {
      console.log('❌ Search input not found');
      return;
    }

    console.log('🔍 Setting up search autocomplete for:', input.placeholder);
    
    const autocomplete = new (window as any).google.maps.places.Autocomplete(input, {
      types: ['geocode'],
      componentRestrictions: { country: 'ph' }, // restrict to Philippines
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      console.log('📍 Place selected:', place);
      if (place.geometry && place.geometry.location) {
        map.setCenter(place.geometry.location);
        map.setZoom(15);
        console.log('✅ Map centered on:', place.formatted_address);
        
        // Also set this as the origin for directions
        if (place.formatted_address) {
          setOrigin(place.formatted_address);
          console.log('✅ Origin set to:', place.formatted_address);
        }
      } else {
        console.log('❌ No geometry found for place:', place);
      }
    });

    return () => {
      // Cleanup not needed for autocomplete
    };
  }, [map]);

  // Add Places Autocomplete to destination input
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!map || !(window as any).google || !showDirections) return;
    
    console.log('🔧 Setting up destination autocomplete...');
    
    // Wait a bit for the DOM to be ready
    setTimeout(() => {
      console.log('🔍 Looking for destination input...');
      const destinationInput = document.querySelector('input[placeholder="To: Enter destination..."]') as HTMLInputElement;
      
      console.log('📍 Found destination input:', !!destinationInput);
      
      if (destinationInput) {
        console.log('🔍 Setting up destination autocomplete for:', destinationInput.placeholder);
        const destinationAutocomplete = new (window as any).google.maps.places.Autocomplete(destinationInput, {
          types: ['geocode'],
          componentRestrictions: { country: 'ph' },
        });

        destinationAutocomplete.addListener('place_changed', () => {
          const place = destinationAutocomplete.getPlace();
          console.log('📍 Destination place selected:', place);
          if (place.formatted_address) {
            setDestination(place.formatted_address);
            console.log('✅ Destination set to:', place.formatted_address);
          } else {
            console.log('❌ No formatted address for destination place');
          }
        });
      } else {
        console.log('❌ Destination input not found');
      }
    }, 200); // Increased delay to ensure DOM is ready

    return () => {
      // Cleanup not needed for autocomplete
    };
  }, [map, showDirections]);

  // Update map styles when theme changes
  useEffect(() => {
    if (map) {
      map.setOptions({ styles: generateMapStyles() });
    }
  }, [isDarkMode, showLandmarks]);

  // Initialize Directions Renderer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!map || !(window as any).google) {
      console.log('❌ Cannot initialize directions renderer:', { hasMap: !!map, hasGoogle: !!(window as any).google });
      return;
    }
    
    console.log('🔧 Initializing directions renderer...');
    
    const renderer = new (window as any).google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#3B82F6',
        strokeWeight: 8,
        strokeOpacity: 1,
        icons: [{
          icon: {
            path: (window as any).google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
            strokeColor: '#ffffff',
            fillColor: '#3B82F6',
            fillOpacity: 1
          },
          offset: '50%',
          repeat: '80px'
        }]
      }
    });
    
    console.log('✅ Directions renderer created:', renderer);
    setDirectionsRenderer(renderer);
    
    return () => {
      if (renderer) {
        console.log('🧹 Cleaning up directions renderer');
        renderer.setMap(null);
      }
    };
  }, [map]);

  // Only clear directions when component unmounts or map changes
  useEffect(() => {
    return () => {
      if (directionsRenderer) {
        directionsRenderer.setDirections({ routes: [] });
        setDirectionsData(null);
        
        // Clear direction markers
        if ((window as any).directionMarkers) {
          (window as any).directionMarkers.forEach((marker: any) => marker.setMap(null));
          (window as any).directionMarkers = [];
        }
        
        // Clear route violation markers and polygons
        if ((window as any).routeViolationMarkers) {
          (window as any).routeViolationMarkers.forEach((marker: any) => marker.setMap(null));
          (window as any).routeViolationMarkers = [];
        }
        if ((window as any).routeViolationPolygons) {
          (window as any).routeViolationPolygons.forEach((polygon: any) => polygon.setMap(null));
          (window as any).routeViolationPolygons = [];
        }
      }
    };
  }, [directionsRenderer]);

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
  }, [isDrivingMode, map, proximityAlerts, alertDistance, locations]);

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

  // Permission request handlers
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Notifications are not supported in this browser.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else if (permission === 'denied') {
        alert('Notification permission denied. Please enable notifications in your browser settings to receive alerts.');
        return false;
      } else {
        console.log('Notification permission request dismissed');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      alert('Failed to request notification permission.');
      return false;
    }
  };

  // Enhanced toggle handlers with permission requests
  const handleNotificationsToggle = async () => {
    if (!notificationsEnabled) {
      // Turning ON notifications - request permission
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        setNotificationsEnabled(true);
      }
    } else {
      // Turning OFF notifications
      setNotificationsEnabled(false);
    }
  };

  const handleSoundAlertsToggle = async () => {
    if (!soundAlerts) {
      // Turning ON sound alerts - test if audio works
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.1;
        await audio.play();
        setSoundAlerts(true);
        console.log('✅ Sound alerts enabled');
      } catch (error) {
        console.error('❌ Sound test failed:', error);
        alert('Sound alerts are not supported or blocked in this browser.');
      }
    } else {
      // Turning OFF sound alerts
      setSoundAlerts(false);
    }
  };

  const handleVibrationAlertsToggle = async () => {
    if (!vibrationAlerts) {
      // Turning ON vibration alerts - test if vibration works
      if (vibrationSupported) {
        try {
          navigator.vibrate([100]);
          setVibrationAlerts(true);
          console.log('✅ Vibration alerts enabled');
        } catch (error) {
          console.error('❌ Vibration test failed:', error);
          alert('Vibration is not supported on this device.');
        }
      } else {
        alert('Vibration is not supported on this device.');
      }
    } else {
      // Turning OFF vibration alerts
      setVibrationAlerts(false);
    }
  };

  // Function to check proximity to violation locations
  const checkProximityToViolations = (userLat: number, userLng: number) => {
    if (!proximityAlerts || !isDrivingMode) return;

    // Check locations
    locations.forEach((location: Location) => {
      const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
      
      if (distance <= alertDistance && location.violations.length > 0) {
        const violationTypes = location.violations.map(v => v.violation_type).join(', ');
        const title = 'Violation Location Ahead!';
        const body = `${violationTypes} violations detected within ${Math.round(distance)}m`;
        triggerAlerts(title, body);
      }
    });
  };

  const handleSearch = () => {
    if (typeof window === 'undefined') return;
    
    console.log('🔍 Search triggered:', searchQuery);
    
    if (!searchQuery.trim()) {
      console.log('❌ Empty search query');
      return;
    }
    
    if (!map) {
      console.log('❌ Map not available');
      return;
    }
    
    if (!(window as any).google) {
      console.log('❌ Google Maps API not available');
      return;
    }
    
    console.log('🗺️ Using geocoder for search...');
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery + ", Manila, Philippines" }, (results: any, status: any) => {
      console.log('📡 Geocoder response:', { status, resultsCount: results?.length });
      if (status === 'OK' && results && results.length > 0) {
          map.setCenter(results[0].geometry.location);
          map.setZoom(15);
        console.log('✅ Map centered on search result:', results[0].formatted_address);
      } else {
        console.log('❌ Geocoder failed:', status);
        alert('Location not found. Please try a different search term.');
        }
      });
  };

  // Rate limiting function
  const checkRateLimit = () => {
    const now = Date.now();
    
    // Check if user is in cooldown period
    if (cooldownEndTime > now) {
      return {
        allowed: false,
        message: `Rate limit exceeded. Please wait before submitting again.`
      };
    }
    
    // Check minimum interval between submissions
    if (lastSubmissionTime > 0 && (now - lastSubmissionTime) < RATE_LIMIT.MIN_INTERVAL_BETWEEN_SUBMISSIONS) {
      return {
        allowed: false,
        message: `Please wait for couple of min before submitting another report.`
      };
    }
    
    // Check hourly submission limit
    if (submissionCount >= RATE_LIMIT.MAX_SUBMISSIONS_PER_HOUR) {
      setCooldownEndTime(now + RATE_LIMIT.COOLDOWN_DURATION);
      return {
        allowed: false,
        message: `Hourly limit reached. Please wait for couple of min before submitting again.`
      };
    }
    
    return { allowed: true, message: '' };
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    // Check rate limiting
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      setValidationErrors({
        violationType: "",
        reasons: "",
        solutions: "",
        rateLimit: rateLimitCheck.message || 'Rate limit exceeded'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Clear previous validation errors
    setValidationErrors({
      violationType: "",
      reasons: "",
      solutions: "",
      rateLimit: ""
    });
    
    // Validate required fields
    let hasErrors = false;
    const errors = {
      violationType: "",
      reasons: "",
      solutions: ""
    };
    
    if (!formData.violationType || !formData.violationType.trim()) {
      errors.violationType = "Please select a violation type";
      hasErrors = true;
    }
    
    if (!formData.reasons || !formData.reasons.trim()) {
      errors.reasons = "Please provide a reason for the violation";
      hasErrors = true;
    }
    
    if (!formData.solutions || !formData.solutions.trim()) {
      errors.solutions = "Please provide a suggested solution";
      hasErrors = true;
    }
    
    if (hasErrors) {
      setValidationErrors({
        ...errors,
        rateLimit: ""
      });
      setIsSubmitting(false);
      return;
    }
    
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
              // Find the location that matches these coordinates
      const matchingLocation = locations.find(loc => 
        Math.abs(loc.lat - pos.lat()) < 0.001 && Math.abs(loc.lng - pos.lng()) < 0.001
      );
      if (matchingLocation) {
        setSelectedLocationForSidebar(matchingLocation);
      }
      });

     // Get address for the location
     let address = 'Unknown Address';
     try {
       if (typeof window !== 'undefined' && (window as any).google) {
         const geocoder = new (window as any).google.maps.Geocoder();
         const result = await geocoder.geocode({ 
           location: { lat: selectedLocation.lat, lng: selectedLocation.lng } 
         });
         if (result.results && result.results[0]) {
           address = result.results[0].formatted_address;
         }
       }
     } catch (error) {
       console.log('Could not get address, using coordinates');
       address = `Near ${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`;
     }

     // Save violation zone to database using API
     const response = await violationsApi.create({
       lat: selectedLocation.lat,
       lng: selectedLocation.lng,
       address,
       violationType: formData.violationType,
       reasons: formData.reasons,
       solutions: formData.solutions
     });
     
     const newLocation = response.data;

     if (newLocation) {
       console.log('✅ Violation report saved to database');
       
       // Add the new location to the local state so it appears in the sidebar
       setLocations(prevLocations => [...prevLocations, newLocation]);
       
       // Update rate limiting counters
       const now = Date.now();
       setLastSubmissionTime(now);
       setSubmissionCount(prev => prev + 1);
       
       // Reset hourly counter after 1 hour
       setTimeout(() => {
         setSubmissionCount(0);
       }, RATE_LIMIT.COOLDOWN_DURATION);
       
     } else {
       console.error('❌ Failed to save violation report to database');
     }

    }

    // Reset form and close modal
    setFormData({
      violationType: "",
      reasons: "",
      solutions: ""
    });
    setValidationErrors({
      violationType: "",
      reasons: "",
      solutions: "",
      rateLimit: ""
    });
    setShowForm(false);
    setSelectedLocation(null);
    setIsSubmitting(false);
  };

  // Input sanitization function
  const sanitizeInput = (input: string): string => {
    // Remove potentially dangerous characters and limit length
    return input
      .replace(/[<>]/g, '') // Remove < and > to prevent XSS
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 500); // Limit to 500 characters
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const sanitizedValue = sanitizeInput(e.target.value);
    
    setFormData({
      ...formData,
      [e.target.name]: sanitizedValue
    });
  };



  // Fetch address when a location is selected
  useEffect(() => {
    if (selectedLocationForSidebar && selectedLocationForSidebar.lat && selectedLocationForSidebar.lng) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setSelectedAddress('API key not set');
        return;
      }
      fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${selectedLocationForSidebar.lat},${selectedLocationForSidebar.lng}&key=${apiKey}`)
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
  }, [selectedLocationForSidebar]);

  // Handler for '+ I also have this violation' button
  const handleAddAnotherViolation = () => {
    if (selectedLocationForSidebar && selectedLocationForSidebar.lat && selectedLocationForSidebar.lng) {
      setSelectedLocation({ lat: selectedLocationForSidebar.lat, lng: selectedLocationForSidebar.lng });
      setShowForm(true);
    }
  };

 

  // Calculate directions
  const calculateDirections = async () => {
    if (typeof window === 'undefined') return;
    
    // Use search query as origin if no origin is set
    const effectiveOrigin = origin || searchQuery;
    
    if (!effectiveOrigin || !destination || !directionsRenderer || !(window as any).google) {
      console.log('❌ Missing required data:', { effectiveOrigin, destination, hasRenderer: !!directionsRenderer, hasGoogle: !!(window as any).google });
      return;
    }

    console.log('🚀 Starting directions calculation...');
    setIsCalculatingRoute(true);

    try {
      const directionsService = new (window as any).google.maps.DirectionsService();
      
      const request = {
        origin: effectiveOrigin,
        destination: destination,
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
        unitSystem: (window as any).google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      };

      console.log('📋 Directions request:', request);

      const result = await new Promise((resolve, reject) => {
        directionsService.route(request, (result: any, status: any) => {
          console.log('📡 Directions API response:', { status, hasResult: !!result });
          if (status === 'OK') {
            resolve(result);
          } else {
            reject(new Error(`Directions request failed due to ${status}`));
          }
        });
      });

      console.log('✅ Directions result received:', result);
      
      // Set the directions on the renderer
      directionsRenderer.setDirections(result);
      console.log('🎯 Directions set on renderer');
      
      setDirectionsData(result);
      
      // Add additional direction indicators
      if ((result as any).routes && (result as any).routes.length > 0) {
        const route = (result as any).routes[0];
        const path = route.overview_path;
        
        console.log('🛣️ Route path points:', path.length);
        
        // Detect violation zones along the route
        detectRouteViolationZones(path).catch(error => {
          console.error('Error detecting route violation zones:', error);
        });
        
        // Clear previous direction markers
        if ((window as any).directionMarkers) {
          (window as any).directionMarkers.forEach((marker: any) => marker.setMap(null));
        }
        (window as any).directionMarkers = [];
        
        // Add simple arrow markers along the route
        for (let i = 0; i < path.length; i += Math.max(1, Math.floor(path.length / 8))) {
          const point = path[i];
          
          const directionMarker = new (window as any).google.maps.Marker({
            position: point,
            map: map,
            icon: {
              path: (window as any).google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 2,
              strokeColor: '#ffffff',
              fillColor: '#3B82F6',
              fillOpacity: 0.8
            },
            zIndex: 1000
          });
          
          (window as any).directionMarkers.push(directionMarker);
        }
        
        console.log('📍 Added direction markers:', (window as any).directionMarkers.length);
      }
      
      console.log('✅ Directions calculated successfully');
    } catch (error) {
      console.error('❌ Error calculating directions:', error);
      alert('Failed to calculate directions. Please check your input and try again.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };



  // Use current location as origin
  const useCurrentLocation = async () => {
    if (typeof window === 'undefined') return;
    
    if (!userLocation) {
      alert('Please enable location access first');
      return;
    }

    if (!(window as any).google) {
      console.log('❌ Google Maps API not available for geocoding');
      // Fallback to coordinates if Google API is not available
      setOrigin(`${userLocation.lat}, ${userLocation.lng}`);
      return;
    }

    try {
      console.log('🗺️ Converting coordinates to address...');
      const geocoder = new (window as any).google.maps.Geocoder();
      
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { location: { lat: userLocation.lat, lng: userLocation.lng } },
          (results: any, status: any) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results[0].formatted_address);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          }
        );
      });

      console.log('✅ Address found:', result);
      setOrigin(result as string);
      
      // Also set the search query if in directions mode
      if (showDirections) {
        setSearchQuery(result as string);
        console.log('✅ Search query updated with current location');
      }
    } catch (error) {
      console.error('❌ Error getting address:', error);
      // Fallback to coordinates if geocoding fails
      const fallbackAddress = `${userLocation.lat}, ${userLocation.lng}`;
      setOrigin(fallbackAddress);
      
      // Also set the search query if in directions mode
      if (showDirections) {
        setSearchQuery(fallbackAddress);
        console.log('✅ Search query updated with coordinates');
      }
    }
  };

  // Check if a line segment intersects with a circle
  const lineIntersectsCircle = (
    x1: number, y1: number, // Start point
    x2: number, y2: number, // End point
    cx: number, cy: number, // Circle center
    r: number // Circle radius
  ): boolean => {
    // Convert lat/lng to approximate x,y coordinates for calculation
    const latToY = (lat: number) => lat * 111000; // 1 degree lat ≈ 111km
    const lngToX = (lng: number) => lng * 111000 * Math.cos(cx * Math.PI / 180); // Adjust for longitude
    
    const x1_conv = lngToX(x1);
    const y1_conv = latToY(y1);
    const x2_conv = lngToX(x2);
    const y2_conv = latToY(y2);
    const cx_conv = lngToX(cx);
    const cy_conv = latToY(cy);
    const r_conv = r; // Keep radius in meters

    // Vector from line start to end
    const dx = x2_conv - x1_conv;
    const dy = y2_conv - y1_conv;
    
    // Vector from line start to circle center
    const fx = cx_conv - x1_conv;
    const fy = cy_conv - y1_conv;
    
    // Length of line segment squared
    const lengthSq = dx * dx + dy * dy;
    
    // Projection of circle center onto line
    const t = Math.max(0, Math.min(1, (fx * dx + fy * dy) / lengthSq));
    
    // Closest point on line to circle center
    const closestX = x1_conv + t * dx;
    const closestY = y1_conv + t * dy;
    
    // Distance from circle center to closest point
    const distanceSq = (cx_conv - closestX) * (cx_conv - closestX) + (cy_conv - closestY) * (cy_conv - closestY);
    
    return distanceSq <= r_conv * r_conv;
  };

  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      if (typeof window === 'undefined' || !(window as any).google) {
        return `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
      
      const geocoder = new (window as any).google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });
      
      if (result.results && result.results[0]) {
        return result.results[0].formatted_address;
      }
      
      return `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Error geocoding coordinates:', error);
      return `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const showSelectedViolationOnMap = (violation: any) => {
    if (typeof window === 'undefined' || !map) return;
    
    // Clear previous selected violation marker
    if (selectedViolationMarker) {
      selectedViolationMarker.setMap(null);
    }
    
    // Create new marker for selected violation
    const marker = new (window as any).google.maps.Marker({
      position: { lat: violation.lat, lng: violation.lng },
      map: map,
      title: violation.type,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#ff0000" stroke="#ffffff" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="#ffffff"/>
            <path d="M16 8v8m0 4v2" stroke="#ff0000" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `),
        scaledSize: new (window as any).google.maps.Size(32, 32)
      },
      animation: (window as any).google.maps.Animation.BOUNCE
    });
    
    setSelectedViolationMarker(marker);
    
    // Pan map to selected violation
    map.panTo({ lat: violation.lat, lng: violation.lng });
    map.setZoom(16);
    
    console.log('📍 Selected violation shown on map:', violation);
  };

  // Detect violation locations along the route
  const detectRouteViolationZones = async (routePath: any[]) => {
    console.log('🔍 detectRouteViolationZones called with:', { 
      locationsCount: locations.length,
      routePathLength: routePath.length 
    });
    
    if (!locations.length || !routePath.length) {
      console.log('❌ Early return - no locations or route path');
      setRouteViolationZones([]);
      return;
    }

    const intersectingZones: any[] = [];
    const zoneRadius = 50; // 50 meters radius for violation zones (matches the circle on map)

    // Clear previous route violation markers
    if ((window as any).routeViolationMarkers) {
      (window as any).routeViolationMarkers.forEach((marker: any) => marker.setMap(null));
    }
    if ((window as any).routeViolationPolygons) {
      (window as any).routeViolationPolygons.forEach((polygon: any) => polygon.setMap(null));
    }
    (window as any).routeViolationMarkers = [];
    (window as any).routeViolationPolygons = [];

    // Check each line segment of the route
    for (let i = 0; i < routePath.length - 1; i++) {
      const startPoint = routePath[i];
      const endPoint = routePath[i + 1];
      
      // Check locations
      for (const location of locations) {
        // Check if this location is already in the list
        const exists = intersectingZones.find(z => z.id === location.id);
        if (exists) continue;

        // Check if line segment intersects with location circle
        const intersects = lineIntersectsCircle(
          startPoint.lng(),
          startPoint.lat(),
          endPoint.lng(),
          endPoint.lat(),
          location.lng,
          location.lat,
          zoneRadius
        );

        if (intersects && location.violations.length > 0) {
          // Convert location to violation zone format for compatibility
          const firstViolation = location.violations[0];
          const firstReport = firstViolation.reports[0];
          const violationZone = {
            id: location.id,
            violation_type: firstViolation.violation_type,
            reasons: firstReport.reason,
            solutions: firstReport.suggested_solutions,
            lat: location.lat,
            lng: location.lng,
            address: location.address,
            created_at: location.created_at,
            updated_at: location.updated_at
          };
          
          intersectingZones.push(violationZone);
          console.log(`🚨 Route intersects with location: ${firstViolation.violation_type} at ${location.address}`);

          // Add special route violation marker
          if (typeof window !== 'undefined' && (window as any).google && map) {
            // Create warning marker for route violation
            const routeViolationMarker = new (window as any).google.maps.Marker({
              position: { lat: location.lat, lng: location.lng },
              map: map,
              icon: {
                path: (window as any).google.maps.SymbolPath.CIRCLE,
                scale: 12,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                fillColor: '#ff4444',
                fillOpacity: 1
              },
              zIndex: 2000,
              title: `⚠️ ${firstViolation.violation_type} - Route Violation Zone`
            });

            // Create highlighted polygon for route violation
            const routeViolationPolygon = new (window as any).google.maps.Polygon({
              paths: generateCirclePath(location.lat, location.lng, 50),
              strokeColor: '#ff4444',
              strokeOpacity: 1,
              strokeWeight: 4,
              fillColor: '#ff4444',
              fillOpacity: 0.3,
              map: map,
              zIndex: 1500
            });

            (window as any).routeViolationMarkers.push(routeViolationMarker);
            (window as any).routeViolationPolygons.push(routeViolationPolygon);

            // Add click listener to show violation details
            routeViolationMarker.addListener('click', () => {
              const violationData = {
                type: firstViolation.violation_type,
                reasons: firstReport.reason,
                solutions: firstReport.suggested_solutions,
                lat: location.lat,
                lng: location.lng,
              };
              showSelectedViolationOnMap(violationData);
            });
          }
        }
      }
    }

    console.log(' Found intersecting violation locations:', intersectingZones.length);
    console.log(' Intersecting zones details:', intersectingZones);
    setRouteViolationZones(intersectingZones);

    // Show alert if violations found
    if (intersectingZones.length > 0) {
      triggerAlerts(
        ' Route Violations Detected',
        `Your route passes through ${intersectingZones.length} violation zone${intersectingZones.length > 1 ? 's' : ''}. Please review the details.`
      );
    }
  };

  // Clear the current route
  const clearRoute = () => {
    if (typeof window === 'undefined') return;
    
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] });
      setDirectionsData(null);
      setRouteViolationZones([]); // Clear route violation zones
      
      // Clear direction markers
      if ((window as any).directionMarkers) {
        (window as any).directionMarkers.forEach((marker: any) => marker.setMap(null));
        (window as any).directionMarkers = [];
      }
      
      // Clear route violation markers and polygons
      if ((window as any).routeViolationMarkers) {
        (window as any).routeViolationMarkers.forEach((marker: any) => marker.setMap(null));
        (window as any).routeViolationMarkers = [];
      }
      if ((window as any).routeViolationPolygons) {
        (window as any).routeViolationPolygons.forEach((polygon: any) => polygon.setMap(null));
        (window as any).routeViolationPolygons = [];
      }
      
      // Clear selected violation marker
      if (selectedViolationMarker) {
        selectedViolationMarker.setMap(null);
        setSelectedViolationMarker(null);
      }
      
      console.log('🗑️ Route cleared');
    }
  };

  return (
    <div
      className="fixed inset-0 w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: theme.bg,
      }}
    >
      {/* Notification Toast */}
      {notification.visible && (
        <div 
          className="fixed top-4 right-4 z-50 max-w-sm w-full p-4 rounded-lg shadow-lg backdrop-blur-sm border transition-all duration-300 transform"
          style={{
            backgroundColor: notification.type === 'error' ? '#fee2e2' : 
                           notification.type === 'warning' ? '#fef3c7' : '#d1fae5',
            borderColor: notification.type === 'error' ? '#fecaca' : 
                        notification.type === 'warning' ? '#fde68a' : '#a7f3d0',
            color: notification.type === 'error' ? '#991b1b' : 
                   notification.type === 'warning' ? '#92400e' : '#065f46',
            transform: notification.visible ? 'translateX(0)' : 'translateX(100%)'
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {notification.type === 'error' && (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              {notification.type === 'warning' && (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
              {notification.type === 'success' && (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(prev => ({ ...prev, visible: false }))}
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Map background */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full" />
      
      {/* Top Bar: Search + Directions + Hamburger in one row */}
      <div className="absolute top-2 sm:top-4 md:top-6 left-1/2 -translate-x-1/2 w-full max-w-[95%] sm:max-w-2xl lg:max-w-4xl z-10 flex flex-row items-center justify-center gap-x-1 sm:gap-x-2 px-2 sm:px-0">
        {/* Search Bar */}
        <div className="flex items-center flex-1 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 shadow-lg backdrop-blur-sm relative min-w-0" style={{ 
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
            placeholder={showDirections ? "From: Search for starting location..." : "Search location..."}
            className="flex-1 bg-transparent outline-none text-sm sm:text-base font-medium min-w-0 w-full"
            style={{ 
              color: isDarkMode ? '#ffffff' : '#1a1a1a'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0"
              style={{ 
                color: isDarkMode ? '#888888' : '#666666'
              }}
              title="Clear search"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {showDirections && (
            <button
              onClick={useCurrentLocation}
              className="ml-2 sm:ml-3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 hover:scale-105 flex-shrink-0"
              style={{ 
                backgroundColor: '#ff4444', 
                color: '#ffffff',
                marginLeft: searchQuery ? '0.75rem' : '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b71c1c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ff4444';
              }}
              title="Use Current Location"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          {!showDirections && (
          <button
            onClick={handleSearch}
            className="ml-2 sm:ml-3 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 hover:scale-105 flex-shrink-0"
            style={{ 
              backgroundColor: '#ff4444', 
              color: '#ffffff',
              marginLeft: searchQuery ? '0.75rem' : '0.5rem'
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
          )}
          </div>

        {/* Directions Button */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowDirections(!showDirections)}
            className="rounded-lg sm:rounded-xl w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm mr-1 sm:mr-2"
            style={{
              backgroundColor: showDirections ? '#3B82F6' : `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`,
              border: `1px solid ${showDirections ? '#3B82F6' : isDarkMode ? '#333333' : '#e5e5e5'}`,
              color: showDirections ? '#ffffff' : isDarkMode ? '#cccccc' : '#666666'
            }}
            onMouseEnter={(e) => {
              if (!showDirections) {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = '#3B82F6';
              }
            }}
            onMouseLeave={(e) => {
              if (!showDirections) {
                e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
                e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
                e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
              }
            }}
            title={showDirections ? "Directions ON" : "Directions OFF"}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
            </svg>
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

        {/* Enhanced Menu Button */}
        <div className="flex-shrink-0 relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg sm:rounded-xl w-10 sm:w-12 h-10 sm:h-12 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg backdrop-blur-sm group"
            style={{ 
              backgroundColor: showMenu ? '#ff4444' : `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`, 
              border: `2px solid ${showMenu ? '#ff4444' : isDarkMode ? '#333333' : '#e5e5e5'}`,
              color: showMenu ? '#ffffff' : isDarkMode ? '#cccccc' : '#666666',
              transform: showMenu ? 'scale(1.05)' : 'scale(1)',
              boxShadow: showMenu ? '0 8px 25px rgba(255, 68, 68, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onMouseEnter={(e) => {
              if (!showMenu) {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#333333' : '#f8f9fa';
                e.currentTarget.style.color = isDarkMode ? '#ffffff' : '#1a1a1a';
                e.currentTarget.style.borderColor = '#ff4444';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showMenu) {
                e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
                e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
                e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }
            }}
            title="Menu & Information"
            aria-label="Open menu and information panel"
          >
            <div className="relative">
              <svg 
                width="20" 
                height="20" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                className={`transition-transform duration-300 ${showMenu ? 'rotate-90' : 'rotate-0'}`}
              >
                <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2"/>
                <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/>
                <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2"/>
              </svg>
              
              {/* Notification indicator */}
              <div 
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"
                style={{ 
                  opacity: notificationsEnabled ? 0.8 : 0,
                  transform: notificationsEnabled ? 'scale(1)' : 'scale(0)',
                  transition: 'all 0.3s ease'
                }}
              />
            </div>
          </button>

          {/* Enhanced Dropdown Menu */}
          {showMenu && (
            <div 
              className="absolute top-12 sm:top-14 right-0 rounded-xl min-w-[240px] sm:min-w-[280px] shadow-2xl backdrop-blur-sm z-20 overflow-hidden"
              style={{ 
                backgroundColor: `${isDarkMode ? '#1a1a1a' : '#ffffff'}f0`, 
                border: `2px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
                backdropFilter: 'blur(20px)',
                animation: 'slideDown 0.3s ease-out'
              }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b" style={{ borderColor: isDarkMode ? '#333333' : '#e5e5e5' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ff4444' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#ffffff">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
                      Menu & Information
                    </h3>
                    <p className="text-xs" style={{ color: isDarkMode ? '#888888' : '#666666' }}>
                      Settings, help & more
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                {/* Settings Option */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowSettings(true);
                  }}
                  className="w-full px-4 py-3 text-left font-medium text-sm flex items-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 group"
                  style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}
                >
                  <div className="mr-3 p-1.5 rounded-lg transition-all duration-200 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30" style={{ backgroundColor: isDarkMode ? '#333333' : '#f8f9fa' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Settings</div>
                    <div className="text-xs" style={{ color: isDarkMode ? '#888888' : '#666666' }}>
                      Configure notifications & preferences
                    </div>
                  </div>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: isDarkMode ? '#888888' : '#666666' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Divider */}
                <div className="my-2 mx-4 h-px" style={{ backgroundColor: isDarkMode ? '#333333' : '#e5e5e5' }}></div>

                {/* About Option */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    window.location.href = '/about-us';
                  }}
                  className="w-full px-4 py-3 text-left font-medium text-sm flex items-center transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 group"
                  style={{ color: '#ff4444' }}
                >
                  <div className="mr-3 p-1.5 rounded-lg transition-all duration-200 group-hover:bg-red-100 dark:group-hover:bg-red-900/30" style={{ backgroundColor: isDarkMode ? '#333333' : '#f8f9fa' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">About the App</div>
                 
                  </div>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: isDarkMode ? '#888888' : '#666666' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>

                {/* Divider */}
                <div className="my-2 mx-4 h-px" style={{ backgroundColor: isDarkMode ? '#333333' : '#e5e5e5' }}></div>

                {/* Quick Stats */}
                <div className="px-4 py-3">
                  <div className="text-xs font-medium mb-2" style={{ color: isDarkMode ? '#888888' : '#666666' }}>
                    Quick Stats
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: isDarkMode ? '#333333' : '#f8f9fa' }}>
                      <div className="font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
                        {locations.length}
                      </div>
                      <div style={{ color: isDarkMode ? '#888888' : '#666666' }}>
                        Violation Zones
                      </div>
                    </div>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: isDarkMode ? '#333333' : '#f8f9fa' }}>
                      <div className="font-semibold" style={{ color: isDarkMode ? '#ffffff' : '#1a1a1a' }}>
                        {notificationsEnabled ? 'ON' : 'OFF'}
                      </div>
                      <div style={{ color: isDarkMode ? '#888888' : '#666666' }}>
                        Alerts
                      </div>
                    </div>
                  </div>
                </div>
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

        {/* Location Access Button */}
      <button
          onClick={async () => {
            if (!showUserLocation) {
              // Turn ON location tracking
              try {
                console.log('Requesting geolocation permission...');
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    console.log('✅ Geolocation permission granted');
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
                    setShowUserLocation(true);
                    
                    console.log('Location tracking enabled!');
                  },
                  (error) => {
                    console.error('❌ Geolocation error:', error);
                    alert('Unable to access your location. Please check your browser settings.');
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                  }
                );
              } catch (error) {
                console.error('❌ Location access error:', error);
                alert('Location access failed. Please try again.');
              }
            } else {
              // Turn OFF location tracking
              console.log('Turning off location tracking...');
              if (userLocationMarker) {
                userLocationMarker.setMap(null);
                setUserLocationMarker(null);
              }
              setUserLocation(null);
              setShowUserLocation(false);
              console.log('Location tracking disabled!');
            }
          }}
          className="rounded-lg sm:rounded-xl w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
        style={{
            backgroundColor: showUserLocation ? '#4285F4' : `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`,
            border: `1px solid ${showUserLocation ? '#4285F4' : isDarkMode ? '#333333' : '#e5e5e5'}`,
            color: showUserLocation ? '#fff' : isDarkMode ? '#cccccc' : '#666666'
        }}
        onMouseEnter={(e) => {
            if (!showUserLocation) {
          e.currentTarget.style.backgroundColor = '#4285F4';
          e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = '#4285F4';
            }
        }}
        onMouseLeave={(e) => {
            if (showUserLocation) {
            e.currentTarget.style.backgroundColor = '#4285F4';
            e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#4285F4';
          } else {
              e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
              e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
              e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
          }
        }}
          title={showUserLocation ? "Location Tracking ON" : "Location Tracking OFF"}
      >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

        {/* Center Map Button - Only shows when location is enabled */}
        {showUserLocation && (
          <button
            onClick={() => {
              if (userLocation && map) {
                map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
                map.setZoom(15);
                console.log('Map centered on user location');
              }
            }}
            className="rounded-lg sm:rounded-xl w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
            style={{
              backgroundColor: `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`,
              border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
              color: isDarkMode ? '#cccccc' : '#666666'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#10B981';
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = '#10B981';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`;
              e.currentTarget.style.color = isDarkMode ? '#cccccc' : '#666666';
              e.currentTarget.style.borderColor = isDarkMode ? '#333333' : '#e5e5e5';
            }}
            title="Center Map on My Location"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
            </svg>
          </button>
        )}



        {/* Crosshair Button */}
        <button
          onClick={() => setShowCrosshair(!showCrosshair)}
          className="rounded-lg sm:rounded-xl w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg backdrop-blur-sm"
          style={{
            backgroundColor: showCrosshair ? '#ffffff' : `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`,
            border: `1px solid ${showCrosshair ? '#ffffff' : isDarkMode ? '#333333' : '#e5e5e5'}`,
            color: showCrosshair ? '#000000' : isDarkMode ? '#cccccc' : '#666666',
            marginRight: showCrosshair ? '0.5rem' : 0
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

      {/* Add Violation Zone Button - Always Centered Above Bottom Controls */}
      {showCrosshair && (
        <button
          className="fixed left-1/2 transform -translate-x-1/2 px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-white font-medium text-sm sm:text-base rounded-lg sm:rounded-xl border transition-all duration-200 shadow-xl backdrop-blur-sm hover:scale-105 active:scale-95 z-30"
          style={{
            backgroundColor: '#ff4444',
            border: '1px solid #ff4444',
            color: '#ffffff',
            transition: 'all 0.2s ease-in-out',
            minWidth: 'max-content',
            bottom: '96px', // Default for mobile
          }}
                      onClick={(e) => {
              e.currentTarget.style.backgroundColor = '#8b0000';
              e.currentTarget.style.borderColor = '#8b0000';
              setTimeout(() => {
                if (e.currentTarget && e.currentTarget.style) {
                  e.currentTarget.style.backgroundColor = '#ff4444';
                  e.currentTarget.style.borderColor = '#ff4444';
                }
              }, 150);
              if (map) {
                const center = map.getCenter();
                if (center) {
                  setSelectedLocation({ lat: center.lat(), lng: center.lng() });
                  setFormData({ violationType: '', reasons: '', solutions: '' });
                  setShowForm(true);
                }
                setShowCrosshair(false);
              }
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
          <style>{`
            @media (min-width: 640px) {
              .add-violation-btn { bottom: 72px !important; }
            }
          `}</style>
        </button>
      )}

      {/* Centered Crosshair Overlay */}
      {showCrosshair && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {/* Centered Crosshair */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 pointer-events-none">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke={isDarkMode ? '#ffffff' : '#222'} strokeWidth="2">
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
                    onChange={e => setViolationTypeOther(sanitizeInput(e.target.value))}
                    required
                  />
                )}
                {validationErrors.violationType && (
                  <div className="mt-2 text-sm text-red-500 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {validationErrors.violationType}
                  </div>
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
                    onChange={e => setReasonOther(sanitizeInput(e.target.value))}
                    required
                  />
                )}
                {validationErrors.reasons && (
                  <div className="mt-2 text-sm text-red-500 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {validationErrors.reasons}
                  </div>
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
                    onChange={e => setSolutionOther(sanitizeInput(e.target.value))}
                    required
                  />
                )}
                {validationErrors.solutions && (
                  <div className="mt-2 text-sm text-red-500 flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {validationErrors.solutions}
                  </div>
                )}
                </div>
                
                {/* Rate Limit Error Message */}
                {validationErrors.rateLimit && (
                  <div className="mt-4 p-3 rounded-lg border flex items-center gap-2" style={{
                    backgroundColor: '#fef3c7',
                    borderColor: '#fde68a',
                    color: '#92400e'
                  }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm font-medium">{validationErrors.rateLimit}</span>
                  </div>
                )}
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
                    setValidationErrors({
                      violationType: "",
                      reasons: "",
                      solutions: "",
                      rateLimit: ""
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
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg font-medium transition-all duration-200 text-white flex items-center gap-2"
                style={{ 
                  backgroundColor: isSubmitting ? '#666666' : '#ff4444',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = '#b71c1c';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = '#ff4444';
                    }
                  }}
                >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
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
                          onChange={handleNotificationsToggle}
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
                          onChange={handleSoundAlertsToggle}
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
                          onChange={handleVibrationAlertsToggle}
                          disabled={!notificationsEnabled || !vibrationSupported}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" style={{ opacity: (notificationsEnabled && vibrationSupported) ? 1 : 0.5 }}></div>
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

      {/* Directions Form - Inline below search bar */}
      {showDirections && (
        <div className="absolute top-16 sm:top-20 md:top-24 left-1/2 -translate-x-1/2 w-full max-w-[95%] sm:max-w-2xl lg:max-w-4xl z-10">
          <div className="rounded-lg sm:rounded-xl shadow-lg backdrop-blur-sm p-4" style={{ 
            backgroundColor: `${isDarkMode ? '#1a1a1a' : '#ffffff'}e6`, 
            border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}` 
          }}>
            <div className="space-y-3">
              {/* Destination Input */}
              <div className="relative">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="To: Enter destination..."
                  className="w-full p-3 pr-16 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  style={{ 
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    borderColor: isDarkMode ? '#333333' : '#e5e5e5',
                    color: isDarkMode ? '#ffffff' : '#1a1a1a'
                  }}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: isDarkMode ? '#666666' : '#999999' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {destination && (
                  <button
                    onClick={() => setDestination('')}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                    style={{ color: isDarkMode ? '#888888' : '#666666' }}
                    title="Clear destination"
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Route Summary */}
              {directionsData && routeViolationZones.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-red-600 dark:text-red-400">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                      ⚠️ Route passes through {routeViolationZones.length} violation zone{routeViolationZones.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Review the violation details below to understand traffic regulations and ensure safe driving practices.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={calculateDirections}
                  disabled={!destination || isCalculatingRoute}
                  className={`flex-1 p-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 text-white shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 text-sm ${
                    !destination || isCalculatingRoute 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-[#3B82F6] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF]'
                  }`}
                >
                  {isCalculatingRoute ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                      </svg>
                      Get Route
                    </>
                  )}
                </button>
                
                {directionsData && (
                  <button 
                    onClick={clearRoute}
                    className="px-4 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] transition-all duration-200 text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Location Details Side Panel */}
      {selectedLocationForSidebar && (
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
                    Location Details
                  </h2>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedLocationForSidebar(null);
                  // Clear selected violation marker from map
                  if (selectedViolationMarker) {
                    selectedViolationMarker.setMap(null);
                    setSelectedViolationMarker(null);
                  }
                }}
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
            
            {/* Address Display */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: isDarkMode ? '#cccccc' : '#666666',
              fontSize: '0.875rem',
              fontWeight: 500,
              lineHeight: '1.4',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {selectedLocationForSidebar.address}
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '24px 24px 60px 24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>

            {/* Violations Summary */}
            <div style={{
              padding: '20px 0',
            }}>

              
              {/* Violations List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedLocationForSidebar.violations.map((violation: any, violationIndex: number) => (
                  <div key={violation.id} style={{
                    background: isDarkMode ? '#0f0f0f' : '#f8f9fa',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                  }}>
                    {/* Violation Type Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #ff4444, #b71c1c)',
                          borderRadius: '6px',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h4 style={{
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: isDarkMode ? '#ffffff' : '#1a1a1a',
                          margin: 0,
                        }}>
                          {violation.violation_type}
                        </h4>
                      </div>
                      <span style={{
                        background: '#ff4444',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '12px',
                      }}>
                        {violation.reports.length} report{violation.reports.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {/* Reports List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {violation.reports.map((report: any, reportIndex: number) => (
                        <div key={report.id} style={{
                          background: isDarkMode ? '#1a1a1a' : '#ffffff',
                          border: `1px solid ${isDarkMode ? '#333333' : '#e5e5e5'}`,
                          borderRadius: '6px',
                          padding: '12px',
                        }}>
                          {/* Report Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                          }}>
                            <span style={{
                              fontSize: '0.8rem',
                              color: isDarkMode ? '#888888' : '#666666',
                              fontWeight: 500,
                            }}>
                              Report #{reportIndex + 1}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              color: isDarkMode ? '#888888' : '#666666',
                            }}>
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {/* Reason */}
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '4px',
                            }}>
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={isDarkMode ? '#888888' : '#666666'}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0 1 18 0z" />
                              </svg>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: isDarkMode ? '#cccccc' : '#444444',
                              }}>
                                Reason:
                              </span>
                            </div>
                            <p style={{
                              fontSize: '0.85rem',
                              color: isDarkMode ? '#cccccc' : '#666666',
                              margin: 0,
                              lineHeight: '1.4',
                            }}>
                              {report.reason}
                            </p>
                          </div>
                          
                          {/* Suggested Solutions */}
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '4px',
                            }}>
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={isDarkMode ? '#888888' : '#666666'}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: isDarkMode ? '#cccccc' : '#444444',
                              }}>
                                Suggested Solution:
                              </span>
                            </div>
                            <p style={{
                              fontSize: '0.85rem',
                              color: isDarkMode ? '#cccccc' : '#666666',
                              margin: 0,
                              lineHeight: '1.4',
                            }}>
                              {report.suggested_solutions}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>



            {/* Action Buttons */}
           

            {/* Action Button */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
            }}>
              <button
                onClick={handleAddAnotherViolation}
                style={{
                  background: 'linear-gradient(135deg, #ff4444, #b71c1c)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  padding: '12px 20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)',
                  width: 'auto',
                  minWidth: 'fit-content',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 68, 68, 0.4)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ff6666, #d32f2f)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 68, 68, 0.3)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ff4444, #b71c1c)';
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>+ I also commit a violation here</span>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
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
                    {locations.length}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: isDarkMode ? '#888' : '#666',
                    fontWeight: 500,
                  }}>
                    Total Locations
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
                  
                  // Count from locations
                  locations.forEach((location: Location) => {
                    location.violations.forEach((violation) => {
                      typeCounts[violation.violation_type] = (typeCounts[violation.violation_type] || 0) + violation.reports.length;
                    });
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0 1 18 0z" />
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
                  {(() => {
                    // Get recent reports from locations
                    const allReports: Array<{
                      type: string;
                      date: string;
                    }> = [];
                    
                    // Add location violations
                    locations.forEach((location: Location) => {
                      location.violations.forEach((violation) => {
                        violation.reports.forEach((report) => {
                          allReports.push({
                            type: violation.violation_type,
                            date: report.created_at
                          });
                        });
                      });
                    });
                    
                    // Sort by date (newest first) and take first 5
                    const recentReports = allReports
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5);
                    
                    return recentReports.map((report, index: number) => (
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0 1 18 0z" />
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
                            {new Date(report.date).toLocaleDateString()} • {new Date(report.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
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
                  const violationTypeCounts: Record<string, number> = {};
                  
                  // Count violation types from all locations
                  locations.forEach((location: Location) => {
                    location.violations.forEach((violation) => {
                      const violationType = violation.violation_type;
                      violationTypeCounts[violationType] = (violationTypeCounts[violationType] || 0) + violation.reports.length;
                    });
                  });
                  
                  const sortedViolations = Object.entries(violationTypeCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);

                  return (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}>
                      {sortedViolations.map(([violationType, count], index) => (
                        <div key={violationType} style={{
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
                            fontWeight: 500,
                          }}>
                            {violationType}
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
                      {Object.keys(violationTypeCounts).length > 3 && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 12px',
                          background: isDarkMode ? '#1a1a1a' : '#ffffff',
                          border: `1px solid ${isDarkMode ? '#333' : '#e9ecef'}`,
                          borderRadius: '8px',
                          opacity: 0.7,
                        }}>
                          <div style={{
                            background: '#666666',
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
                            ...
                          </div>
                          <div style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            color: isDarkMode ? '#888888' : '#999999',
                            fontStyle: 'italic',
                          }}>
                            {Object.keys(violationTypeCounts).length - 3} more violation types
                          </div>
                        </div>
                      )}
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
            {/* Route Violation Zones Card */}
      {(() => {
        console.log('🔍 Checking route violation panel conditions:', { 
          hasDirectionsData: !!directionsData, 
          routeViolationZonesCount: routeViolationZones.length,
          routeViolationZones: routeViolationZones,
          selectedViolation: !!selectedViolation
        });
        return directionsData && routeViolationZones.length > 0 && !selectedViolation;
      })() && (
        <div 
          className="violation-zones-card"
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            left: '20px',
            width: 'auto',
            maxWidth: '320px',
            height: '200px',
            background: isDarkMode ? 'rgba(26, 26, 26, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            borderRadius: '16px',
            boxShadow: '0 12px 32px rgba(255, 68, 68, 0.3)',
            zIndex: 1000,
            backdropFilter: 'blur(20px)',
            border: `2px solid #ff4444`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            margin: '0 auto',
            animation: 'pulse 2s infinite',
          }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #ff4444, #b71c1c)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Route Violations ({routeViolationZones.length})
            </span>
          </div>
          {/* Scrollable Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {routeViolationZones.map((zone, index) => (
                              <div
                key={zone.id}
                style={{
                  background: isDarkMode ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.background = isDarkMode ? 'rgba(26, 26, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = isDarkMode ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                }}
                onClick={() => {
                  const violationData = {
                    type: zone.violation_type,
                    reasons: zone.reasons,
                    solutions: zone.solutions,
                    lat: zone.lat,
                    lng: zone.lng,
                  };
                  showSelectedViolationOnMap(violationData);
                  // Don't clear route violation zones - keep them visible
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <div style={{
                    background: '#ff4444',
                    borderRadius: '4px',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <h4 style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: '#ff4444',
                          margin: 0,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          {zone.violation_type || 'Unknown Violation'}
                        </h4>
                        <div style={{
                          background: '#ff4444',
                          color: '#ffffff',
                          fontSize: '0.5rem',
                          fontWeight: 600,
                          padding: '1px 4px',
                          borderRadius: '6px',
                        }}>
                          #{index + 1}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const violationData = {
                            type: zone.violation_type,
                            reasons: zone.reasons,
                            solutions: zone.solutions,
                            lat: zone.lat,
                            lng: zone.lng,
                          };
                          setSelectedViolation(violationData);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)',
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)';
                          e.currentTarget.style.color = '#ff4444';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)';
                        }}
                        title="More Information"
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0 1 18 0z" />
                        </svg>
                      </button>
                    </div>
                    <div style={{
                      fontSize: '0.5rem',
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      marginBottom: '4px',
                    }}>
                      <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {zone.address || `Near ${zone.lat.toFixed(4)}, ${zone.lng.toFixed(4)}`}
                    </div>
                    {zone.reasons && (
                      <p style={{
                        fontSize: '0.625rem',
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                        margin: 0,
                        lineHeight: '1.2',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontStyle: 'italic',
                      }}>
                        {zone.reasons}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Responsive mobile style: adjust padding/font size for mobile */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 12px 32px rgba(255, 68, 68, 0.3); }
          50% { box-shadow: 0 12px 32px rgba(255, 68, 68, 0.6); }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @media (max-width: 640px) {
          .violation-panel-content { padding: 24px 10px 16px 10px !important; font-size: 1rem !important; }
          .violation-panel-content h2 { font-size: 1.1rem !important; }
        }
        
        /* Responsive violation zones card */
        @media (min-width: 768px) {
          .violation-zones-card {
            left: auto !important;
            margin: 0 !important;
            width: 320px !important;
          }
        }
      `}</style>
    </div>

  );
} 