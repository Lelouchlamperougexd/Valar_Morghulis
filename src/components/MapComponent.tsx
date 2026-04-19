import { type FunctionComponent, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import { useNavigate } from "react-router-dom";
import styles from "../css/Catalog.module.css";
import { createRoot } from "react-dom/client";

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

// Inner component: renders clusters + markers using the map instance
const ClusterLayer = ({ properties }: { properties: Property[] }) => {
  const map = useMap();
  const navigate = useNavigate();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    // Remove old cluster group if it exists
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    const clusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 36 : count < 100 ? 44 : 52;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:#70a0ff;
            border:3px solid #fff;
            border-radius:50%;
            box-shadow:0 2px 10px rgba(112,160,255,0.45);
            display:flex;align-items:center;justify-content:center;
            font-family:Inter,sans-serif;
            font-size:${count < 10 ? 14 : 13}px;
            font-weight:700;
            color:#fff;
            line-height:1;
          ">${count}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    }) as L.MarkerClusterGroup;

    properties.forEach(property => {
      const marker = L.marker([property.lat, property.lng]);

      // Build popup DOM node
      const popupContainer = document.createElement("div");
      popupContainer.style.width = "260px";
      popupContainer.style.fontFamily = "Inter, sans-serif";

      const root = createRoot(popupContainer);
      root.render(
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
      );

      marker.bindPopup(popupContainer, { minWidth: 260, maxWidth: 260 });
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Fit bounds to all markers
    if (properties.length > 0) {
      const bounds = L.latLngBounds(properties.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [properties, map, navigate]);

  return null;
};

const MapComponent: FunctionComponent<Props> = ({ properties }) => {
  return (
    <MapContainer
      center={[43.238949, 76.889709]}
      zoom={13}
      style={{ height: "100%", width: "100%", zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <ClusterLayer properties={properties} />
    </MapContainer>
  );
};

export default MapComponent;
