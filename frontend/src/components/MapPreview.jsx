import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths for CRA
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapPreview({ lat, lon, name, height = 220, zoom = 15 }) {
  if (!lat || !lon) return null;
  const center = [lat, lon];

  return (
    <div className="map-preview" style={{ width: '100%', height }}>
      <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%', borderRadius: 12 }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          {name && (
            <Popup>
              <strong>{name}</strong>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapPreview;
