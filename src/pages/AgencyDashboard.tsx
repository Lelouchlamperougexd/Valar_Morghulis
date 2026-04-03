import { useState, useRef, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import s from "../css/AgencyDashboard.module.css";
import logo from "../assets/logo.png";

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

interface Listing {
  id: number;
  title: string;
  type: string;
  status: "Активно" | "На проверке" | "Отклонено" | "Черновик" | "На модерации";
  views: number;
  apps: number;
  date: string;
  price: string;
}

const INITIAL_LISTINGS: Listing[] = [
  { id: 1, title: "3-комнатная квартира в ЖК Примавера",       type: "Налогово",    status: "Активно",      views: 243,  apps: 3, date: "25.01.2026", price: "450 000 ₸/мес" },
  { id: 2, title: "Студия в новостройке, отделка под ключ",     type: "На продажу",  status: "На модерации", views: 0,    apps: 0, date: "11.02.2026", price: "18 500 000 ₸" },
  { id: 3, title: "Дача с участком 10 соток, пристань",         type: "Аренда",      status: "Активно",      views: 498,  apps: 7, date: "12.01.2026", price: "180 000 ₸/мес" },
  { id: 4, title: "Офисное помещение в бизнес-центре",          type: "Коммерческое",status: "Активно",      views: 123,  apps: 0, date: "28.01.2026", price: "620 000 ₸/мес" },
  { id: 5, title: "2-комнатная квартира, улучшенная планиров.", type: "На продажу",  status: "Отклонено",    views: 12,   apps: 0, date: "22.02.2026", price: "32 000 000 ₸" },
  { id: 6, title: "Пентхаус с панорамным стеклом",              type: "Аренда",      status: "На модерации", views: 0,    apps: 0, date: "19.02.2026", price: "850 000 ₸/мес" },
  { id: 7, title: "Бут при в магазине",                          type: "Аренда",      status: "Активно",      views: 3543, apps: 1, date: "10.01.2026", price: "95 000 ₸/мес" },
  { id: 8, title: "Торговая площадка на первом этаже жилого",   type: "Коммерческое",status: "Черновик",     views: 629,  apps: 0, date: "8.01.2026",  price: "220 000 ₸/мес" },
];

export interface ApplicationData {
  id: number;
  user: string;
  listing: string;
  date: string;
  status: string;
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

const APPS_MOCK: ApplicationData[] = [
  {
    id: 1, user: "Алия Бекова", listing: "3-комнатная квартира в ЖК Примавера", date: "20.02.2026", status: "Новая",
    answers: { name: "Алия Бекова", phone: "+7 (777) 123-45-67", email: "aliya@bk.ru", moveDate: "01.03.2026", duration: "12 месяцев", family: "2 взрослых, 1 ребенок", pets: "Нет", income: "Стабильный", comment: "Хотим посмотреть на выходных." }
  },
  {
    id: 2, user: "Рустам Омаров", listing: "Дача с участком 10 соток", date: "18.02.2026", status: "В обработке",
    answers: { name: "Рустам Омаров", phone: "+7 (705) 555-55-55", email: "rust@mail.kz", moveDate: "Как можно скорее", duration: "6 месяцев", family: "1 человек", pets: "Собака", income: "Бизнес", comment: "Интересует дача на лето." }
  },
  {
    id: 3, user: "Карина Джумаш", listing: "Бут при в магазине", date: "15.02.2026", status: "Закрыта",
    answers: { name: "Карина Джумаш", phone: "+7 (701) 222-33-44", email: "karina@yandex.kz", moveDate: "-", duration: "1 год", family: "-", pets: "Нет", income: "Магазин одежды", comment: "Скиньте схему бутика." }
  },
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

const INITIAL_CHATS: Chat[] = [
  {
    id: 1, sender: "Алия Бекова", preview: "Когда удобно посмотреть квартиру?", date: "14:30", hasIndicator: true,
    messages: [
      { id: 1, text: "Здравствуйте! Разместили заявку на 3-комнатную.", time: "14:20", isSent: false },
      { id: 2, text: "Когда удобно посмотреть квартиру?", time: "14:30", isSent: false }
    ]
  },
  {
    id: 2, sender: "Рустам Омаров", preview: "Спасибо, буду ждать.", date: "Вчера", hasIndicator: false,
    messages: [
      { id: 1, text: "Добрый день. Насчет дачи.", time: "Вчера", isSent: false },
      { id: 2, text: "Добрый! Да, дача свободна.", time: "Вчера", isSent: true },
      { id: 3, text: "Спасибо, буду ждать.", time: "Вчера", isSent: false },
    ]
  }
];

// ─── ONBOARDING STEPS ────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    title: "Добро пожаловать в кабинет агентства",
    desc: "Здесь вы можете управлять объявлениями, заявками и коммуникацией с клиентами.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    title: "Добавление объявления",
    desc: "Создайте объект: задайте название и отправьте его на модерацию. После одобрения объявление станет доступным пользователям.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
        <path d="M14 2v6h6M12 18v-6M9 15h6"/>
      </svg>
    ),
  },
  {
    title: "Работа с заявками",
    desc: "Здесь пользователи будут обращаться за разделов «Заявки». Вы можете связаться с ними прямо через встроенный чат.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    title: "Статусы объявлений",
    desc: "Каждое объявление имеет статус: активное, На модерации, Не одобрено. Вы узнаете о статусе объявления в разделе Объявления.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    ),
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function badgeClass(st: Record<string, string>, status: string) {
  const map: Record<string, string> = {
    "Активно":      "badgeActive",
    "На проверке":  "badgePending",
    "На модерации": "badgeModerate",
    "Отклонено":    "badgeRejected",
    "Черновик":     "badgeDraft",
  };
  return `${st.badge} ${st[map[status] || "badge"] || ""}`;
}

const ITEMS_PER_PAGE = 8;

// ─── SUB-PAGES ────────────────────────────────────────────────────────────────

// ── Listings Page ──
function ListingsPage({ onAdd }: { onAdd: () => void }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>(INITIAL_LISTINGS);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Все");
  const [filterStatus, setFilterStatus] = useState("Все");
  const [page, setPage] = useState(1);

  const filtered = listings.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.title.toLowerCase().includes(q);
    const matchType = filterType === "Все" || l.type === filterType;
    const matchStatus = filterStatus === "Все" || l.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page_items = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const stats = {
    total:        listings.length,
    active:       listings.filter(l => l.status === "Активно").length,
    moderation:   listings.filter(l => l.status === "На модерации").length,
    views:        listings.reduce((sum, l) => sum + l.views, 0),
    apps:         listings.reduce((sum, l) => sum + l.apps, 0),
  };

  function deleteItem(id: number) {
    setListings(prev => prev.filter(l => l.id !== id));
  }

  return (
    <>
      {/* Stats */}
      <div className={s.statsRow}>
        {[
          { label: "Всего объявлений",  value: stats.total,       cls: "statCardIconBlue",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg> },
          { label: "Активно",           value: stats.active,      cls: "statCardIconGreen",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: "На проверке",       value: stats.moderation,  cls: "statCardIconOrange", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> },
          { label: "Просмотров",        value: `~${(stats.views/1000).toFixed(1)}К`,  cls: "statCardIconPurple", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
          { label: "Активных заявок",   value: stats.apps,        cls: "statCardIconTeal",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
        ].map(card => (
          <div key={card.label} className={s.statCard}>
            <div className={s.statCardTop}>
              <div className={`${s.statCardIconWrap} ${s[card.cls]}`}>{card.icon}</div>
            </div>
            <div className={s.statCardValue}>{card.value}</div>
            <div className={s.statCardLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={s.toolbar}>
        <input
          className={s.searchInput}
          placeholder="Поиск объявлений..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className={s.filterSelect} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option>Все</option>
          <option>Налогово</option>
          <option>На продажу</option>
          <option>Аренда</option>
          <option>Коммерческое</option>
        </select>
        <select className={s.filterSelect} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option>Все</option>
          <option>Активно</option>
          <option>На модерации</option>
          <option>Отклонено</option>
          <option>Черновик</option>
        </select>
        <div style={{ flex: 1 }} />
        <div className={s.filterIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </div>
        <button className={s.btnAdd} onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Добавить объявление
        </button>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>Фото</th>
              <th className={s.th}>Название объекта</th>
              <th className={s.th}>Тип</th>
              <th className={s.th}>Статус</th>
              <th className={s.th}>Просмотры</th>
              <th className={s.th}>Дата</th>
              <th className={s.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {page_items.map(item => (
              <tr key={item.id} className={s.tr} style={{ cursor: "pointer" }} onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  navigate(`/property/${item.id}`);
                }}>
                <td className={s.td}>
                  <div className={s.propImgPlaceholder}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#70a0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                </td>
                <td className={s.td} style={{ maxWidth: 200, fontWeight: 500 }}>{item.title}</td>
                <td className={s.td}>{item.type}</td>
                <td className={s.td}><span className={badgeClass(s, item.status)}>{item.status}</span></td>
                <td className={s.td}>{item.views.toLocaleString()}</td>
                <td className={s.td}>{item.date}</td>
                <td className={s.td}>
                  <div className={s.rowActions}>
                    <button className={s.rowBtn} title="Редактировать">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className={s.rowBtn} title="Просмотр" onClick={() => navigate(`/property/${item.id}`)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button className={`${s.rowBtn} ${s.rowBtnDanger}`} title="Удалить" onClick={() => deleteItem(item.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e60000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={s.pagination}>
          <span>Показано {page_items.length} из {filtered.length} объявлений</span>
          <div className={s.paginationPages}>
            <button className={s.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} className={`${s.pageBtn} ${page === i + 1 ? s.pageBtnActive : ""}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className={s.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Applications Page ──
function ApplicationsPage({ onOpenApp }: { onOpenApp: (app: ApplicationData) => void }) {
  return (
    <>
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconTeal}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div></div>
          <div className={s.statCardValue}>3</div>
          <div className={s.statCardLabel}>Всего заявок</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconOrange}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div></div>
          <div className={s.statCardValue}>1</div>
          <div className={s.statCardLabel}>Новые</div>
        </div>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th className={s.th}>Пользователь</th><th className={s.th}>Объект</th><th className={s.th}>Дата</th><th className={s.th}>Статус</th><th className={s.th}>Действия</th></tr></thead>
          <tbody>
            {APPS_MOCK.map(a => (
              <tr key={a.id} className={s.tr} style={{ cursor: "pointer" }} onClick={() => onOpenApp(a)}>
                <td className={s.td}><strong>{a.user}</strong></td>
                <td className={s.td}>{a.listing}</td>
                <td className={s.td}>{a.date}</td>
                <td className={s.td}><span className={badgeClass(s, a.status === "Новая" ? "На модерации" : a.status === "В обработке" ? "На проверке" : "Черновик")}>{a.status}</span></td>
                <td className={s.td}>
                  <div className={s.rowActions}>
                    <button className={s.rowBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Application Detail Modal ──
function ApplicationDetailModal({ app, onClose, onReply }: { app: ApplicationData; onClose: () => void; onReply: () => void }) {
  const statusColors: Record<string, string> = { "В обработке": "#faad14", "Новая": "#70a0ff", "Закрыта": "#d9d9d9" };
  const fields = [
    { label: "Имя", value: app.answers.name },
    { label: "Телефон", value: app.answers.phone },
    { label: "Email", value: app.answers.email },
    { label: "Желаемая дата въезда", value: app.answers.moveDate },
    { label: "Срок аренды", value: app.answers.duration },
    { label: "Состав семьи", value: app.answers.family },
    { label: "Домашние животные", value: app.answers.pets },
    { label: "Источник дохода", value: app.answers.income },
    { label: "Комментарий", value: app.answers.comment || "—" }
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Заявка на: {app.listing}</div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 2 }}>{app.user} · {app.date}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#939393" }}>×</button>
        </div>

        <div style={{
          display: "inline-flex", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
          background: `${statusColors[app.status] || "#939393"}20`, color: statusColors[app.status] || "#939393",
          marginBottom: 20, border: `1px solid ${statusColors[app.status] || "#939393"}50`
        }}>
          {app.status}
        </div>

        <div style={{ fontSize: 12, color: "#939393", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 12, fontWeight: 500 }}>
          Анкета пользователя
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {fields.map((f, i) => (
            <div key={f.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: i < fields.length - 1 ? "1px solid #f5f5f5" : "none" }}>
              <span style={{ fontSize: 13, color: "#939393", flexShrink: 0 }}>{f.label}</span>
              <span style={{ fontSize: 13, color: "#3a3a3a", textAlign: "right" }}>{f.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={onReply} style={{ flex: 1, padding: "12px 0", background: "#70a0ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Связаться с пользователем</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Listing Modal ──
function AddListingModal({ onClose, onSave }: { onClose: () => void; onSave: (l: Listing) => void }) {
  const [form, setForm] = useState({ title: "", type: "Аренда", price: "", desc: "" });

  function handleSave() {
    if (!form.title.trim()) return;
    onSave({
      id: Date.now(),
      title: form.title,
      type: form.type,
      price: form.price || "—",
      status: "На модерации",
      views: 0,
      apps: 0,
      date: new Date().toLocaleDateString("ru"),
    });
    onClose();
  }

  return (
    <div className={s.modal} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div className={s.modalTitle}>Новое объявление</div>
          <button className={s.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div className={s.modalBody}>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Название объекта *</label>
            <input className={s.formInput} placeholder="Например: 2-комнатная квартира в центре" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип</label>
              <select className={s.formSelect} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option>Аренда</option>
                <option>На продажу</option>
                <option>Коммерческое</option>
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Цена</label>
              <input className={s.formInput} placeholder="450 000 ₸/мес" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Описание</label>
            <textarea className={s.formTextarea} placeholder="Опишите объект..." value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} />
          </div>
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnCancel} onClick={onClose}>Отмена</button>
          <button className={s.btnSubmit} onClick={handleSave}>Добавить →</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AgencyDashboard: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [obStep, setObStep] = useState(0); // 0 = not started, 1..4 = step, 5 = done
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null);

  // Chat state
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [chatMessage, setChatMessage] = useState("");

  // Settings states
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setProfileImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const NAV = [
    { key: "overview",     label: "Обзор",         icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key: "listings",     label: "Объявления",    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg> },
    { key: "applications", label: "Заявки",         icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { key: "messages",     label: "Сообщения",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { key: "analytics",    label: "Аналитика",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
    { key: "settings",     label: "Настройки",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
  ];

  const PAGE_TITLES: Record<string, string> = {
    overview:     "Обзор",
    listings:     "Управление объявлениями",
    applications: "Заявки от пользователей",
    messages:     "Сообщения",
    analytics:    "Аналитика",
    settings:     "Настройки",
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

  const activeChat = chats.find(c => c.id === activeChatId);

  const renderOverview = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconTeal}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div></div>
          <div className={s.statCardValue}>3</div>
          <div className={s.statCardLabel}>Активные заявки</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconBlue}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div></div>
          <div className={s.statCardValue}>2</div>
          <div className={s.statCardLabel}>Сообщения</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconGreen}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div></div>
          <div className={s.statCardValue}>15</div>
          <div className={s.statCardLabel}>Активных объявлений</div>
        </div>
      </div>
      <div>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Последние заявки</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {APPS_MOCK.slice(0, 2).map(app => (
            <div key={app.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "16px 20px", borderRadius: 12, border: "1px solid #e8e8e8", cursor: "pointer" }} onClick={() => setSelectedApp(app)}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>{app.listing}</div>
                <div style={{ fontSize: 13, color: "#939393" }}>От: {app.user}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span className={badgeClass(s, app.status === "Новая" ? "На модерации" : "Черновик")}>{app.status}</span>
                <span style={{ fontSize: 13, color: "#939393" }}>{app.date}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#939393" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMessages = () => {
    if (activeChat) {
      return (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", display: "flex", flexDirection: "column", height: 600 }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setActiveChatId(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#939393", padding: 0 }}>←</button>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0f7ff", color: "#70a0ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{activeChat.sender.charAt(0)}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>{activeChat.sender}</div>
              <div style={{ fontSize: 12, color: "#939393" }}>Пользователь</div>
            </div>
          </div>
          <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {activeChat.messages.map(msg => (
              <div key={msg.id} style={{ alignSelf: msg.isSent ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                <div style={{
                  padding: "12px 16px", borderRadius: msg.isSent ? "16px 16px 0 16px" : "16px 16px 16px 0",
                  background: msg.isSent ? "#70a0ff" : "#f5f5f5", color: msg.isSent ? "#fff" : "#1a1a2e",
                  fontSize: 14, lineHeight: 1.5
                }}>{msg.text}</div>
                <div style={{ fontSize: 11, color: "#939393", marginTop: 4, textAlign: msg.isSent ? "right" : "left" }}>{msg.time}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 16, borderTop: "1px solid #f0f0f0", display: "flex", gap: 12 }}>
            <input type="text" style={{ flex: 1, padding: "0 16px", height: 44, borderRadius: 22, border: "1px solid #e8e8e8", fontSize: 14, outline: "none" }} placeholder="Написать сообщение..." value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendMessage()} />
            <button onClick={handleSendMessage} style={{ width: 44, height: 44, borderRadius: "50%", background: "#70a0ff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {chats.map(chat => (
          <div key={chat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "16px 20px", borderRadius: 12, border: "1px solid #e8e8e8", cursor: "pointer" }} onClick={() => setActiveChatId(chat.id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f7ff", color: "#70a0ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 18, position: "relative" }}>
                {chat.sender.charAt(0)}
                {chat.hasIndicator && <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: 12, background: "#f5222d", borderRadius: "50%", border: "2px solid #fff" }} />}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>{chat.sender}</div>
                <div style={{ fontSize: 14, color: "#737373", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 400 }}>{chat.preview}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#939393" }}>{chat.date}</div>
          </div>
        ))}
      </div>
    );
  };


  return (
    <div className={s.layout}>
      {/* Sidebar */}
      <aside className={s.sidebar}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <img src={logo} alt="Qonys" style={{ height: 32, width: "auto", objectFit: "contain" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", letterSpacing: "-0.3px" }}>Qonys</span>
          </div>
          <button onClick={() => navigate("/")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#939393", fontSize: 13, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            На главную
          </button>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a", lineHeight: 1.4 }}>Кабинет агентства</div>
        </div>
        <nav className={s.navMenu}>
          {NAV.map(item => (
            <div
              key={item.key}
              className={`${s.navItem} ${activeTab === item.key ? s.navItemActive : ""}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className={s.navItemIcon}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: "1px solid #f0f0f0" }}>
          <div
            className={s.navItem}
            onClick={() => { logout(); navigate("/"); }}
            style={{ color: "#f5222d", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
          >
            <span className={s.navItemIcon} style={{ display: "flex", alignItems: "center", opacity: 1, color: "#f5222d" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </span>
            Выйти
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className={s.main}>
        <div className={s.topbar}>
          <div>
            <div className={s.pageTitle}>{PAGE_TITLES[activeTab] || "Кабинет агентства"}</div>
            <div className={s.topbarSub}>Агентство недвижимости</div>
          </div>
          <div className={s.topbarRight}>
            {activeTab === "listings" && (
              <button className={s.btnAdd} onClick={() => setShowAddModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Добавить объявление
              </button>
            )}
          </div>
        </div>
        <div className={s.content}>
          {activeTab === "overview"     && renderOverview()}
          {activeTab === "listings"     && <ListingsPage onAdd={() => setShowAddModal(true)} />}
          {activeTab === "applications" && <ApplicationsPage onOpenApp={setSelectedApp} />}
          {activeTab === "messages"     && renderMessages()}
          {activeTab === "analytics"    && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className={s.statsRow}>
                {[
                  { label: "Просмотры объявлений", value: "2,543", icon: "👁️" },
                  { label: "Заявки", value: "85", icon: "📋" },
                  { label: "Новые клиенты", value: "112", icon: "👥" },
                  { label: "Звонки", value: "54", icon: "📞" }
                ].map((stat, i) => (
                  <div key={i} className={s.statCard}>
                    <div className={s.statCardTop}>
                      <div className={s.statCardLabel}>{stat.label}</div>
                      <div style={{ fontSize: 20 }}>{stat.icon}</div>
                    </div>
                    <div className={s.statCardValue}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 32 }}>
                <h3 style={{ margin: "0 0 24px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Активность за месяц</h3>
                <div style={{ height: 240, display: "flex", alignItems: "flex-end", gap: 12, marginTop: 24 }}>
                  {[40, 70, 45, 90, 65, 85, 120, 95, 110, 80, 130, 150].map((h, i) => (
                    <div key={i} style={{ flex: 1, backgroundColor: "#70a0ff", height: `${(h/150)*100}%`, borderRadius: "4px 4px 0 0", opacity: 0.8, transition: "opacity 0.2s" }} onMouseOver={e => e.currentTarget.style.opacity = "1"} onMouseOut={e => e.currentTarget.style.opacity = "0.8"} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: "#939393" }}>
                  <span>1 апр</span>
                  <span>15 апр</span>
                  <span>30 апр</span>
                </div>
              </div>
            </div>
          )}
          {activeTab === "settings"     && (
            <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 32 }}>
                <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>Профиль агентства</h3>
                <div className={s.profileSection}>
                  <div className={s.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
                    {profileImage ? <img src={profileImage} alt="Profile" className={s.avatarImage} /> : "АН"}
                    <div className={s.avatarOverlay}>
                      <span style={{ fontSize: 24, color: "#fff" }}>📷</span>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className={s.uploadInput} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "#3a3a3a" }}>Логотип агентства</div>
                    <div style={{ fontSize: 13, color: "#737373", marginTop: 4 }}>Нажмите на аватар, чтобы загрузить новое фото</div>
                  </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className={s.formRowContainer}>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Название агентства</label>
                      <input className={s.formInput} placeholder="Название агентства" />
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>БИН / ИИН</label>
                      <input className={s.formInput} placeholder="123456789012" />
                    </div>
                  </div>
                  <div className={s.formRowContainer}>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Email</label>
                      <input className={s.formInput} placeholder="agency@example.com" />
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Телефон</label>
                      <input className={s.formInput} placeholder="+7 (999) 000-00-00" />
                    </div>
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>Адрес офиса</label>
                    <input className={s.formInput} placeholder="г. Алматы, пр. Абая, 1" />
                  </div>
                  <div className={s.formGroup}>
                    <label className={s.formLabel}>О компании</label>
                    <textarea className={s.formTextarea} style={{ minHeight: 100 }} placeholder="Расскажите о вашем агентстве..." />
                  </div>
                  <button className={s.btnSubmit} style={{ width: "fit-content", marginTop: 8 }}>Сохранить изменения</button>
                </div>
              </div>
              
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 32 }}>
                <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>Безопасность</h3>
                {!isEditingPassword ? (
                  <button className={s.btnSecondary} onClick={() => setIsEditingPassword(true)}>Изменить пароль</button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Новый пароль</label>
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={s.formInput} />
                    </div>
                    <div className={s.formGroup}>
                      <label className={s.formLabel}>Подтвердите пароль</label>
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={s.formInput} />
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <button className={s.btnSubmit} onClick={() => { setIsEditingPassword(false); setNewPassword(""); setConfirmPassword(""); }}>Сохранить</button>
                      <button className={s.btnCancel} onClick={() => { setIsEditingPassword(false); setNewPassword(""); setConfirmPassword(""); }}>Отмена</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Onboarding */}
      {showOnboarding && (
        <div className={s.overlay}>
          <div className={s.onboarding}>
            <button className={s.onboardingClose} onClick={() => setShowOnboarding(false)}>✕</button>
            <div className={s.onboardingStep}>
              Шаг {obStep === 0 ? 1 : obStep} из {ONBOARDING_STEPS.length}
            </div>
            <div className={s.progressBar}>
              <div
                className={s.progressFill}
                style={{ width: `${((obStep === 0 ? 0 : obStep) / ONBOARDING_STEPS.length) * 100}%` }}
              />
            </div>
            <div className={s.onboardingIconWrap}>
              {ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.icon}
            </div>
            <div className={s.onboardingTitle}>
              {ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.title}
            </div>
            <div className={s.onboardingDesc}>
              {ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.desc}
            </div>
            <div className={s.onboardingActions}>
              <button className={s.btnSkip} onClick={() => setShowOnboarding(false)}>Пропустить</button>
              <button
                className={s.btnNext}
                onClick={() => {
                  const nextStep = obStep + 1;
                  if (nextStep > ONBOARDING_STEPS.length) {
                    setShowOnboarding(false);
                  } else {
                    setObStep(nextStep);
                  }
                }}
              >
                {obStep >= ONBOARDING_STEPS.length ? "Перейти к работе →" : "Далее →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal 
          app={selectedApp} 
          onClose={() => setSelectedApp(null)} 
          onReply={() => {
            setSelectedApp(null);
            // find or create chat
            let chat = chats.find(c => c.sender === selectedApp.user);
            if (!chat) {
              chat = { id: Date.now(), sender: selectedApp.user, preview: "Вы начали диалог", date: "Только что", hasIndicator: false, messages: [] };
              setChats([chat, ...chats]);
            }
            setActiveTab("messages");
            setActiveChatId(chat.id);
          }} 
        />
      )}

      {/* Add Listing Modal */}
      {showAddModal && (
        <AddListingModal
          onClose={() => setShowAddModal(false)}
          onSave={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

export default AgencyDashboard;
