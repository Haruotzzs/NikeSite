import "./map.css";
import { useEffect, useRef, useState } from "react"; 
import Container from "react-bootstrap/Container";
import mapboxgl from "mapbox-gl";

function Map() {
  const mapRef = useRef(null);
  const [selectedStore, setSelectedStore] = useState(null); 

  useEffect(() => {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

    const centerUkraine = [31.1656, 48.3794];

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "/mymap-style.json",
      center: centerUkraine,
      zoom: 5,
      projection: "globe",
      pitch: 20,
      minZoom: 3,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
  map.setFog({
    "color": "#000000",       
    "high-color": "#000000",     
    "space-color": "#000000",  
    "star-intensity": 0.3       
  });

});

    map.on("load", () => {
      const stores = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { title: "Store Kyiv", description: "Main store in Kyiv", address: "вул. Хрещатик, 1", hours: "10:00 - 21:00" }, geometry: { type: "Point", coordinates: [30.5234, 50.4501] } },
          { type: "Feature", properties: { title: "Store Lviv", description: "Store in Lviv", address: "пл. Ринок, 10", hours: "09:00 - 20:00" }, geometry: { type: "Point", coordinates: [24.0316, 49.8429] } },
          { type: "Feature", properties: { title: "Store Odesa", description: "Store in Odesa", address: "вул. Дерибасівська, 5", hours: "10:00 - 22:00" }, geometry: { type: "Point", coordinates: [30.7233, 46.4825] } }
        ]
      };

      map.addSource("stores", { type: "geojson", data: stores });

      const imageUrl = "/nike-logo-to-store-map.png";
      map.loadImage(imageUrl, (error, image) => {
        if (error) return console.error("Could not load image:", error);
        if (!map.hasImage("store-icon")) map.addImage("store-icon", image);

        map.addLayer({
          id: "stores-layer",
          type: "symbol",
          source: "stores",
          layout: {
            "icon-image": "store-icon",
            "icon-allow-overlap": true,
            "icon-size": ["interpolate", ["linear"], ["zoom"], 4, 0.05, 5, 0.08, 10, 0.15, 15, 0.07, 20, 0.2],
          },
        });
      });

      map.on("click", "stores-layer", (e) => {
        const coords = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;

        map.flyTo({ 
          center: [coords[0] + 0.01, coords[1]],
          zoom: 15, 
          speed: 1.2 
        });

        setSelectedStore(props); 
      });

      map.on("mouseenter", "stores-layer", () => map.getCanvas().style.cursor = "pointer");
      map.on("mouseleave", "stores-layer", () => map.getCanvas().style.cursor = "");

      const attribs = document.getElementsByClassName("mapboxgl-ctrl-attrib");
      for (let i = 0; i < attribs.length; i++) attribs[i].style.display = "none";
    });

    return () => map.remove();
  }, []);

  return (
    <Container>
      <div style={{ padding: "5% 0 0 0", width: "100%", position: "relative" }}>
        <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          
          {/* Бічна панель (Overlay) */}
          <div className={`store-sidebar ${selectedStore ? "open" : ""}`}>
            {selectedStore && (
              <div className="sidebar-content">
                <button className="close-sidebar" onClick={() => setSelectedStore(null)}>×</button>
                <h3>{selectedStore.title}</h3>
                <p className="description">{selectedStore.description}</p>
                <div className="details">
                  <p><strong>Адреса:</strong> {selectedStore.address}</p>
                  <p><strong>Години:</strong> {selectedStore.hours}</p>
                </div>
                <button className="action-button">Детальніше</button>
              </div>
            )}
          </div>

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