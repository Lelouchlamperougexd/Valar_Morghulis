import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Catalog.module.css";
import type { Property } from "../components/MapComponent";
import MapComponent from "../components/MapComponent";

const mockProperties: Property[] = [
  {
    id: "1",
    title: "Двухкомнатная квартира в центре",
    price: 12500000,
    address: "ул. Абая, 150, Алматы",
    lat: 43.238949,
    lng: 76.889709,
    rooms: 2,
    area: 65,
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "2",
    title: "Коммерческое помещение",
    price: 32000000,
    address: "пр. Гагарина, 124, Алматы",
    lat: 43.220198,
    lng: 76.899661,
    rooms: 5,
    area: 120,
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "3",
    title: "Квартира студия",
    price: 8500000,
    address: "ул. Розыбакиева, Алматы",
    lat: 43.210452,
    lng: 76.891398,
    rooms: 1,
    area: 40,
    imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
  }
];

const Catalog: FunctionComponent = () => {
  const navigate = useNavigate();
  const [radius, setRadius] = useState<number>(5);
  const [propertyType, setPropertyType] = useState<string>("all");

  return (
    <div className={styles.catalogPage}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={() => navigate("/")}>
            ← <span style={{ marginLeft: 8 }}>Каталог объектов</span>
          </button>
        </div>
        <div className={styles.resultCount}>Найдено: 6 объектов</div>
      </header>

      {/* Main Content */}
      <div className={styles.content}>
        
        {/* Map Area */}
        <div className={styles.mapContainer}>
          <MapComponent properties={mockProperties} />
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
              <select className={styles.select}>
                <option value="almaty">Алматы</option>
                <option value="astana">Астана</option>
              </select>
            </div>

            {/* Type */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Тип недвижимости</div>
              <select className={styles.select} value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                <option value="all">Все типы</option>
                <option value="apartment">Квартира</option>
                <option value="commercial">Коммерческая</option>
                <option value="house">Дом</option>
              </select>
            </div>

            {/* Price */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Цена, ₸</div>
              <div className={styles.inputGroup}>
                <input type="number" className={styles.input} placeholder="От" />
                <input type="number" className={styles.input} placeholder="До" />
              </div>
            </div>

            {/* Radius */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Радиус поиска</div>
              <div className={styles.radioGroup}>
                {[1, 3, 5, 10].map(val => (
                  <button 
                    key={val}
                    className={`${styles.radioBtn} ${radius === val ? styles.radioBtnActive : ''}`}
                    onClick={() => setRadius(val)}
                  >
                    {val} км
                  </button>
                ))}
              </div>
            </div>

            {/* Rooms */}
            <div className={styles.filterGroup}>
              <div className={styles.filterLabel}>Комнат</div>
              <select className={styles.select}>
                <option value="any">Любое</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3+</option>
              </select>
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.btnPrimary}>Применить</button>
              <button className={styles.btnSecondary} onClick={() => {
                setRadius(5);
                setPropertyType("all");
              }}>Сбросить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
