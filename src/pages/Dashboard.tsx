import { useState, useRef, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import styles from "../css/Dashboard.module.css";
import type { Property } from "../components/MapComponent";

// ─── Mock Data ────────────────────────────────────────────────────────────────

interface ExtendedProperty extends Property {
  dealType: "Аренда" | "Продажа";
  priceUnit?: string;       // « /мес » for rent
  deposit?: string;         // security deposit for rent
  utilities?: string;       // included / extra
  minTerm?: string;         // min rental term
  propertyType: string;     // квартира / студия / апартаменты / дом
  floor: number;
  totalFloors: number;
  livingArea?: number;
  kitchenArea?: number;
  ceilingH?: string;
  renovation: string;       // тип ремонта
  buildingType: string;     // панельный / кирпичный / монолит
  yearBuilt?: number;
  bathroom: string;         // раздельный / совмещённый / 2 санузла
  balcony?: string;         // балкон / лоджия / нет
  parking?: string;
  elevator?: string;
  amenities: string[];      // мебель, техника, интернет …
  restrictions?: string[];  // без животных, без детей …
  metro?: string;
  metroWalk?: string;
  agency: string;
  agencyPhone: string;
  description: string;
}

const mockFavorites: ExtendedProperty[] = [
  {
    id: "1",
    title: "Двухкомнатная квартира в центре",
    dealType: "Продажа",
    propertyType: "Квартира",
    price: 12500000,
    address: "Москва, ЦАО, ул. Тверская, 18",
    metro: "Тверская", metroWalk: "5 мин пешком",
    lat: 55.7558, lng: 37.6173,
    rooms: 2,
    area: 65, livingArea: 40, kitchenArea: 12,
    floor: 5, totalFloors: 12,
    ceilingH: "2.85 м",
    renovation: "Евроремонт",
    buildingType: "Монолит",
    yearBuilt: 2019,
    bathroom: "Раздельный",
    balcony: "Балкон застеклённый",
    parking: "Подземный паркинг",
    elevator: "2 лифта (пассажирский + грузовой)",
    amenities: ["Встроенная кухня", "Вся бытовая техника", "Кондиционер", "Wi-Fi"],
    agency: "Элит Недвижимость",
    agencyPhone: "+7 (495) 123-45-67",
    description: "Просторная квартира в монолитном доме бизнес-класса. Панорамные окна с видом на центр города. Качественный авторский ремонт, встроенная мебель, вся техника. Закрытая охраняемая территория, видеонаблюдение. Инфраструктура: ТЦ, рестораны, школы — в пешей доступности.",
    imageUrl: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "2",
    title: "Трёхкомнатная квартира с видом",
    dealType: "Аренда",
    propertyType: "Квартира",
    price: 85000,
    priceUnit: "/мес",
    deposit: "85 000 ₸ (1 месяц)",
    utilities: "Коммунальные платежи — отдельно (~12 000 ₸)",
    minTerm: "От 6 месяцев",
    address: "Москва, ЮЗАО, Ленинский пр-т, 91",
    metro: "Проспект Вернадского", metroWalk: "8 мин пешком",
    lat: 55.6628, lng: 37.5303,
    rooms: 3,
    area: 92, livingArea: 60, kitchenArea: 18,
    floor: 8, totalFloors: 17,
    ceilingH: "3.0 м",
    renovation: "Дизайнерский ремонт",
    buildingType: "Монолит-кирпич",
    yearBuilt: 2021,
    bathroom: "2 санузла",
    balcony: "Две лоджии",
    parking: "1 место в паркинге включено",
    elevator: "Есть",
    amenities: ["Полностью меблирована", "Вся техника", "Посудомойка", "Интернет включён", "Кондиционер"],
    restrictions: ["Без животных", "Некурящая квартира"],
    agency: "ПремьерГрад",
    agencyPhone: "+7 (499) 234-56-78",
    description: "Роскошная квартира с панорамным видом на Москву-реку. Авторский дизайн-проект, полностью меблирована. Жилой комплекс бизнес-класса с охраной, консьерж-сервисом и подземным паркингом. Идеальна для семьи с детьми.",
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "3",
    title: "Студия в новостройке",
    dealType: "Аренда",
    propertyType: "Студия",
    price: 45000,
    priceUnit: "/мес",
    deposit: "45 000 ₸ (1 месяц)",
    utilities: "Все коммунальные включены в стоимость",
    minTerm: "От 3 месяцев",
    address: "Москва, САО, Дмитровское ш., 13к2",
    metro: "Дмитровская", metroWalk: "12 мин пешком",
    lat: 55.8158, lng: 37.5193,
    rooms: 1,
    area: 35, kitchenArea: 8,
    floor: 3, totalFloors: 25,
    ceilingH: "2.75 м",
    renovation: "Чистовая отделка",
    buildingType: "Монолит",
    yearBuilt: 2023,
    bathroom: "Совмещённый",
    balcony: "Французский балкон",
    parking: "Гостевая парковка",
    elevator: "Есть",
    amenities: ["Кровать", "Шкаф", "Холодильник", "Стиральная машина", "Кондиционер", "Wi-Fi"],
    restrictions: ["Можно с кошками", "Без курения"],
    agency: "Столичная Недвижимость",
    agencyPhone: "+7 (495) 345-67-89",
    description: "Уютная студия в новом ЖК. Современная чистовая отделка, базовая мебель и техника. Тихий двор, охраняемая парковка. Отличный вариант для молодого специалиста или студента.",
    imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
  }
];


interface ApplicationData {
  id: number;
  title: string;
  subtitle: string;
  status: string;
  statusClass: string;
  date: string;
  // Filled form answers
  answers: {
    name: string;
    phone: string;
    email: string;
    moveDate: string;
    duration: string;
    family: string;
    pets: string;
    income: string;
    comment: string;
  };
}

const mockApplications: ApplicationData[] = [
  {
    id: 1,
    title: "Двухкомнатная квартира в центре",
    subtitle: "Элит Недвижимость",
    status: "В обработке",
    statusClass: styles.statusPending,
    date: "15.02.2026",
    answers: {
      name: "Иван Петров",
      phone: "+7 (999) 123-45-67",
      email: "ivan.petrov@email.com",
      moveDate: "01.03.2026",
      duration: "12 месяцев",
      family: "2 человека (я и супруга)",
      pets: "Нет",
      income: "Официально трудоустроен, доход 180 000 ₸/мес",
      comment: "Рассматриваю долгосрочную аренду. Готов предоставить документы."
    }
  },
  {
    id: 2,
    title: "Студия в новостройке",
    subtitle: "ПремьерГрад",
    status: "Получен ответ",
    statusClass: styles.statusResponded,
    date: "13.02.2026",
    answers: {
      name: "Иван Петров",
      phone: "+7 (999) 123-45-67",
      email: "ivan.petrov@email.com",
      moveDate: "15.02.2026",
      duration: "6 месяцев",
      family: "1 человек (только я)",
      pets: "Кошка",
      income: "Фрилансер, средний доход 120 000 ₸/мес",
      comment: "Интересует студия для работы из дома. Тихий район приоритет."
    }
  },
  {
    id: 3,
    title: "Трёхкомнатная квартира",
    subtitle: "Столичная Недвижимость",
    status: "Закрыта",
    statusClass: styles.statusClosed,
    date: "10.02.2026",
    answers: {
      name: "Иван Петров",
      phone: "+7 (999) 123-45-67",
      email: "ivan.petrov@email.com",
      moveDate: "20.02.2026",
      duration: "24 месяца",
      family: "4 человека (семья с детьми)",
      pets: "Нет",
      income: "Официально трудоустроен, доход 250 000 ₸/мес",
      comment: "Нужна квартира рядом со школой № 15."
    }
  }
];

interface ChatMessage {
  id: number;
  text: string;
  time: string;
  isSent: boolean;
}

interface Chat {
  id: number;
  sender: string;
  preview: string;
  date: string;
  hasIndicator: boolean;
  messages: ChatMessage[];
}

const initialChats: Chat[] = [
  {
    id: 1,
    sender: "Элит Недвижимость",
    preview: "Здравствуйте! Когда удобно посмотреть квартиру?",
    date: "14:30",
    hasIndicator: true,
    messages: [
      { id: 1, text: "Здравствуйте! Когда удобно посмотреть квартиру?", time: "14:30", isSent: false },
      { id: 2, text: "Спасибо за информацию!", time: "14:35", isSent: true }
    ]
  },
  {
    id: 2,
    sender: "ПремьерГрад",
    preview: "Отправили вам дополнительные фотографии.",
    date: "Вчера",
    hasIndicator: false,
    messages: [
      { id: 1, text: "Отправили вам дополнительные фотографии.", time: "Вчера", isSent: false }
    ]
  }
];

type TabId = "overview" | "favorites" | "applications" | "messages" | "settings";

// ─── Application Form Modal ───────────────────────────────────────────────────

interface AppFormModalProps {
  propertyTitle: string;
  onClose: () => void;
  onSubmit: (answers: ApplicationData["answers"]) => void;
}

function ApplicationFormModal({ propertyTitle, onClose, onSubmit }: AppFormModalProps) {
  const [form, setForm] = useState({
    name: "Иван Петров",
    phone: "+7 (999) 123-45-67",
    email: "ivan.petrov@email.com",
    moveDate: "",
    duration: "6 месяцев",
    family: "",
    pets: "Нет",
    income: "",
    comment: ""
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1.5px solid #e8e8e8", fontSize: 13, fontFamily: "Inter, sans-serif",
    outline: "none", boxSizing: "border-box", color: "#3a3a3a"
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: "#939393", textTransform: "uppercase",
    letterSpacing: "0.4px", marginBottom: 5, display: "block", fontWeight: 500
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540,
        maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#1a1a2e" }}>Подать заявку</div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 2 }}>{propertyTitle}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#939393", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Имя</label>
              <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="Ваше имя" />
            </div>
            <div>
              <label style={labelStyle}>Телефон</label>
              <input style={inputStyle} value={form.phone} onChange={set("phone")} placeholder="+7 (___)___-__-__" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.email} onChange={set("email")} placeholder="email@example.com" type="email" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Желаемая дата въезда</label>
              <input style={inputStyle} value={form.moveDate} onChange={set("moveDate")} placeholder="дд.мм.гггг" />
            </div>
            <div>
              <label style={labelStyle}>Срок аренды</label>
              <select style={{ ...inputStyle, background: "#fff" }} value={form.duration} onChange={set("duration")}>
                <option>3 месяца</option>
                <option>6 месяцев</option>
                <option>12 месяцев</option>
                <option>24 месяца</option>
                <option>Бессрочно</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Состав семьи / кто будет проживать</label>
            <input style={inputStyle} value={form.family} onChange={set("family")} placeholder="Например: 2 взрослых, 1 ребёнок" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Домашние животные</label>
              <select style={{ ...inputStyle, background: "#fff" }} value={form.pets} onChange={set("pets")}>
                <option>Нет</option>
                <option>Кошка</option>
                <option>Собака</option>
                <option>Другое</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Источник дохода</label>
              <input style={inputStyle} value={form.income} onChange={set("income")} placeholder="Трудоустроен, фриланс..." />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Дополнительный комментарий</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={form.comment}
              onChange={set("comment")}
              placeholder="Любые пожелания или вопросы..."
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button
              onClick={() => onSubmit(form)}
              style={{
                flex: 1, padding: "12px 0", background: "#70a0ff", color: "#fff",
                border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "Inter, sans-serif"
              }}
            >
              Отправить заявку
            </button>
            <button onClick={onClose} style={{
              padding: "12px 20px", background: "#f5f5f5", color: "#3a3a3a",
              border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer",
              fontFamily: "Inter, sans-serif"
            }}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Property Card Modal ──────────────────────────────────────────────────────

interface PropertyModalProps {
  property: ExtendedProperty;
  onClose: () => void;
  onApply: () => void;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", background: "#f0f4ff",
      color: "#70a0ff", border: "1px solid #c2d6ff", borderRadius: 20,
      fontSize: 12, fontWeight: 500, whiteSpace: "nowrap"
    }}>{children}</span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "#939393", fontWeight: 600, marginBottom: 8, marginTop: 20 }}>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13 }}>
      <span style={{ color: "#939393" }}>{label}</span>
      <span style={{ color: "#3a3a3a", fontWeight: 500, textAlign: "right", maxWidth: "58%" }}>{value}</span>
    </div>
  );
}

