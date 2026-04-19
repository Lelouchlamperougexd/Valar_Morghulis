import { useState, useEffect, useCallback, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Catalog.module.css";
import type { Property } from "../components/MapComponent";
import MapComponent from "../components/MapComponent";
import { getListings, type CatalogListing } from "../api/dashboard";

// City center coordinates for radius filtering
const CITY_CENTERS: Record<string, [number, number]> = {
  "Алматы": [43.238949, 76.889709],
  "Астана": [51.1605, 71.4704],
  "Шымкент": [42.3417, 69.5901],
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Slight random jitter so co-located markers don't stack perfectly
function jitter(coord: number): number {
  return coord + (Math.random() - 0.5) * 0.008;
}

function listingToProperty(l: CatalogListing): Property | null {
  // Use real coordinates if available, else fall back to city center
  let lat: number;
  let lng: number;
  if (l.latitude != null && l.longitude != null) {
    lat = l.latitude;
    lng = l.longitude;
  } else {
    const center = CITY_CENTERS[l.city];
    if (!center) return null; // can't place on map at all
    lat = jitter(center[0]);
    lng = jitter(center[1]);
  }
  return {
    id: String(l.id),
    title: l.title,
    price: l.price,
    address: l.address || l.city,
    lat,
    lng,
    rooms: l.rooms ?? 0,
    area: l.area ?? 0,
    imageUrl: l.media?.[0]?.url || "https://placehold.co/600x400?text=Нет+фото",
  };
}

const PROPERTY_TYPES = [
  { value: "", label: "Все типы" },
  { value: "apartment", label: "Квартира" },
  { value: "house", label: "Дом" },
  { value: "studio", label: "Студия" },
  { value: "commercial", label: "Коммерческое" },
  { value: "land", label: "Земля" },
];

const DEAL_TYPES = [
  { value: "", label: "Любой" },
  { value: "rent", label: "Аренда" },
  { value: "sale", label: "Продажа" },
];

const CITIES = ["", "Алматы", "Астана", "Шымкент"];

const Catalog: FunctionComponent = () => {
  const navigate = useNavigate();

  // Filter state (draft — what's in the UI controls)
  const [city, setCity] = useState("");
  const [dealType, setDealType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [rooms, setRooms] = useState("");
  const [radius, setRadius] = useState(5);

  // Results
  const [listings, setListings] = useState<CatalogListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchListings = useCallback(
    async (params: {
      city: string; dealType: string; propertyType: string;
      priceMin: string; priceMax: string; rooms: string;
    }) => {
      setLoading(true);
      setError("");
      try {
        const filter: Parameters<typeof getListings>[0] = {};
        if (params.city)         filter.city          = params.city;
        if (params.dealType)     filter.deal_type     = params.dealType;
        if (params.propertyType) filter.property_type = params.propertyType;
        if (params.priceMin && !isNaN(Number(params.priceMin))) filter.price_min = Number(params.priceMin);
        if (params.priceMax && !isNaN(Number(params.priceMax))) filter.price_max = Number(params.priceMax);
        // Rooms: map to rooms_min / rooms_max
        if (params.rooms === "1") { filter.rooms_min = 1; filter.rooms_max = 1; }
        else if (params.rooms === "2") { filter.rooms_min = 2; filter.rooms_max = 2; }
        else if (params.rooms === "3+") { filter.rooms_min = 3; }
        const data = await getListings(filter);
        setListings(data);
      } catch {
        setError("Не удалось загрузить объявления. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load — no filters
  useEffect(() => {
    fetchListings({ city, dealType, propertyType, priceMin, priceMax, rooms });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    fetchListings({ city, dealType, propertyType, priceMin, priceMax, rooms });
  };

  const handleReset = () => {
    setCity("");
    setDealType("");
    setPropertyType("");
    setPriceMin("");
    setPriceMax("");
    setRooms("");
    setRadius(5);
    fetchListings({ city: "", dealType: "", propertyType: "", priceMin: "", priceMax: "", rooms: "" });
  };

  // Apply radius filtering client-side (only for listings with coordinates)
  const cityCenter = city ? CITY_CENTERS[city] : null;
  const filtered = listings.filter((l) => {
    if (!cityCenter || l.latitude == null || l.longitude == null) return true;
    return haversineKm(cityCenter[0], cityCenter[1], l.latitude, l.longitude) <= radius;
  });

  // All filtered listings go on the map; city center used as fallback when no coordinates
  const mapProperties: Property[] = filtered
    .map(listingToProperty)
    .filter((p): p is Property => p !== null);

  return (
    <div className={styles.catalogPage}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={() => navigate("/")}>
            ← <span style={{ marginLeft: 8 }}>Каталог объектов</span>
          </button>
        </div>
        <div className={styles.resultCount}>
          {loading
            ? "Загрузка..."
            : error
            ? "Ошибка загрузки"
            : `Найдено: ${filtered.length} объектов`}
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.content}>

        {/* Map Area */}
        <div className={styles.mapContainer}>
          {error ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", color: "#f5222d", fontFamily: "Inter, sans-serif", fontSize: 14,
            }}>
              {error}
            </div>
          ) : (
            <MapComponent properties={mapProperties} />
          )}
        </div>

        {/* Filters Sidebar */}
        <div className={styles.filtersContainer}>
          <div className={styles.filtersHeader}>
            <img src="/assets/filter.svg" alt="" style={{ width: 18 }} />
            Фильтры
          </div>

          <div className={styles.filtersBody}>
            {/* City */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Город</div>
              <select className={styles.select} value={city} onChange={e => setCity(e.target.value)}>
                <option value="">Все города</option>
                {CITIES.filter(c => c).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Deal type */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Тип сделки</div>
              <select className={styles.select} value={dealType} onChange={e => setDealType(e.target.value)}>
                {DEAL_TYPES.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Property type */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Тип недвижимости</div>
              <select className={styles.select} value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                {PROPERTY_TYPES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Цена, ₸</div>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="От"
                  value={priceMin}
                  onChange={e => setPriceMin(e.target.value)}
                  min={0}
                />
                <input
                  type="number"
                  className={styles.input}
                  placeholder="До"
                  value={priceMax}
                  onChange={e => setPriceMax(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            {/* Radius */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>
                Радиус поиска{!city && <span style={{ color: "#aaa", fontSize: 11, marginLeft: 4 }}>(выберите город)</span>}
              </div>
              <div className={styles.radioGroup}>
                {[1, 3, 5, 10].map(val => (
                  <button
                    key={val}
                    className={`${styles.radioBtn} ${radius === val ? styles.radioBtnActive : ""}`}
                    onClick={() => setRadius(val)}
                    disabled={!city}
                    style={{ opacity: city ? 1 : 0.45 }}
                  >
                    {val} км
                  </button>
                ))}
              </div>
            </div>

            {/* Rooms */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Комнат</div>
              <select className={styles.select} value={rooms} onChange={e => setRooms(e.target.value)}>
                <option value="">Любое</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3+">3+</option>
              </select>
            </div>

            <div className={styles.actionButtons}>
              <button
                className={styles.btnPrimary}
                onClick={handleApply}
                disabled={loading}
              >
                {loading ? "..." : "Применить"}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={handleReset}
                disabled={loading}
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
