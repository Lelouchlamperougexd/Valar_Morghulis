import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import s from "../css/AgencyDashboard.module.css";

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
              <tr key={item.id} className={s.tr}>
                <td className={s.td}>
                  <div className={s.propImgPlaceholder}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className={s.rowBtn} title="Просмотр">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button className={`${s.rowBtn} ${s.rowBtnDanger}`} title="Удалить" onClick={() => deleteItem(item.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
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
function ApplicationsPage() {
  const APPS = [
    { id: 1, user: "Алия Бекова",    listing: "3-комнатная квартира...", date: "20.02.2026", status: "Новая" },
    { id: 2, user: "Рустам Омаров",  listing: "Дача с участком 10 соток", date: "18.02.2026", status: "В обработке" },
    { id: 3, user: "Карина Джумаш",  listing: "Бут в магазине",           date: "15.02.2026", status: "Закрыта" },
  ];
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
            {APPS.map(a => (
              <tr key={a.id} className={s.tr}>
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
  const [obStep, setObStep] = useState(0); // 0 = not started, 1..4 = step, 5 = done
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeTab, setActiveTab] = useState("listings");
  const [showAddModal, setShowAddModal] = useState(false);

  const NAV = [
    { key: "listings",     label: "Объявления",    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg> },
    { key: "applications", label: "Заявки",         icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { key: "analytics",    label: "Аналитика",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
    { key: "settings",     label: "Настройки",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
  ];

  const PAGE_TITLES: Record<string, string> = {
    listings:     "Управление объявлениями",
    applications: "Заявки",
    analytics:    "Аналитика",
    settings:     "Настройки",
  };


  return (
    <div className={s.layout}>
      {/* Sidebar */}
      <aside className={s.sidebar}>
        <div className={s.sidebarLogo}>
          <img className={s.logoIcon} src="/src/assets/logo.png" alt="Qonys Logo" />
          <div className={s.logoSub}>Агентство</div>
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
        <div className={s.sidebarBottom}>
          <div className={s.agencyInfo}>
            <div className={s.agencyAvatar}>АН</div>
            <div>
              <div className={s.agencyName}>Наше Агентство</div>
              <div className={s.agencyRole}>Кабинет агентства</div>
            </div>
          </div>
          <div
            className={s.navItem}
            style={{ marginTop: 4, color: "#f5222d" }}
            onClick={() => navigate("/")}
          >
            <span className={s.navItemIcon}>
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
          {activeTab === "listings"     && <ListingsPage onAdd={() => setShowAddModal(true)} />}
          {activeTab === "applications" && <ApplicationsPage />}
          {activeTab === "analytics"    && (
            <div style={{ color: "#939393", padding: 40, fontSize: 15 }}>Аналитика будет доступна после первых объявлений.</div>
          )}
          {activeTab === "settings"     && (
            <div style={{ maxWidth: 420 }}>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Информация агентства</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {["Название агентства", "Email", "Телефон"].map(f => (
                    <div key={f} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <label style={{ fontSize: 13, fontWeight: 500, color: "#3a3a3a" }}>{f}</label>
                      <input className={s.formInput} placeholder={f} />
                    </div>
                  ))}
                  <button className={s.btnSubmit} style={{ width: "fit-content" }}>Сохранить</button>
                </div>
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
