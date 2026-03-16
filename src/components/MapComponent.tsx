import { type FunctionComponent, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import styles from "../css/Catalog.module.css";

// Fix for default marker icons in Leaflet+React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export type Property = {
  id: string;
  title: string;
  price: number;
  address: string;
  lat: number;
  lng: number;
  rooms: number;
  area: number;
  imageUrl: string;
};

type Props = {
  properties: Property[];
};

const MapUpdater = ({ properties }: { properties: Property[] }) => {
  const map = useMap();
  useEffect(() => {
    if (properties.length > 0) {
      const bounds = L.latLngBounds(properties.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [properties, map]);
  return null;
};

const MapComponent: FunctionComponent<Props> = ({ properties }) => {
  const navigate = useNavigate();

  return (
    <MapContainer 
      center={[43.238949, 76.889709]} // Default to Almaty
      zoom={13} 
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <MapUpdater properties={properties} />
      
      {properties.map(property => (
        <Marker key={property.id} position={[property.lat, property.lng]}>
          <Popup minWidth={260} maxWidth={260}>
            <div className={styles.popupCard}>
              <img src={property.imageUrl} alt={property.title} className={styles.popupImage} />
              <div className={styles.popupInfo}>
                <div className={styles.popupPrice}>{property.price.toLocaleString("ru-RU")} ₸</div>
                <div className={styles.popupTitle}>{property.title}</div>
                <div className={styles.popupAddress}>
                  <img src="/assets/location.svg" alt="" style={{ width: 12, marginRight: 4 }} />
                  {property.address}
                </div>
                <div className={styles.popupDetailsRow}>
                  <span>
                    <img src="/assets/room.svg" alt="" style={{ width: 16 }} />
                    {property.rooms} комн.
                  </span>
                  <span>
                    <img src="/assets/area.svg" alt="" style={{ width: 16 }} />
                    {property.area} м²
                  </span>
                </div>
                <button 
                  className={styles.popupBtn}
                  onClick={() => navigate(`/property/${property.id}`)}
                >
                  Подробнее
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
