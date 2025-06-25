// Map functionality for Logistics Route Optimizer

let map;
let directionsService;
let directionsRenderer;
let markers = [];
let optimizedRoute = null;
let currentRoutePolyline = null;
let trafficLayer = null;

// Initialize the map
function initializeMap() {
  // Create map centered on a default location (can be adjusted based on user's location)
  const defaultLocation = { lat: 12.9716, lng: 77.5946 }; // Bangalore, India as default
  
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: defaultLocation,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT
    },
    fullscreenControl: true,
    streetViewControl: false,
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER
    }
  });

  // Initialize directions service and renderer
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: true, // We'll create custom markers
    polylineOptions: {
      strokeColor: '#0d6efd',
      strokeWeight: 5,
      strokeOpacity: 0.7
    }
  });
  directionsRenderer.setMap(map);

  // Initialize traffic layer but don't display it yet
  trafficLayer = new google.maps.TrafficLayer();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize autocomplete for address inputs
  initializeAutocomplete();
}

// Set up event listeners for the map and related UI elements
function setupEventListeners() {
  // Form submission for route optimization
  document.getElementById('optimizationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    optimizeRoute();
  });
  
  // Add delivery point button
  document.getElementById('addPoint').addEventListener('click', function() {
    addDeliveryPointInput();
  });
  
  // Remove delivery point buttons (using event delegation)
  document.getElementById('deliveryPoints').addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-point')) {
      e.target.closest('.input-group').remove();
    }
  });
  
  // Reoptimize button
  document.getElementById('reoptimizeBtn').addEventListener('click', function() {
    reoptimizeRoute();
  });
  
  // Simulate traffic button
  document.getElementById('simulateBtn').addEventListener('click', function() {
    simulateTraffic();
  });
  
  // Traffic checkbox
  document.getElementById('considerTraffic').addEventListener('change', function() {
    if (this.checked) {
      trafficLayer.setMap(map);
    } else {
      trafficLayer.setMap(null);
    }
    
    // If we already have a route, reoptimize it
    if (optimizedRoute) {
      optimizeRoute();
    }
  });
}

// Initialize Google Places Autocomplete for address inputs
function initializeAutocomplete() {
  // Autocomplete for start point
  const startPointInput = document.getElementById('startPoint');
  new google.maps.places.Autocomplete(startPointInput);
  
  // Autocomplete for initial delivery point
  const deliveryPoints = document.querySelectorAll('.delivery-point');
  deliveryPoints.forEach(input => {
    new google.maps.places.Autocomplete(input);
  });
}

// Add a new delivery point input with autocomplete
function addDeliveryPointInput() {
  const deliveryPointsContainer = document.getElementById('deliveryPoints');
  const newPointDiv = document.createElement('div');
  newPointDiv.className = 'input-group mb-2';
  newPointDiv.innerHTML = `
    <input type="text" class="form-control delivery-point" placeholder="Enter address">
    <button class="btn btn-outline-secondary remove-point" type="button">×</button>
  `;
  
  deliveryPointsContainer.appendChild(newPointDiv);
  
  // Initialize autocomplete for the new input
  const newInput = newPointDiv.querySelector('.delivery-point');
  new google.maps.places.Autocomplete(newInput);
}

// Optimize the delivery route
async function optimizeRoute() {
  // Show loading state
  document.getElementById('optimizationForm').classList.add('optimizing');
  document.querySelector('#optimizationForm button[type="submit"]').textContent = 'Optimizing...';
  
  // Get form values
  const algorithm = document.getElementById('algorithm').value;
  const startPoint = document.getElementById('startPoint').value;
  const considerTraffic = document.getElementById('considerTraffic').checked;
  
  // Get all delivery points
  const deliveryPointInputs = document.querySelectorAll('.delivery-point');
  const deliveryPoints = Array.from(deliveryPointInputs).map(input => input.value).filter(value => value.trim() !== '');
  
  // Validate inputs
  if (!startPoint || deliveryPoints.length === 0) {
    alert('Please enter a start point and at least one delivery point');
    resetOptimizationForm();
    return;
  }
  
  // Clear previous markers and routes
  clearMap();
  
  try {
    // Record start time for computation time metric
    const startTime = performance.now();
    
    // Simulate API call to our backend for route optimization
    const optimizationData = {
      algorithm,
      startPoint,
      deliveryPoints,
      considerTraffic
    };
    
    // In a real implementation, this would be an API call to our backend
    // const response = await fetch('/api/route-optimization/optimize', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(optimizationData)
    // });
    // const result = await response.json();
    
    // For demo purposes, we'll simulate the response
    const result = await simulateOptimizationResponse(optimizationData);
    optimizedRoute = result;
    
    // Calculate computation time
    const endTime = performance.now();
    const computationTime = Math.round(endTime - startTime);
    
    // Display the route on the map
    displayRoute(result.route);
    
    // Update route metrics
    updateRouteMetrics({
      distance: result.totalDistance,
      time: result.estimatedTime,
      fuelSavings: result.fuelSavings,
      computationTime
    });
    
    // Enable reoptimize and simulate buttons
    document.getElementById('reoptimizeBtn').disabled = false;
    document.getElementById('simulateBtn').disabled = false;
    
  } catch (error) {
    console.error('Error optimizing route:', error);
    alert('Error optimizing route. Please try again.');
  } finally {
    resetOptimizationForm();
  }
}

