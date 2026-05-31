import "./map.css";
import { useEffect, useRef, useState } from "react"; 
import Container from "react-bootstrap/Container";
import mapboxgl from "mapbox-gl";

/**
 * Map Component
 * Renders an interactive 3D globe using Mapbox GL JS with custom store markers
 * and an info sidebar.
 */
function Map() {
  const mapRef = useRef(null); // Reference to the DOM element where the map will render
  const [selectedStore, setSelectedStore] = useState(null); // State to manage the active store for the sidebar

  useEffect(() => {
    // Set your Mapbox access token from environment variables
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

    // Geographic center for Ukraine
    const centerUkraine = [31.1656, 48.3794];

    // 1. Initialize the Map
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "/mymap-style.json", // Path to your custom map style JSON
      center: centerUkraine,
      zoom: 5,
      projection: "globe", // Enables the 3D globe view
      pitch: 20,           // Slight tilt for a 3D effect
      minZoom: 3,
    });

    // Add navigation tools (zoom in/out, compass)
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // 2. Map Visual Effects (Atmosphere/Fog)
    map.on("load", () => {
      map.setFog({
        "color": "#000000",       
        "high-color": "#000000",     
        "space-color": "#000000",  
        "star-intensity": 0.3       
      });

      // 3. Define Store Data (GeoJSON)
      const stores = {
        type: "FeatureCollection",
        features: [
          { 
            type: "Feature", 
            properties: { 
              title: "Store Kyiv", 
              description: "Main store in Kyiv", 
              address: "str. Hreschatuk, 1", 
              hours: "10:00 - 21:00" 
            }, 
            geometry: { type: "Point", coordinates: [30.5234, 50.4501] } 
          },
          { 
            type: "Feature", 
            properties: { 
              title: "Store Lviv", 
              description: "Store in Lviv", 
              address: "sq. Rynok, 10", 
              hours: "09:00 - 20:00" 
            }, 
            geometry: { type: "Point", coordinates: [24.0316, 49.8429] } 
          },
          { 
            type: "Feature", 
            properties: { 
              title: "Store Odesa", 
              description: "Store in Odesa", 
              address: "str. Derybasivska, 5", 
              hours: "10:00 - 22:00" 
            }, 
            geometry: { type: "Point", coordinates: [30.7233, 46.4825] } 
          }
        ]
      };

      // Add the stores data as a source
      map.addSource("stores", { type: "geojson", data: stores });

      // 4. Load Custom Marker Image
      const imageUrl = "/nike-logo-to-store-map.png";
      map.loadImage(imageUrl, (error, image) => {
        if (error) return console.error("Could not load image:", error);
        if (!map.hasImage("store-icon")) map.addImage("store-icon", image);

        // Add the layer to render markers on the map
        map.addLayer({
          id: "stores-layer",
          type: "symbol",
          source: "stores",
          layout: {
            "icon-image": "store-icon",
            "icon-allow-overlap": true,
            // Dynamically scale the icon size based on zoom level
            "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.05, 5, 0.08, 10, 0.15, 15, 0.07, 20, 0.2],
          },
        });
      });

      // 5. Interaction: Click on Marker
      map.on("click", "stores-layer", (e) => {
        const coords = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;

        // Smoothly fly to the clicked location
        // Offset the center slightly (coords[0] + 0.01) so the sidebar doesn't cover the marker
        map.flyTo({ 
          center: [coords[0] + 0.01, coords[1]],
          zoom: 15, 
          speed: 1.2 
        });

        // Set state to trigger the sidebar UI
        setSelectedStore(props); 
      });

      // 6. UI Polish: Change cursor on hover
      map.on("mouseenter", "stores-layer", () => map.getCanvas().style.cursor = "pointer");
      map.on("mouseleave", "stores-layer", () => map.getCanvas().style.cursor = "");

      // Hide default Mapbox attribution for a cleaner design
      const attribs = document.getElementsByClassName("mapboxgl-ctrl-attrib");
      for (let i = 0; i < attribs.length; i++) attribs[i].style.display = "none";
    });

    // Cleanup: Remove map instance when component unmounts to prevent memory leaks
    return () => map.remove();
  }, []);

  return (
    <Container>
      <div style={{ padding: "5% 0 0 0", width: "100%", position: "relative" }}>
        <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          
          {/* Overlay Sidebar: Opens when a store is selected */}
          <div className={`store-sidebar ${selectedStore ? "open" : ""}`}>
            {selectedStore && (
              <div className="sidebar-content">
                <button className="close-sidebar" onClick={() => setSelectedStore(null)}>×</button>
                <h3>{selectedStore.title}</h3>
                <p className="description">{selectedStore.description}</p>
                <div className="details">
                  <p><strong>Address:</strong> {selectedStore.address}</p>
                  <p><strong>Hours:</strong> {selectedStore.hours}</p>
                </div>
                <button className="action-button">Details</button>
              </div>
            )}
          </div>

          {/* Map Container */}
          <div
            ref={mapRef}
            id="map"
            style={{ height: "90vh", width: "100%" }}
          />
        </div>
      </div>
    </Container>
  );
}

export default Map;