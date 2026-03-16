import { useState, type FunctionComponent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "../css/PropertyDetails.module.css";
import MapComponent, { type Property } from "../components/MapComponent";

const mockProperties: Record<string, Property & { description: string; type: string; buildYear: number; bathrooms: number; floor: string; images: string[] }> = {
  "1": {
    id: "1",
    title: "Двухкомнатная квартира в центре",
    price: 12500000,
    address: "ул. Абая, 150, Алматы",
    lat: 43.238949,
    lng: 76.889709,
    rooms: 2,
    area: 65,
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    description: "Светлая и уютная двухкомнатная квартира в самом центре города. Отличная транспортная развязка, развитая инфраструктура: школы, детские сады, супермаркеты в шаговой доступности. Свежий ремонт, мебель и техника остаются по договоренности.",
    type: "Квартира",
    buildYear: 2015,
    bathrooms: 1,
    floor: "3 из 10",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ]
  },
  "2": {
    id: "2",
    title: "Коммерческое помещение",
    price: 32000000,
    address: "пр. Гагарина, 124, Алматы",
    lat: 43.220198,
    lng: 76.899661,
    rooms: 0,
    area: 120,
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    description: "Коммерческое помещение под офис, магазин или кафе. Отдельный вход, парковка, высокий трафик. Все коммуникации подведены.",
    type: "Коммерческая",
    buildYear: 2018,
    bathrooms: 2,
    floor: "1 из 5",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
    ]
  }
};