// Simulate the response from our backend route optimization API
async function simulateOptimizationResponse(data) {
  // This is a simulation for demo purposes
  // In a real implementation, this would be replaced by an actual API call
  
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(async () => {
      try {
        // Get geocoded locations for all addresses
        const startLocation = await geocodeAddress(data.startPoint);
        const deliveryLocations = await Promise.all(
          data.deliveryPoints.map(point => geocodeAddress(point))
        );
        
        // Create waypoints array for directions service
        const waypoints = deliveryLocations.map(location => ({
          location: new google.maps.LatLng(location.lat, location.lng),
          stopover: true
        }));
        
        // Determine route order based on algorithm
        let orderedWaypoints;
        if (data.algorithm === 'tsp') {
          // For TSP, we'll use a simple nearest neighbor algorithm for demo
          orderedWaypoints = simulateTSP(startLocation, waypoints);
        } else {
          // For Dijkstra, we'll just use the order provided (simplified for demo)
          orderedWaypoints = waypoints;
        }
        
        // Calculate route details
        const routeDetails = {
          route: {
            origin: new google.maps.LatLng(startLocation.lat, startLocation.lng),
            destination: new google.maps.LatLng(startLocation.lat, startLocation.lng), // Return to start
            waypoints: orderedWaypoints,
            optimizeWaypoints: false, // We've already optimized
            travelMode: google.maps.TravelMode.DRIVING,
            avoidHighways: false,
            avoidTolls: false
          },
          totalDistance: (Math.random() * 20 + 10).toFixed(2), // Random distance between 10-30 km
          estimatedTime: Math.floor(Math.random() * 60 + 30), // Random time between 30-90 minutes
          fuelSavings: (Math.random() * 20 + 20).toFixed(1), // Random savings between 20-40%
          waypoints: orderedWaypoints
        };
        
        resolve(routeDetails);
      } catch (error) {
        console.error('Error in simulation:', error);
        // Provide fallback data in case of error
        resolve({
          route: null,
          totalDistance: 0,
          estimatedTime: 0,
          fuelSavings: 0,
          waypoints: []
        });
      }
    }, 1500); // Simulate 1.5 second delay
  });
}

// Simple TSP simulation using nearest neighbor algorithm
function simulateTSP(startLocation, waypoints) {
  // Convert waypoints to simple points array
  const points = waypoints.map(wp => ({
    lat: wp.location.lat(),
    lng: wp.location.lng(),
    waypoint: wp
  }));
  
  // Start with an empty route and the start location
  const route = [];
  let currentPoint = { lat: startLocation.lat, lng: startLocation.lng };
  
  // Copy points array to avoid modifying the original
  const remainingPoints = [...points];
  
  // While there are points left to visit
  while (remainingPoints.length > 0) {
    // Find the nearest point
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(
      currentPoint.lat, currentPoint.lng,
      remainingPoints[0].lat, remainingPoints[0].lng
    );
    
    for (let i = 1; i < remainingPoints.length; i++) {
      const distance = calculateDistance(
        currentPoint.lat, currentPoint.lng,
        remainingPoints[i].lat, remainingPoints[i].lng
      );
      
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    // Add the nearest point to the route
    const nearestPoint = remainingPoints[nearestIndex];
    route.push(nearestPoint.waypoint);
    
    // Update current point and remove from remaining points
    currentPoint = { lat: nearestPoint.lat, lng: nearestPoint.lng };
    remainingPoints.splice(nearestIndex, 1);
  }
  
  return route;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Geocode an address to get lat/lng
async function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng(),
          address: results[0].formatted_address
        });
      } else {
        reject(new Error(`Geocoding failed for address: ${address}`));
      }
    });
  });
}

// Display the optimized route on the map
function displayRoute(routeRequest) {
  if (!routeRequest) return;
  
  // Request directions from Google Maps Directions Service
  directionsService.route(routeRequest, (result, status) => {
    if (status === 'OK') {
      // Display the route
      directionsRenderer.setDirections(result);
      
      // Create custom markers for each waypoint
      createRouteMarkers(routeRequest, result);
    } else {
      console.error('Directions request failed:', status);
      alert('Could not display route. Please try again.');
    }
  });
}

