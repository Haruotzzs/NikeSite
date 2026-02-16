import "./map.css";
import { useEffect, useRef } from "react";
import Container from "react-bootstrap/Container";

function Map() {
  const mapRef = useRef(null);

  useEffect(() => {
    let map;

    async function initMap() {
      const { Map } = await window.google.maps.importLibrary("maps");

      const centerUkraine = { lat: 48.3794, lng: 31.1656 };

      const mapStyles = [
        { elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#000000" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#FF8C00" }]
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#000000" }]
        },
        {
          featureType: "administrative",
          elementType: "geometry.stroke",
          stylers: [{ color: "#FF0000", weight: 2 }]
        },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] }
      ];

      map = new Map(mapRef.current, {
        center: centerUkraine,
        zoom: 1,
        styles: mapStyles,
        restriction: {
          latLngBounds: {
            north: 52.3794,
            south: 45.0,
            west: 23.0,
            east: 40.0
          },
          strictBounds: true
        },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        // zoomControl: true,
        // zoomControlOptions: {
        //   position: window.google.maps.ControlPosition.RIGHT_CENTER
        // }
      });

      new window.google.maps.KmlLayer({
        url: "https://www.google.com/maps/d/u/0/kml?forcekml=1&mid=1h9KroD16Vd9S8lHx0UJR_quwttdQNQA",
        map,
      });

     }

    if (!window.google) {
      const script = document.createElement("script");
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=AIzaSyC5KahDBVdU3tWXez_3DhjoIottTsEuLM0&libraries=maps,marker";
      script.async = true;
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  return (
    <Container>

    

      <div style={{padding:"10%", width:"190vh"}}>
      <div ref={mapRef} id="map" style={{display:"flex", justifyContent:"center", height: "80vh", }} />
      </div>
    </Container>
  );
}

export default Map;