const PropertyDetails: FunctionComponent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  const property = id ? mockProperties[id] : mockProperties["2"];

  if (!property) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← Назад
          </button>
        </div>
        <div style={{ padding: 32 }}>Объект не найден</div>
      </div>
    );
  }

  const handlePrevImage = () => {
    setCurrentImageIdx(prev => (prev === 0 ? property.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIdx(prev => (prev === property.images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← {property.title}
        </button>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn}>
            <img src="/assets/favorites.svg" alt="Like" style={{ width: 20 }} />
          </button>
          <button className={styles.iconBtn}>
            <img src="/assets/share.svg" alt="Share" style={{ width: 20 }} />
          </button>
        </div>
      </header>

      <div className={styles.mainContent}>
        {/* Left Column */}
        <div className={styles.leftColumn}>
          
          <div className={styles.gallery}>
            <div className={styles.mainImageWrapper}>
              {property.images.length > 1 && (
                <button className={`${styles.sliderArrow} ${styles.sliderArrowLeft}`} onClick={handlePrevImage}>
                  ←
                </button>
              )}
              <img src={property.images[currentImageIdx]} alt={property.title} className={styles.mainImage} />
              {property.images.length > 1 && (
                <button className={`${styles.sliderArrow} ${styles.sliderArrowRight}`} onClick={handleNextImage}>
                  →
                </button>
              )}
            </div>
            
            <div className={styles.thumbnailList}>
              {property.images.map((img, idx) => (
                <img 
                  key={idx}
                  src={img} 
                  alt={`Thumbnail ${idx}`} 
                  className={`${styles.thumbnail} ${idx === currentImageIdx ? styles.thumbnailActive : ''}`}
                  onClick={() => setCurrentImageIdx(idx)}
                />
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Описание</div>
            <div className={styles.description}>{property.description}</div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Характеристики</div>
            <div className={styles.grid}>
              
              <div className={styles.gridItem}>
                <div className={styles.gridIconWrapper}>
                  <img src="/assets/room.svg" alt="" className={styles.gridIcon} />
                </div>
                <div className={styles.gridText}>
                  <span className={styles.gridLabel}>Комнат</span>
                  <span className={styles.gridValue}>{property.rooms}</span>
                </div>
              </div>

              <div className={styles.gridItem}>
                <div className={styles.gridIconWrapper}>
                  <img src="/assets/area.svg" alt="" className={styles.gridIcon} />
                </div>
                <div className={styles.gridText}>
                  <span className={styles.gridLabel}>Площадь</span>
                  <span className={styles.gridValue}>{property.area} м²</span>
                </div>
              </div>

              <div className={styles.gridItem}>
                <div className={styles.gridIconWrapper}>
                  <img src="/assets/bath.svg" alt="" className={styles.gridIcon} />
                </div>
                <div className={styles.gridText}>
                  <span className={styles.gridLabel}>Санузлов</span>
                  <span className={styles.gridValue}>{property.bathrooms}</span>
                </div>
              </div>

              <div className={styles.gridItem}>
                <div className={styles.gridIconWrapper}>
                  <img src="/assets/floor.svg" alt="" className={styles.gridIcon} />
                </div>
                <div className={styles.gridText}>
                  <span className={styles.gridLabel}>Этаж</span>
                  <span className={styles.gridValue}>{property.floor}</span>
                </div>
              </div>

              <div className={styles.gridItem}>
                <div className={styles.gridIconWrapper}>
                  <img src="/assets/calendar.svg" alt="" className={styles.gridIcon} />
                </div>
                <div className={styles.gridText}>
                  <span className={styles.gridLabel}>Год постройки</span>
                  <span className={styles.gridValue}>{property.buildYear}</span>
                </div>
              </div>

              <div className={styles.gridItem}>
                <div className={styles.gridIconWrapper}>
                  <img src="/assets/property_type.svg" alt="" className={styles.gridIcon} />
                </div>
                <div className={styles.gridText}>
                  <span className={styles.gridLabel}>Тип недвижимости</span>
                  <span className={styles.gridValue}>{property.type}</span>
                </div>
              </div>

            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Особенности</div>
            <div className={styles.featuresList}>
              <div className={styles.featureItem}><div className={styles.featureDot} /> Отдельный вход</div>
              <div className={styles.featureItem}><div className={styles.featureDot} /> Парковка</div>
              <div className={styles.featureItem}><div className={styles.featureDot} /> Витражные окна</div>
              <div className={styles.featureItem}><div className={styles.featureDot} /> Охрана</div>
            </div>
          </div>

          <div className={styles.mapSection}>
            <div className={styles.mapHeader}>
              <div className={styles.mapTitle}>
                <div className={styles.mapTitleIconWrapper}>
                  <img src="/assets/location.svg" alt="" style={{ width: 16, height: 16, filter: 'invert(52%) sepia(85%) saturate(1636%) hue-rotate(192deg) brightness(101%) contrast(101%)' }} />
                </div>
                Расположение
              </div>
              <div className={styles.mapSubtitle}>{property.address}</div>
            </div>
            <div className={styles.mapContainer}>
              <MapComponent properties={[property]} />
              <div className={styles.coordinateBadge}>
                {property.lat.toFixed(6)}, {property.lng.toFixed(6)}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          <div className={styles.priceCard}>
            <div className={styles.price}>{property.price.toLocaleString("ru-RU")} ₸</div>
            
            <div className={styles.agencyInfo}>
              <div className={styles.agencyLogo}>
                <img src="/assets/avatar.svg" alt="Agency Logo" style={{ width: 48, height: 48 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className={styles.agencyName}>Бизнес Недвижимость</span>
                <span className={styles.agencyType}>Агентство недвижимости</span>
              </div>
            </div>

            <div className={styles.actionBtns}>
              <button className={styles.btnPrimary}>
                <img src="/assets/phone.svg" alt="Call" style={{ width: 20, filter: 'brightness(0) invert(1)' }} />
                Позвонить
              </button>
              <button className={styles.btnSecondary}>
                <img src="/assets/send.svg" alt="Message" style={{ width: 20, filter: 'brightness(0) invert(1)' }} />
                Написать
              </button>
            </div>

            <div className={styles.contactInfo}>
              <div className={styles.contactRow}>
                <img src="/assets/phone.svg" alt="Phone" className={styles.contactIcon} />
                +7 (777) 456-78-90
              </div>
              <div className={styles.contactRow}>
                <img src="/assets/send.svg" alt="Email" className={styles.contactIcon} />
                info@business-estate.kz
              </div>
            </div>

            <div className={styles.addressRow}>
              <img src="/assets/location.svg" alt="Location" className={styles.contactIcon} style={{ opacity: 1 }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className={styles.addressTitle}>Алмалинский</span>
                <span>{property.address}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PropertyDetails;