// Create custom markers for the route
function createRouteMarkers(routeRequest, directionsResult) {
  // Clear existing markers
  clearMarkers();
  
  // Create start marker
  const startMarker = new google.maps.Marker({
    position: routeRequest.origin,
    map: map,
    title: 'Start/End Point (Warehouse)',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#198754',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2
    },
    zIndex: 10
  });
  markers.push(startMarker);
  
  // Create markers for each waypoint
  const legs = directionsResult.routes[0].legs;
  routeRequest.waypoints.forEach((waypoint, index) => {
    const marker = new google.maps.Marker({
      position: waypoint.location,
      map: map,
      title: `Delivery Point ${index + 1}`,
      label: {
        text: (index + 1).toString(),
        color: '#ffffff'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#0d6efd',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      zIndex: 5
    });
    markers.push(marker);
    
    // Add info window with address and estimated arrival time
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="width: 200px;">
          <h6 style="margin: 0 0 5px 0;">Delivery Point ${index + 1}</h6>
          <p style="margin: 0 0 5px 0;">${legs[index].end_address}</p>
          <p style="margin: 0;"><strong>Distance:</strong> ${legs[index].distance.text}</p>
          <p style="margin: 0;"><strong>Time:</strong> ${legs[index].duration.text}</p>
        </div>
      `
    });
    
    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });
  });
}

// Reoptimize the route based on current position and traffic
function reoptimizeRoute() {
  if (!optimizedRoute) return;
  
  // Simulate a current position (for demo purposes)
  // In a real app, this would use the driver's actual GPS position
  const randomWaypointIndex = Math.floor(Math.random() * optimizedRoute.waypoints.length);
  const currentPosition = optimizedRoute.waypoints[randomWaypointIndex].location;
  
  // Create a current position marker
  const currentMarker = new google.maps.Marker({
    position: currentPosition,
    map: map,
    title: 'Current Position',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#ffc107',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2
    },
    zIndex: 15
  });
  markers.push(currentMarker);
  
  // Simulate reoptimization
  // In a real app, this would call the backend API
  alert('Reoptimizing route from current position...');
  
  // For demo purposes, just recalculate the route from the current position
  const remainingWaypoints = optimizedRoute.waypoints.slice(randomWaypointIndex + 1);
  
  const newRouteRequest = {
    origin: currentPosition,
    destination: optimizedRoute.route.destination,
    waypoints: remainingWaypoints,
    optimizeWaypoints: false,
    travelMode: google.maps.TravelMode.DRIVING,
    avoidHighways: false,
    avoidTolls: false
  };
  
  // Display the reoptimized route
  displayRoute(newRouteRequest);
  
  // Update metrics
  const newDistance = (parseFloat(optimizedRoute.totalDistance) * 0.7).toFixed(2);
  const newTime = Math.floor(parseFloat(optimizedRoute.estimatedTime) * 0.7);
  
  updateRouteMetrics({
    distance: newDistance,
    time: newTime,
    fuelSavings: optimizedRoute.fuelSavings,
    computationTime: 200 // Simulated computation time
  });
}

// Simulate traffic conditions on the route
function simulateTraffic() {
  if (!optimizedRoute) return;
  
  // Toggle traffic layer
  if (trafficLayer.getMap()) {
    trafficLayer.setMap(null);
    document.getElementById('simulateBtn').textContent = 'Simulate Traffic';
  } else {
    trafficLayer.setMap(map);
    document.getElementById('simulateBtn').textContent = 'Hide Traffic';
    
    // Show a notification about traffic conditions
    alert('Traffic simulation enabled. Route times may be affected by current traffic conditions.');
    
    // Update estimated time with traffic consideration
    const trafficFactor = 1.3; // 30% increase due to traffic
    const newTime = Math.floor(parseFloat(optimizedRoute.estimatedTime) * trafficFactor);
    
    // Update only the time metric
    document.getElementById('estimatedTime').textContent = newTime;
  }
}

// Update route metrics display
function updateRouteMetrics(metrics) {
  document.getElementById('totalDistance').textContent = metrics.distance;
  document.getElementById('estimatedTime').textContent = metrics.time;
  document.getElementById('fuelSavings').textContent = metrics.fuelSavings;
  document.getElementById('computationTime').textContent = metrics.computationTime;
}

// Clear all markers from the map
function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

// Clear the entire map (markers and routes)
function clearMap() {
  clearMarkers();
  directionsRenderer.setDirections({ routes: [] });
}

// Reset the optimization form after submission
function resetOptimizationForm() {
  document.getElementById('optimizationForm').classList.remove('optimizing');
  document.querySelector('#optimizationForm button[type="submit"]').textContent = 'Optimize Route';
}