function PropertyModal({ property: p, onClose, onApply }: PropertyModalProps) {
  const [tab, setTab] = useState<"info" | "building" | "rent">("info");
  const tabs = [
    { id: "info" as const, label: "Объект" },
    { id: "building" as const, label: "Дом" },
    ...(p.dealType === "Аренда" ? [{ id: "rent" as const, label: "Аренда" }] : []),
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>

        {/* Photo */}
        <div style={{ position: "relative" }}>
          <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: 210, objectFit: "cover", borderRadius: "16px 16px 0 0", display: "block" }} />
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
          <div style={{ position: "absolute", bottom: 12, left: 14, background: p.dealType === "Аренда" ? "#70a0ff" : "#52c97a", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{p.dealType}</div>
        </div>

        <div style={{ padding: "18px 22px 24px" }}>
          {/* Title & price */}
          <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.4px", color: "#939393", marginBottom: 4 }}>{p.propertyType} · {p.address}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>{p.title}</div>
          {p.metro && <div style={{ fontSize: 12, color: "#939393", marginBottom: 10 }}>🚇 {p.metro} — {p.metroWalk}</div>}

          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#70a0ff" }}>{p.price.toLocaleString("ru-RU")} ₸</span>
            {p.priceUnit && <span style={{ fontSize: 14, color: "#939393" }}>{p.priceUnit}</span>}
          </div>

          {/* Key stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { v: p.rooms, l: "Комнат" },
              { v: `${p.area} м²`, l: "Общая" },
              { v: p.livingArea ? `${p.livingArea} м²` : "—", l: "Жилая" },
              { v: `${p.floor}/${p.totalFloors}`, l: "Этаж" },
            ].map(it => (
              <div key={it.l} style={{ background: "#f7f9fa", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>{it.v}</div>
                <div style={{ fontSize: 10, color: "#939393", marginTop: 2 }}>{it.l}</div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 2, borderBottom: "1.5px solid #f0f0f0", paddingBottom: 0 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "7px 14px", fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? "#70a0ff" : "#939393",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: tab === t.id ? "2px solid #70a0ff" : "2px solid transparent",
                fontFamily: "Inter, sans-serif", marginBottom: -1.5, transition: "all .15s"
              }}>{t.label}</button>
            ))}
          </div>

          {/* Tab: Object */}
          {tab === "info" && (
            <div>
              <SectionLabel>Планировка и площадь</SectionLabel>
              <InfoRow label="Тип" value={p.propertyType} />
              <InfoRow label="Комнат" value={p.rooms} />
              <InfoRow label="Общая площадь" value={`${p.area} м²`} />
              {p.livingArea && <InfoRow label="Жилая площадь" value={`${p.livingArea} м²`} />}
              {p.kitchenArea && <InfoRow label="Площадь кухни" value={`${p.kitchenArea} м²`} />}
              {p.ceilingH && <InfoRow label="Высота потолков" value={p.ceilingH} />}
              <InfoRow label="Этаж" value={`${p.floor} из ${p.totalFloors}`} />

              <SectionLabel>Отделка и интерьер</SectionLabel>
              <InfoRow label="Ремонт" value={p.renovation} />
              <InfoRow label="Санузел" value={p.bathroom} />
              {p.balcony && <InfoRow label="Балкон / лоджия" value={p.balcony} />}
              {p.parking && <InfoRow label="Парковка" value={p.parking} />}
              {p.elevator && <InfoRow label="Лифт" value={p.elevator} />}

              {p.amenities.length > 0 && (
                <>
                  <SectionLabel>Удобства</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {p.amenities.map(a => <Chip key={a}>{a}</Chip>)}
                  </div>
                </>
              )}

              <SectionLabel>Описание</SectionLabel>
              <div style={{ fontSize: 13, color: "#3a3a3a", lineHeight: 1.65 }}>{p.description}</div>
            </div>
          )}

          {/* Tab: Building */}
          {tab === "building" && (
            <div>
              <SectionLabel>О доме</SectionLabel>
              <InfoRow label="Тип дома" value={p.buildingType} />
              {p.yearBuilt && <InfoRow label="Год постройки" value={p.yearBuilt} />}
              <InfoRow label="Этажей в доме" value={p.totalFloors} />
              {p.elevator && <InfoRow label="Лифт" value={p.elevator} />}
              {p.parking && <InfoRow label="Парковка" value={p.parking} />}

              <SectionLabel>Расположение</SectionLabel>
              <InfoRow label="Адрес" value={p.address} />
              {p.metro && <InfoRow label="Метро" value={`${p.metro} (${p.metroWalk})`} />}
            </div>
          )}

          {/* Tab: Rent conditions */}
          {tab === "rent" && p.dealType === "Аренда" && (
            <div>
              <SectionLabel>Условия аренды</SectionLabel>
              <InfoRow label="Арендная плата" value={`${p.price.toLocaleString("ru-RU")} ₸/мес`} />
              {p.deposit && <InfoRow label="Залог" value={p.deposit} />}
              {p.utilities && <InfoRow label="Коммунальные" value={p.utilities} />}
              {p.minTerm && <InfoRow label="Минимальный срок" value={p.minTerm} />}

              {p.restrictions && p.restrictions.length > 0 && (
                <>
                  <SectionLabel>Ограничения</SectionLabel>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {p.restrictions.map(r => (
                      <span key={r} style={{ display: "inline-block", padding: "3px 10px", background: "#fff1f0", color: "#cf1322", border: "1px solid #ffa39e", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{r}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Agency & CTA */}
          <div style={{ marginTop: 20, padding: "14px 16px", background: "#f7f9fa", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "#939393" }}>Агентство</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{p.agency}</div>
              <div style={{ fontSize: 12, color: "#70a0ff" }}>{p.agencyPhone}</div>
            </div>
            <button onClick={onApply} style={{
              padding: "10px 20px", background: "#70a0ff", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap"
            }}>Подать заявку</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Application Detail Modal ─────────────────────────────────────────────────

function ApplicationDetailModal({ app, onClose }: { app: ApplicationData; onClose: () => void }) {
  const statusColors: Record<string, string> = {
    "В обработке": "#faad14",
    "Получен ответ": "#70a0ff",
    "Закрыта": "#d9d9d9"
  };

  const fields = [
    { label: "Имя", value: app.answers.name },
    { label: "Телефон", value: app.answers.phone },
    { label: "Email", value: app.answers.email },
    { label: "Желаемая дата въезда", value: app.answers.moveDate || "—" },
    { label: "Срок аренды", value: app.answers.duration },
    { label: "Состав семьи", value: app.answers.family || "—" },
    { label: "Домашние животные", value: app.answers.pets },
    { label: "Источник дохода", value: app.answers.income || "—" },
    { label: "Комментарий", value: app.answers.comment || "—" }
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>{app.title}</div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 2 }}>{app.subtitle} · {app.date}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#939393" }}>×</button>
        </div>

        <div style={{
          display: "inline-flex", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
          background: `${statusColors[app.status]}20`, color: statusColors[app.status],
          marginBottom: 20, border: `1px solid ${statusColors[app.status]}50`
        }}>
          {app.status}
        </div>

        <div style={{ fontSize: 12, color: "#939393", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 12, fontWeight: 500 }}>
          Данные из заявки
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {fields.map((f, i) => (
            <div key={f.label} style={{
              display: "flex", justifyContent: "space-between", gap: 16,
              padding: "10px 0", borderBottom: i < fields.length - 1 ? "1px solid #f5f5f5" : "none"
            }}>
              <span style={{ fontSize: 13, color: "#939393", flexShrink: 0 }}>{f.label}</span>
              <span style={{ fontSize: 13, color: "#3a3a3a", textAlign: "right" }}>{f.value}</span>
            </div>
          ))}
        </div>

        {app.status === "Получен ответ" && (
          <div style={{ marginTop: 20, padding: "14px 16px", background: "#eef4ff", borderRadius: 10, border: "1px solid #b0c9ff" }}>
            <div style={{ fontSize: 12, color: "#70a0ff", fontWeight: 600, marginBottom: 6 }}>Ответ от агентства</div>
            <div style={{ fontSize: 13, color: "#3a3a3a", lineHeight: 1.5 }}>
              Здравствуйте! Мы рассмотрели вашу заявку и готовы пригласить вас на просмотр. Пожалуйста, свяжитесь с нами по телефону для согласования времени.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const Dashboard: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Modals
  const [selectedProperty, setSelectedProperty] = useState<ExtendedProperty | null>(null);
  const [showAppForm, setShowAppForm] = useState(false);
  const [formProperty, setFormProperty] = useState<string>("");
  const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null);
  const [submittedApp, setSubmittedApp] = useState(false);

  // Chat state
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [chatMessage, setChatMessage] = useState("");

  // Settings state
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers ──

  const openProperty = (prop: ExtendedProperty) => setSelectedProperty(prop);

  const openAppForm = (title: string) => {
    setFormProperty(title);
    setSelectedProperty(null);
    setShowAppForm(true);
  };

  const handleAppSubmit = () => {
    setShowAppForm(false);
    setSubmittedApp(true);
    setTimeout(() => setSubmittedApp(false), 3000);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim() || activeChatId === null) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newMsg: ChatMessage = { id: Date.now(), text: chatMessage.trim(), time, isSent: true };
    setChats(prev => prev.map(c =>
      c.id === activeChatId ? { ...c, messages: [...c.messages, newMsg], preview: chatMessage.trim() } : c
    ));
    setChatMessage("");
  };

  const handleSavePassword = () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Пароль должен быть не менее 6 символов");
      return;
    }
    setPasswordError("");
    setIsEditingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setShowSettingsSaved(true);
    setTimeout(() => setShowSettingsSaved(false), 3000);
  };

  const saveSettings = () => {
    setShowSettingsSaved(true);
    setTimeout(() => setShowSettingsSaved(false), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result) setProfileImage(ev.target.result as string); };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const getStatusTag = (status: string, className: string) => (
    <div className={`${styles.statusTag} ${className}`}>{status}</div>
  );

  // ── Renderers ──

  const renderOverview = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}><img src="/assets/favorites.svg" alt="" style={{ width: 16 }} /> Избранное</div>
          <div className={styles.summaryValue}>3</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}><img src="/assets/applications.svg" alt="" style={{ width: 16 }} /> Активные заявки</div>
          <div className={styles.summaryValue}>2</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}><img src="/assets/messages.svg" alt="" style={{ width: 16 }} /> Сообщения</div>
          <div className={styles.summaryValue}>1</div>
        </div>
      </div>

      {/* Recently Viewed */}
      <div className={styles.cardListContainer}>
        <div className={styles.sectionTitle}>Недавно просмотренные</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {mockFavorites.slice(0, 2).map((item) => (
            <div
              key={item.id}
              className={styles.propertyListCard}
              style={{ cursor: "pointer" }}
              onClick={() => openProperty(item)}
            >
              <div className={styles.propertyInfoBlock}>
                <img src={item.imageUrl} alt={item.title} className={styles.propertyImage} />
                <div className={styles.propertyDetails}>
                  <div className={styles.propertyTitle}>{item.title}</div>
                  <div className={styles.propertySubtitle}>
                    <img src="/assets/location.svg" alt="" style={{ width: 12, marginRight: 4 }} />
                    {item.address}
                  </div>
                  <div className={styles.propertyPrice}>{item.price.toLocaleString("ru-RU")} ₸</div>
                </div>
              </div>
              <div className={styles.propertyMeta}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <img src="/assets/view.svg" alt="" style={{ width: 14 }} /> 245
                </div>
                <div>15.02.2026</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Applications */}
      <div className={styles.cardListContainer}>
        <div className={styles.sectionTitle}>Последние заявки</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mockApplications.slice(0, 2).map((app) => (
            <div key={app.id} className={styles.appCard} style={{ cursor: "pointer" }} onClick={() => setSelectedApp(app)}>
              <div className={styles.appInfo}>
                <div className={styles.appTitle}>{app.title}</div>
                <div className={styles.appSubtitle}>{app.subtitle}</div>
              </div>
              <div className={styles.appMeta}>
                {getStatusTag(app.status, app.statusClass)}
                <div className={styles.dateText}>{app.date}</div>
                <div className={styles.arrowRight}>{">"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFavorites = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={styles.sectionTitle} style={{ background: "#fff", padding: "24px 32px", borderRadius: 16, margin: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>Избранное</div>
      <div className={styles.favoritesGrid}>
        {mockFavorites.map((prop) => (
          <div key={prop.id} className={styles.favCard} style={{ cursor: "pointer" }} onClick={() => openProperty(prop)}>
            <img src={prop.imageUrl} alt={prop.title} className={styles.favImage} />
            <div className={styles.favInfo}>
              <div className={styles.favTitle}>{prop.title}</div>
              <div className={styles.favAddress}>
                <img src="/assets/location.svg" alt="" style={{ width: 12, opacity: 0.5, marginRight: 4 }} />
                {prop.address}
              </div>
              <div className={styles.favFooter}>
                <div className={styles.favPrice}>{prop.price.toLocaleString("ru-RU")} ₸</div>
                <div className={styles.favArea}>{prop.area} м²</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderApplications = () => (
    <div className={styles.cardListContainer} style={{ height: "fit-content" }}>
      <div className={styles.sectionTitle}>Мои заявки</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {mockApplications.map((app) => (
          <div key={app.id} className={styles.appCard} style={{ cursor: "pointer" }} onClick={() => setSelectedApp(app)}>
            <div className={styles.appInfo}>
              <div className={styles.appTitle}>{app.title}</div>
              <div className={styles.appSubtitle}>{app.subtitle}</div>
            </div>
            <div className={styles.appMeta}>
              {getStatusTag(app.status, app.statusClass)}
              <div className={styles.dateText}>{app.date}</div>
              <div className={styles.arrowRight}>{">"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const activeChat = chats.find(c => c.id === activeChatId);

  const renderChatWindow = () => {
    if (!activeChat) return null;
    return (
      <div className={styles.chatContainer}>
        <div className={styles.chatHeader}>
          <button className={styles.chatBackButton} onClick={() => setActiveChatId(null)}>←</button>
          <div className={styles.msgAvatar} style={{ width: 40, height: 40, fontSize: 16 }}>{activeChat.sender.charAt(0)}</div>
          <div className={styles.chatTitleGroup}>
            <div className={styles.chatTitle}>{activeChat.sender}</div>
            <div className={styles.chatSubtitle}>Арендодатель / В сети</div>
          </div>
        </div>
        <div className={styles.chatMessages}>
          {activeChat.messages.map(msg => (
            <div key={msg.id} className={`${styles.messageBubble} ${msg.isSent ? styles.messageSent : styles.messageReceived}`}>
              {msg.text}
              <div className={styles.messageTime}>{msg.time}</div>
            </div>
          ))}
        </div>
        <div className={styles.chatInputArea}>
          <input
            type="text"
            className={styles.chatInput}
            placeholder="Написать сообщение..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button className={styles.sendButton} onClick={handleSendMessage}>
            <img src="/assets/send.svg" alt="" style={{ width: 20, filter: "brightness(0) invert(1)" }} />
          </button>
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    if (activeChatId) return renderChatWindow();
    return (
      <div className={styles.cardListContainer} style={{ height: "fit-content" }}>
        <div className={styles.sectionTitle}>Сообщения</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {chats.map((msg) => (
            <div key={msg.id} className={styles.messageCard} onClick={() => setActiveChatId(msg.id)}>
              <div className={styles.msgLeft}>
                <div className={styles.msgAvatar}>{msg.sender.charAt(0)}</div>
                <div className={styles.msgContent}>
                  <div className={styles.msgSender}>{msg.sender}</div>
                  <div className={styles.msgPreview}>{msg.preview}</div>
                </div>
              </div>
              <div className={styles.msgRight}>
                <span>{msg.date}</span>
                {msg.hasIndicator && <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#70a0ff" }} />}
                <span className={styles.arrowRight}>{">"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={styles.settingsContainer}>
        <div className={styles.sectionTitle} style={{ marginBottom: 24 }}>Персональные данные</div>
        <div className={styles.profileSection}>
          <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
            {profileImage ? <img src={profileImage} alt="Profile" className={styles.avatarImage} /> : "И"}
            <div className={styles.avatarOverlay}>
              <img src="/assets/avatar.svg" alt="Upload" style={{ width: 24, filter: "brightness(0) invert(1)" }} />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className={styles.uploadInput} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: "#3a3a3a" }}>Фото профиля</div>
            <div style={{ fontSize: 13, color: "#737373", marginTop: 4 }}>Нажмите на аватар, чтобы загрузить новое фото</div>
          </div>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Имя</label>
            <input type="text" className={styles.formInput} defaultValue="Иван" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Фамилия</label>
            <input type="text" className={styles.formInput} defaultValue="Петров" />
          </div>
        </div>
        <div className={styles.formGroup} style={{ marginBottom: 20 }}>
          <label className={styles.formLabel}>Email</label>
          <input type="email" className={styles.formInput} defaultValue="ivan.petrov@email.com" />
        </div>
        <div className={styles.formGroup} style={{ marginBottom: 32 }}>
          <label className={styles.formLabel}>Телефон</label>
          <input type="tel" className={styles.formInput} defaultValue="+7 (999) 123-45-67" />
        </div>
        <button className={styles.btnPrimary} onClick={saveSettings}>Сохранить изменения</button>
      </div>

      <div className={styles.settingsContainer}>
        <div className={styles.sectionTitle} style={{ marginBottom: 24 }}>Безопасность</div>
        {!isEditingPassword ? (
          <button className={styles.btnSecondary} onClick={() => setIsEditingPassword(true)}>Изменить пароль</button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Старый пароль</label>
              <input type="password" className={styles.formInput} placeholder="••••••••" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Новый пароль</label>
              <input
                type="password"
                className={styles.formInput}
                placeholder="••••••••"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordError(""); }}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Подтверждение пароля</label>
              <input
                type="password"
                className={styles.formInput}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                style={{ borderColor: passwordError ? "#ff4d4f" : undefined }}
              />
              {passwordError && <div style={{ fontSize: 12, color: "#ff4d4f", marginTop: 4 }}>{passwordError}</div>}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button className={styles.btnPrimary} onClick={handleSavePassword}>Сохранить пароль</button>
              <button className={styles.btnSecondary} onClick={() => { setIsEditingPassword(false); setPasswordError(""); setNewPassword(""); setConfirmPassword(""); }}>Отмена</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return renderOverview();
      case "favorites": return renderFavorites();
      case "applications": return renderApplications();
      case "messages": return renderMessages();
      case "settings": return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <div className={styles.dashboardPage}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 32px", marginBottom: 24 }}>
          <img src={logo} alt="Qonys Logo" style={{ height: 32, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", letterSpacing: "-0.3px" }}>Qonys</span>
        </div>
        <button className={styles.backButton} onClick={() => navigate("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          На главную
        </button>
        <div className={styles.sidebarTitle}>Личный кабинет</div>
        <nav className={styles.navMenu}>
          {([
            { id: "overview", label: "Обзор", icon: "/assets/overview.svg" },
            { id: "favorites", label: "Избранное", icon: "/assets/favorites.svg" },
            { id: "applications", label: "Заявки", icon: "/assets/applications.svg" },
            { id: "messages", label: "Сообщения", icon: "/assets/messages.svg" },
          ] as { id: TabId; label: string; icon: string }[]).map(item => (
            <div
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <img src={item.icon} alt="" style={{ width: 18, opacity: activeTab === item.id ? 1 : 0.5 }} /> {item.label}
            </div>
          ))}
          <div
            className={`${styles.navItem} ${activeTab === "settings" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("settings")}
            style={{ marginTop: 16 }}
          >
            <img src="/assets/settings.svg" alt="" style={{ width: 18, opacity: activeTab === "settings" ? 1 : 0.5 }} /> Настройки
          </div>
        </nav>
        <div style={{ marginTop: "auto", padding: "16px 24px", borderTop: "1px solid #f0f0f0" }}>
          <div
            className={styles.navItem}
            style={{ color: "#f5222d", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            onClick={() => { logout(); navigate("/"); }}
          >
            <span style={{ display: "flex", alignItems: "center", opacity: 1 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </span>
            Выйти
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>{renderContent()}</main>

      {/* Modals */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onApply={() => openAppForm(selectedProperty.title)}
        />
      )}

      {showAppForm && (
        <ApplicationFormModal
          propertyTitle={formProperty}
          onClose={() => setShowAppForm(false)}
          onSubmit={() => handleAppSubmit()}
        />
      )}

      {selectedApp && (
        <ApplicationDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}

      {/* Toast */}
      {(showSettingsSaved || submittedApp) && (
        <div className={styles.toastCard}>
          <div style={{ fontSize: 18 }}>✓</div>
          {submittedApp ? "Заявка успешно отправлена!" : "Изменения успешно сохранены"}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
