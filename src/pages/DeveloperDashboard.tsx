import { useState, useEffect, useRef, useCallback, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../api/admin";
import {
  getMyApplications,
  getChats,
  getMessages,
  sendMessage,
  updateApplicationStatus,
  updateProfile,
  changePassword,
  getProjects,
  createProject,
  getCompanyListings,
  createListing,
  statusLabel,
  statusColor,
  type Application,
  type ChatSummary,
  type ApplicationMessage,
  type BackendProject,
  type CompanyListing,
  type CreateListingPayload,
} from "../api/dashboard";
import { getErrorMessage } from "../api/auth";
import s from "../css/DeveloperDashboard.module.css";

const logo = "/assets/logo.png";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
  } catch { return iso.slice(0, 10); }
}

function fmtTime(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return ""; }
}

function appStatusColor(status: string) { return statusColor(status); }

const ITEMS_PER_PAGE = 8;


// ─── ONBOARDING ───────────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    title: "Добро пожаловать в кабинет застройщика",
    desc: "Здесь вы можете управлять проектами, объектами недвижимости и заявками от клиентов.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    title: "Создание проектов",
    desc: "Создайте ЖК-проект и добавляйте к нему квартиры и другие объекты. Каждый проект проходит модерацию.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
  {
    title: "Управление объектами",
    desc: "Каждому проекту добавьте объекты: квартиры, студии, коммерческие помещения. Отслеживайте статус и просмотры.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/>
      </svg>
    ),
  },
  {
    title: "Работа с заявками",
    desc: "Получайте заявки от покупателей и общайтесь с ними через встроенный чат в разделе «Заявки» и «Сообщения».",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
];

// ─── CHAT WINDOW ──────────────────────────────────────────────────────────────

function DevChatWindow({ chat, userId, onBack }: { chat: ChatSummary; userId: number; onBack: () => void }) {
  const [messages, setMessages] = useState<ApplicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMessages(chat.application_id)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [chat.application_id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(chat.application_id, body);
      setMessages(prev => [...prev, msg]);
      setText("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const senderName = chat.user_name || chat.company_name;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", display: "flex", flexDirection: "column", height: 600 }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#939393", padding: 0 }}>←</button>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0f3ff", color: "#5b73e8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
          {senderName.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>{senderName}</div>
          <div style={{ fontSize: 12, color: "#939393" }}>{chat.listing_title}</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && <div style={{ textAlign: "center", color: "#ccc", fontSize: 14 }}>Загрузка...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#b0b0b0", fontSize: 14, marginTop: 40 }}>Сообщений пока нет. Начните диалог первыми.</div>
        )}
        {messages.map(msg => {
          const isSent = msg.sender_user_id === userId;
          return (
            <div key={msg.id} style={{ alignSelf: isSent ? "flex-end" : "flex-start", maxWidth: "70%" }}>
              <div style={{
                padding: "12px 16px", borderRadius: isSent ? "16px 16px 0 16px" : "16px 16px 16px 0",
                background: isSent ? "#5b73e8" : "#f5f5f5", color: isSent ? "#fff" : "#1a1a2e",
                fontSize: 14, lineHeight: 1.5,
              }}>{msg.body}</div>
              <div style={{ fontSize: 11, color: "#939393", marginTop: 4, textAlign: isSent ? "right" : "left" }}>{fmtTime(msg.created_at)}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 16, borderTop: "1px solid #f0f0f0", display: "flex", gap: 12 }}>
        <input
          type="text"
          style={{ flex: 1, padding: "0 16px", height: 44, borderRadius: 22, border: "1px solid #e8e8e8", fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif" }}
          placeholder="Написать сообщение..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          disabled={sending}
        />
        <button
          onClick={handleSend} disabled={sending}
          style={{ width: 44, height: 44, borderRadius: "50%", background: sending ? "#ccc" : "#5b73e8", border: "none", cursor: sending ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────

function projStatusLabel(status: string) {
  const m: Record<string, string> = { active: "Активный", construction: "В строительстве", completed: "Сдан", draft: "Черновик" };
  return m[status] ?? status;
}

function projStatusBadge(status: string) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    active:       { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
    construction: { bg: "#e8f4ff", color: "#1890ff", border: "#91d5ff" },
    completed:    { bg: "#f0f3ff", color: "#5b73e8", border: "#b3c0f7" },
    draft:        { bg: "#f5f5f5", color: "#595959", border: "#d9d9d9" },
  };
  const st = styles[status] ?? styles.draft;
  return { background: st.bg, color: st.color, border: `1px solid ${st.border}` };
}

function objStatusLabel(status: string) {
  const m: Record<string, string> = { active: "Активно", moderation: "На модерации", draft: "Черновик", reserved: "Забронировано", sold: "Продано" };
  return m[status] ?? status;
}

function objStatusBadgeClass(s: Record<string, string>, status: string) {
  const m: Record<string, string> = { active: "badgeActive", moderation: "badgeModerate", draft: "badgeDraft", reserved: "badgePending", sold: "badgeConstruction" };
  return `${s.badge} ${s[m[status] || "badge"] || ""}`;
}

// ─── PROJECTS PAGE ────────────────────────────────────────────────────────────

function ProjectsPage({
  projects, loading, error, onAdd, onRefresh,
}: {
  projects: BackendProject[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
  });

  return (
    <>
      <div className={s.statsRow}>
        {[
          { label: "Всего проектов", value: projects.length, cls: "statCardIconIndigo", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
        ].map(card => (
          <div key={card.label} className={s.statCard}>
            <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s[card.cls]}`}>{card.icon}</div></div>
            <div className={s.statCardValue}>{card.value}</div>
            <div className={s.statCardLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className={s.toolbar}>
        <input className={s.searchInput} placeholder="Поиск проектов..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ flex: 1 }} />
        <button className={s.btnAdd} onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Создать проект
        </button>
      </div>

      {error && (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7", marginBottom: 16 }}>
          {error}
          <button onClick={onRefresh} style={{ marginLeft: 12, color: "#5b73e8", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
        </div>
      )}

      <div className={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#939393" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a", marginBottom: 6 }}>
              {projects.length === 0 ? "Проектов пока нет" : "Нет совпадений"}
            </div>
            {projects.length === 0 && <div style={{ fontSize: 13, color: "#b0b0b0" }}>Нажмите «Создать проект», чтобы добавить первый ЖК</div>}
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Название</th>
                <th className={s.th}>Город</th>
                <th className={s.th}>Описание</th>
                <th className={s.th}>Дата создания</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={s.tr}>
                  <td className={s.td} style={{ fontWeight: 500 }}>{p.name}</td>
                  <td className={s.td}>{p.city}</td>
                  <td className={s.td} style={{ maxWidth: 260, color: "#595959", fontSize: 13 }}>{p.description || "—"}</td>
                  <td className={s.td}>{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── OBJECTS PAGE ─────────────────────────────────────────────────────────────

function ObjectsPage({
  listings, loading, error, onAdd, onRefresh,
}: {
  listings: CompanyListing[];
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Все");
  const [page, setPage] = useState(1);

  const filtered = listings.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.title.toLowerCase().includes(q);
    const matchStatus = filterStatus === "Все" || o.status === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div className={s.statsRow}>
        {[
          { label: "Всего объектов",  value: listings.length,                                            cls: "statCardIconIndigo", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
          { label: "Активных",        value: listings.filter(o => o.status === "active").length,         cls: "statCardIconGreen",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: "На модерации",    value: listings.filter(o => o.status === "moderation").length,     cls: "statCardIconOrange", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> },
        ].map(card => (
          <div key={card.label} className={s.statCard}>
            <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s[card.cls]}`}>{card.icon}</div></div>
            <div className={s.statCardValue}>{card.value}</div>
            <div className={s.statCardLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className={s.toolbar}>
        <input className={s.searchInput} placeholder="Поиск объектов..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className={s.filterSelect} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option>Все</option>
          <option value="active">Активно</option>
          <option value="moderation">На модерации</option>
          <option value="rejected">Отклонено</option>
          <option value="draft">Черновик</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className={s.btnAdd} onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Добавить объект
        </button>
      </div>

      {error && (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7", marginBottom: 16 }}>
          {error}
          <button onClick={onRefresh} style={{ marginLeft: 12, color: "#5b73e8", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
        </div>
      )}

      <div className={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>
        ) : pageItems.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#939393" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a", marginBottom: 6 }}>
              {listings.length === 0 ? "Объектов пока нет" : "Нет совпадений по фильтру"}
            </div>
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Название</th>
                <th className={s.th}>Тип</th>
                <th className={s.th}>Статус</th>
                <th className={s.th}>Цена</th>
                <th className={s.th}>Город</th>
                <th className={s.th}>Дата</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => (
                <tr key={item.id} className={s.tr} style={{ cursor: "pointer" }} onClick={() => navigate(`/property/${item.id}`)}>
                  <td className={s.td}>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    {(item.rooms || item.area || item.floor) && (
                      <div style={{ fontSize: 12, color: "#939393", marginTop: 2 }}>
                        {[item.rooms && `${item.rooms} комн.`, item.area && `${item.area} м²`, item.floor && `${item.floor} эт.`].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className={s.td}>{item.deal_type === "rent" ? "Аренда" : "Продажа"}</td>
                  <td className={s.td}><span className={objStatusBadgeClass(s, item.status)}>{objStatusLabel(item.status)}</span></td>
                  <td className={s.td} style={{ fontWeight: 500 }}>{item.price.toLocaleString("ru-RU")} ₸</td>
                  <td className={s.td}>{item.city}</td>
                  <td className={s.td}>{fmtDate(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && pageItems.length > 0 && (
          <div className={s.pagination}>
            <span>Показано {pageItems.length} из {filtered.length} объектов</span>
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
        )}
      </div>
    </>
  );
}

// ─── APPLICATIONS PAGE ────────────────────────────────────────────────────────

function DevApplicationsPage({
  applications, loading, error, onOpenApp, onRefresh,
}: {
  applications: Application[];
  loading: boolean;
  error: string | null;
  onOpenApp: (app: Application) => void;
  onRefresh: () => void;
}) {
  const newCount    = applications.filter(a => a.status === "new").length;
  const reviewCount = applications.filter(a => a.status === "review").length;

  return (
    <>
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconTeal}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div></div>
          <div className={s.statCardValue}>{applications.length}</div>
          <div className={s.statCardLabel}>Всего заявок</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconOrange}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div></div>
          <div className={s.statCardValue}>{newCount}</div>
          <div className={s.statCardLabel}>Новые</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconIndigo}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div></div>
          <div className={s.statCardValue}>{reviewCount}</div>
          <div className={s.statCardLabel}>На рассмотрении</div>
        </div>
      </div>

      {error && (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7", marginBottom: 16 }}>
          {error}
          <button onClick={onRefresh} style={{ marginLeft: 12, color: "#5b73e8", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
        </div>
      )}

      <div className={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>
        ) : applications.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#939393" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a" }}>Заявок пока нет</div>
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Заявитель</th>
                <th className={s.th}>Объект</th>
                <th className={s.th}>Тип сделки</th>
                <th className={s.th}>Дата</th>
                <th className={s.th}>Статус</th>
                <th className={s.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(a => (
                <tr key={a.id} className={s.tr} style={{ cursor: "pointer" }} onClick={() => onOpenApp(a)}>
                  <td className={s.td}><strong>{a.full_name}</strong></td>
                  <td className={s.td} style={{ maxWidth: 200 }}>{a.listing_title ?? `Объект #${a.listing_id}`}</td>
                  <td className={s.td}>{a.deal_type === "rent" ? "Аренда" : "Продажа"}</td>
                  <td className={s.td}>{fmtDate(a.created_at)}</td>
                  <td className={s.td}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "2px 10px",
                      borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: `${appStatusColor(a.status)}18`, color: appStatusColor(a.status),
                      border: `1px solid ${appStatusColor(a.status)}40`,
                    }}>{statusLabel(a.status)}</span>
                  </td>
                  <td className={s.td}>
                    <div className={s.rowActions}>
                      <button className={s.rowBtn} onClick={() => onOpenApp(a)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── APPLICATION DETAIL MODAL ─────────────────────────────────────────────────

function AppDetailModal({ app, onClose, onReply, onStatusChange }: {
  app: Application;
  onClose: () => void;
  onReply: () => void;
  onStatusChange: (id: number, status: 'new' | 'review' | 'approved' | 'rejected') => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleStatus = async (status: 'new' | 'review' | 'approved' | 'rejected') => {
    setSaving(true);
    try { await onStatusChange(app.id, status); onClose(); }
    finally { setSaving(false); }
  };

  const rows: { label: string; value: string | number | boolean | null | undefined }[] = [
    { label: "Имя",       value: app.full_name },
    { label: "Телефон",   value: app.phone },
    { label: "Email",     value: app.email },
    { label: "Тип сделки", value: app.deal_type === "rent" ? "Аренда" : "Продажа" },
    { label: "Жильцов",   value: app.occupant_count },
    { label: "Ипотека",   value: app.needs_mortgage == null ? null : app.needs_mortgage ? "Да" : "Нет" },
    { label: "Комментарий", value: app.comment },
  ].filter(r => r.value != null && r.value !== "");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Заявка на: {app.listing_title ?? `Объект #${app.listing_id}`}</div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 2 }}>{app.full_name} · {fmtDate(app.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#939393" }}>×</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: `${appStatusColor(app.status)}20`, color: appStatusColor(app.status),
            border: `1px solid ${appStatusColor(app.status)}50`,
          }}>{statusLabel(app.status)}</span>
        </div>

        <div style={{ fontSize: 12, color: "#939393", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 12, fontWeight: 500 }}>Анкета заявителя</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid #f5f5f5" : "none" }}>
              <span style={{ fontSize: 13, color: "#939393", flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 13, color: "#3a3a3a", textAlign: "right" }}>{String(r.value)}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {app.status !== "approved" && (
            <button disabled={saving} onClick={() => handleStatus("approved")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#52c97a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              Одобрить
            </button>
          )}
          {app.status !== "review" && (
            <button disabled={saving} onClick={() => handleStatus("review")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#5b73e8", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              На рассмотрение
            </button>
          )}
          {app.status !== "rejected" && (
            <button disabled={saving} onClick={() => handleStatus("rejected")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#f5f5f5", color: "#f5222d", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
              Отклонить
            </button>
          )}
        </div>
        <button onClick={onReply} style={{ marginTop: 12, width: "100%", padding: "12px 0", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Написать сообщение
        </button>
      </div>
    </div>
  );
}

// ─── ADD PROJECT MODAL ────────────────────────────────────────────────────────

function AddProjectModal({ onClose, onSaved }: { onClose: () => void; onSaved: (p: BackendProject) => void }) {
  const [form, setForm] = useState({ name: "", city: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.city.trim()) { setError("Заполните название и город"); return; }
    setError("");
    setSaving(true);
    try {
      const created = await createProject({ name: form.name.trim(), city: form.city.trim(), description: form.description.trim() || undefined });
      onSaved(created);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.modal} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className={s.modalHeader}>
          <div className={s.modalTitle}>Новый проект</div>
          <button className={s.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div className={s.modalBody}>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Название проекта *</label>
            <input className={s.formInput} placeholder="ЖК «Название»" value={form.name} onChange={e => f("name", e.target.value)} />
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Описание</label>
            <textarea className={s.formTextarea} placeholder="Краткое описание проекта..." value={form.description} onChange={e => f("description", e.target.value)} />
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Город *</label>
            <input className={s.formInput} placeholder="Алматы" value={form.city} onChange={e => f("city", e.target.value)} />
          </div>
          {error && <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>{error}</div>}
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnCancel} onClick={onClose}>Отмена</button>
          <button className={s.btnSubmit} onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Создать проект →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD OBJECT MODAL ─────────────────────────────────────────────────────────

function AddObjectModal({ onClose, onSaved, projects }: { onClose: () => void; onSaved: (l: CompanyListing) => void; projects: BackendProject[] }) {
  const [form, setForm] = useState<{
    title: string; description: string; property_type: string; deal_type: "rent" | "sale";
    price: string; city: string; address: string; rooms: string; area: string; floor: string; total_floors: string; project_id: string;
  }>({
    title: "", description: "", property_type: "apartment", deal_type: "sale",
    price: "", city: "", address: "", rooms: "", area: "", floor: "", total_floors: "",
    project_id: projects[0] ? String(projects[0].id) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.price || !form.city.trim()) {
      setError("Заполните обязательные поля: название, описание, цена, город");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload: CreateListingPayload & { project_id?: number } = {
        title:         form.title.trim(),
        description:   form.description.trim(),
        property_type: form.property_type,
        deal_type:     form.deal_type,
        price:         parseInt(form.price, 10),
        city:          form.city.trim(),
        address:       form.address.trim() || undefined,
        rooms:         form.rooms ? parseInt(form.rooms, 10) : undefined,
        area:          form.area ? parseFloat(form.area) : undefined,
        floor:         form.floor ? parseInt(form.floor, 10) : undefined,
        total_floors:  form.total_floors ? parseInt(form.total_floors, 10) : undefined,
        project_id:    form.project_id ? parseInt(form.project_id, 10) : undefined,
      };
      const created = await createListing(payload as CreateListingPayload);
      onSaved(created);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.modal} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className={s.modalHeader}>
          <div className={s.modalTitle}>Новый объект</div>
          <button className={s.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div className={s.modalBody}>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Название *</label>
            <input className={s.formInput} placeholder="Двухкомнатная квартира, 65 м²" value={form.title} onChange={e => f("title", e.target.value)} />
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Описание *</label>
            <textarea className={s.formTextarea} placeholder="Опишите объект..." value={form.description} onChange={e => f("description", e.target.value)} />
          </div>
          {projects.length > 0 && (
            <div className={s.formGroup}>
              <label className={s.formLabel}>Проект</label>
              <select className={s.formSelect} value={form.project_id} onChange={e => f("project_id", e.target.value)}>
                <option value="">Без проекта</option>
                {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип объекта</label>
              <select className={s.formSelect} value={form.property_type} onChange={e => f("property_type", e.target.value)}>
                <option value="apartment">Квартира</option>
                <option value="house">Дом</option>
                <option value="studio">Студия</option>
                <option value="commercial">Коммерческое</option>
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип сделки</label>
              <select className={s.formSelect} value={form.deal_type} onChange={e => f("deal_type", e.target.value as "rent" | "sale")}>
                <option value="sale">Продажа</option>
                <option value="rent">Аренда</option>
              </select>
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Цена (₸) *</label>
              <input className={s.formInput} type="number" placeholder="28500000" value={form.price} onChange={e => f("price", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Город *</label>
              <input className={s.formInput} placeholder="Алматы" value={form.city} onChange={e => f("city", e.target.value)} />
            </div>
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Адрес</label>
            <input className={s.formInput} placeholder="пр. Абая, 1" value={form.address} onChange={e => f("address", e.target.value)} />
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Площадь (м²)</label>
              <input className={s.formInput} type="number" placeholder="65" value={form.area} onChange={e => f("area", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Комнат</label>
              <input className={s.formInput} type="number" placeholder="2" value={form.rooms} onChange={e => f("rooms", e.target.value)} />
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Этаж</label>
              <input className={s.formInput} type="number" placeholder="8" value={form.floor} onChange={e => f("floor", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Этажей в доме</label>
              <input className={s.formInput} type="number" placeholder="20" value={form.total_floors} onChange={e => f("total_floors", e.target.value)} />
            </div>
          </div>
          {error && <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>{error}</div>}
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnCancel} onClick={onClose}>Отмена</button>
          <button className={s.btnSubmit} onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Добавить →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────

function AnalyticsPage({ applications, listings, projects }: { applications: Application[]; listings: CompanyListing[]; projects: BackendProject[] }) {
  const totalObjects = listings.length;
  const activeObjects = listings.filter(l => l.status === "active").length;
  const newApps = applications.filter(a => a.status === "new").length;

  const appsData = [0, 0, 0, 0, 0, applications.length];
  const maxApps = Math.max(...appsData, 1);
  const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Тек"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={s.statsRow}>
        {[
          { label: "Объектов всего",    value: totalObjects,          cls: "statCardIconIndigo", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg> },
          { label: "Активных объектов", value: activeObjects,         cls: "statCardIconGreen",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: "Заявок получено",   value: applications.length,   cls: "statCardIconTeal",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
          { label: "Новых заявок",      value: newApps,               cls: "statCardIconOrange", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> },
          { label: "Проектов",          value: projects.length,       cls: "statCardIconPurple", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
        ].map(card => (
          <div key={card.label} className={s.statCard}>
            <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s[card.cls]}`}>{card.icon}</div></div>
            <div className={s.statCardValue}>{card.value}</div>
            <div className={s.statCardLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: "24px 28px" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>Динамика заявок</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140 }}>
          {appsData.map((val, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 10, color: "#939393" }}>{val}</div>
              <div style={{ width: "100%", height: `${(val / maxApps) * 110}px`, background: "linear-gradient(180deg, #5b73e8, #4a60d4)", borderRadius: "4px 4px 0 0", minHeight: val > 0 ? 4 : 0 }} />
              <div style={{ fontSize: 10, color: "#939393" }}>{MONTHS[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {projects.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: "24px 28px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>Проекты</h3>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Название</th>
                <th className={s.th}>Город</th>
                <th className={s.th}>Создан</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className={s.tr}>
                  <td className={s.td} style={{ fontWeight: 500 }}>{p.name}</td>
                  <td className={s.td}>{p.city}</td>
                  <td className={s.td}>{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const DeveloperDashboardContent: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout, user, token, login } = useAuth();

  const [obStep, setObStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddObjectModal, setShowAddObjectModal] = useState(false);

  // Real data
  const [applications, setApplications] = useState<Application[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);

  const [appsLoaded,    setAppsLoaded]    = useState(false);
  const [chatsLoaded,   setChatsLoaded]   = useState(false);
  const [overviewLoaded, setOverviewLoaded] = useState(false);

  const [appsLoading,  setAppsLoading]  = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [appsError,    setAppsError]    = useState<string | null>(null);
  const [chatsError,   setChatsError]   = useState<string | null>(null);

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [activeChat, setActiveChat]   = useState<ChatSummary | null>(null);

  // Settings
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [settingsFirstName, setSettingsFirstName] = useState(user?.first_name ?? "");
  const [settingsLastName,  setSettingsLastName]  = useState(user?.last_name ?? "");
  const [settingsPhone,     setSettingsPhone]     = useState(user?.phone ?? "");
  const [settingsSaving,    setSettingsSaving]    = useState(false);
  const [settingsError,     setSettingsError]     = useState("");
  const [settingsSuccess,   setSettingsSuccess]   = useState("");
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [oldPassword,       setOldPassword]       = useState("");
  const [newPassword,       setNewPassword]       = useState("");
  const [confirmPassword,   setConfirmPassword]   = useState("");
  const [passwordSaving,    setPasswordSaving]    = useState(false);
  const [passwordError,     setPasswordError]     = useState("");

  // Projects and listings
  const [projects,         setProjects]         = useState<BackendProject[]>([]);
  const [listings,         setListings]         = useState<CompanyListing[]>([]);
  const [projectsLoaded,   setProjectsLoaded]   = useState(false);
  const [listingsLoaded,   setListingsLoaded]   = useState(false);
  const [projectsLoading,  setProjectsLoading]  = useState(false);
  const [listingsLoading,  setListingsLoading]  = useState(false);
  const [projectsError,    setProjectsError]    = useState<string | null>(null);
  const [listingsError,    setListingsError]    = useState<string | null>(null);

  // ── Data loaders ──────────────────────────────────────────────────────────

  const loadApplications = useCallback(() => {
    setAppsLoading(true);
    setAppsError(null);
    getMyApplications()
      .then(data => { setApplications(data); setAppsLoaded(true); })
      .catch(e => setAppsError(getErrorMessage(e)))
      .finally(() => setAppsLoading(false));
  }, []);

  const loadChats = useCallback(() => {
    setChatsLoading(true);
    setChatsError(null);
    getChats()
      .then(data => { setChatSummaries(data); setChatsLoaded(true); })
      .catch(e => setChatsError(getErrorMessage(e)))
      .finally(() => setChatsLoading(false));
  }, []);

  const loadProjects = useCallback(() => {
    setProjectsLoading(true);
    setProjectsError(null);
    getProjects()
      .then(data => { setProjects(data); setProjectsLoaded(true); })
      .catch(e => setProjectsError(getErrorMessage(e)))
      .finally(() => setProjectsLoading(false));
  }, []);

  const loadListings = useCallback(() => {
    setListingsLoading(true);
    setListingsError(null);
    getCompanyListings()
      .then(data => { setListings(data); setListingsLoaded(true); })
      .catch(() => { setListings([]); setListingsLoaded(true); })
      .finally(() => setListingsLoading(false));
  }, []);

  useEffect(() => {
    if (!overviewLoaded) {
      setOverviewLoaded(true);
      loadApplications();
      loadChats();
      loadProjects();
    }
  }, []);

  useEffect(() => {
    if (activeTab === "applications" && !appsLoaded && !appsLoading) loadApplications();
    if (activeTab === "messages"     && !chatsLoaded && !chatsLoading) loadChats();
    if (activeTab === "projects"     && !projectsLoaded && !projectsLoading) loadProjects();
    if (activeTab === "objects"      && !listingsLoaded && !listingsLoading) loadListings();
    if (activeTab === "analytics"    && !projectsLoaded && !projectsLoading) loadProjects();
    if (activeTab === "analytics"    && !listingsLoaded && !listingsLoading) loadListings();
  }, [activeTab]);

  const handleStatusChange = async (id: number, status: 'new' | 'review' | 'approved' | 'rejected') => {
    const updated = await updateApplicationStatus(id, status);
    setApplications(prev => prev.map(a => a.id === id ? updated : a));
  };

  const handleSaveProfile = async () => {
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsSuccess("");
    try {
      await updateProfile({ first_name: settingsFirstName, last_name: settingsLastName, phone: settingsPhone });
      if (token && user) login(token, { ...user, first_name: settingsFirstName, last_name: settingsLastName, phone: settingsPhone });
      setSettingsSuccess("Данные успешно сохранены");
    } catch (e) {
      setSettingsError(getErrorMessage(e));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPassword) { setPasswordError("Введите текущий пароль"); return; }
    if (newPassword.length < 8) { setPasswordError("Пароль должен содержать не менее 8 символов"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Пароли не совпадают"); return; }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword, new_password_confirmation: confirmPassword });
      setIsEditingPassword(false);
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e) {
      setPasswordError(getErrorMessage(e));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setProfileImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Nav ───────────────────────────────────────────────────────────────────

  const NAV = [
    { key: "overview",      label: "Обзор",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key: "projects",      label: "Проекты",    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
    { key: "objects",       label: "Объекты",    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key: "applications",  label: "Заявки",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg> },
    { key: "messages",      label: "Сообщения",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { key: "analytics",     label: "Аналитика",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
    { key: "settings",      label: "Настройки",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
  ];

  const PAGE_TITLES: Record<string, string> = {
    overview: "Обзор", projects: "Проекты", objects: "Объекты",
    applications: "Заявки", messages: "Сообщения", analytics: "Аналитика", settings: "Настройки",
  };

  // ── Overview ─────────────────────────────────────────────────────────────

  const renderOverview = () => {
    const unreadCount  = chatSummaries.filter(c => c.is_unread).length;
    const newApps      = applications.filter(a => a.status === "new").length;
    const activeObjs   = listings.filter(l => l.status === "active").length;
    const moderObjs    = listings.filter(l => l.status === "moderation").length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Stat cards */}
        <div className={s.statsRow}>
          {[
            { label: "Всего проектов",    value: projects.length,  cls: "statCardIconIndigo", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> },
            { label: "Активных объектов", value: activeObjs,        cls: "statCardIconGreen",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg> },
            { label: "На модерации",      value: moderObjs,         cls: "statCardIconOrange", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> },
            { label: "Всего объектов",    value: listings.length,   cls: "statCardIconBlue",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> },
            { label: "Новых обращений",   value: newApps,           cls: "statCardIconTeal",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
          ].map(card => (
            <div key={card.label} className={s.statCard}>
              <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s[card.cls]}`}>{card.icon}</div></div>
              <div className={s.statCardValue}>{card.value}</div>
              <div className={s.statCardLabel}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Projects list */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Проекты</h3>
            <button onClick={() => setActiveTab("projects")} style={{ background: "none", border: "none", color: "#5b73e8", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              Смотреть все
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          {projects.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#939393", background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", fontSize: 14 }}>
              Проектов пока нет.{" "}
              <button onClick={() => setActiveTab("projects")} style={{ color: "#5b73e8", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>Создать проект →</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {projects.slice(0, 3).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "16px 20px", borderRadius: 12, border: "1px solid #e8e8e8", cursor: "pointer" }}
                  onClick={() => setActiveTab("projects")}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: "#939393" }}>{p.city}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#939393" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent listings */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Последние объекты</h3>
            <button onClick={() => setActiveTab("objects")} style={{ background: "none", border: "none", color: "#5b73e8", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              Смотреть все
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          {listings.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#939393", background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", fontSize: 14 }}>
              Объектов пока нет.{" "}
              <button onClick={() => setActiveTab("objects")} style={{ color: "#5b73e8", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>Добавить объект →</button>
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th className={s.th}>Название</th>
                    <th className={s.th}>Тип</th>
                    <th className={s.th}>Статус</th>
                    <th className={s.th}>Цена</th>
                    <th className={s.th}>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.slice(0, 4).map(o => (
                    <tr key={o.id} className={s.tr} onClick={() => setActiveTab("objects")}>
                      <td className={s.td} style={{ fontWeight: 500 }}>{o.title}</td>
                      <td className={s.td}>{o.deal_type === "rent" ? "Аренда" : "Продажа"}</td>
                      <td className={s.td}><span className={objStatusBadgeClass(s, o.status)}>{objStatusLabel(o.status)}</span></td>
                      <td className={s.td}>{o.price.toLocaleString("ru-RU")} ₸</td>
                      <td className={s.td}>{fmtDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff1f0", color: "#f5222d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a2e" }}>{unreadCount} непрочитанных сообщений</div>
                <div style={{ fontSize: 12, color: "#939393" }}>Перейдите в раздел Сообщения</div>
              </div>
            </div>
            <button onClick={() => setActiveTab("messages")} style={{ height: 34, padding: "0 16px", background: "#5b73e8", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Перейти
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Messages ──────────────────────────────────────────────────────────────

  const renderMessages = () => {
    if (activeChat) {
      return <DevChatWindow chat={activeChat} userId={user?.id ?? 0} onBack={() => setActiveChat(null)} />;
    }
    if (chatsLoading) return <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>;
    if (chatsError) return (
      <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7" }}>
        {chatsError}
        <button onClick={loadChats} style={{ marginLeft: 12, color: "#5b73e8", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
      </div>
    );
    if (chatSummaries.length === 0) return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: "#939393" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a" }}>Сообщений нет</div>
        <div style={{ fontSize: 13, color: "#b0b0b0", marginTop: 4 }}>Чаты появятся когда пользователи напишут вам</div>
      </div>
    );
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {chatSummaries.map(chat => {
          const senderName = chat.user_name || chat.company_name;
          return (
            <div key={chat.application_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "16px 20px", borderRadius: 12, border: "1px solid #e8e8e8", cursor: "pointer" }}
              onClick={() => setActiveChat(chat)}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f3ff", color: "#5b73e8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 18, position: "relative", flexShrink: 0 }}>
                  {senderName.charAt(0)}
                  {chat.is_unread && (
                    <div style={{ position: "absolute", top: 0, right: 0, width: 12, height: 12, background: "#f5222d", borderRadius: "50%", border: "2px solid #fff" }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>{senderName}</div>
                  <div style={{ fontSize: 13, color: "#939393", marginBottom: 2 }}>{chat.listing_title}</div>
                  <div style={{ fontSize: 13, color: chat.is_unread ? "#1a1a2e" : "#737373", fontWeight: chat.is_unread ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>
                    {chat.last_message}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#939393", flexShrink: 0 }}>{fmtTime(chat.last_message_at)}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Settings page ─────────────────────────────────────────────────────────

  const renderSettings = () => (
    <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 32 }}>
        <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>Профиль застройщика</h3>
        <div className={s.profileSection}>
          <div className={s.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
            {profileImage ? <img src={profileImage} alt="Profile" className={s.avatarImage} /> : "ЗС"}
            <div className={s.avatarOverlay}><span style={{ fontSize: 24, color: "#fff" }}>📷</span></div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className={s.uploadInput} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "#3a3a3a" }}>Логотип компании</div>
            <div style={{ fontSize: 13, color: "#737373", marginTop: 4 }}>Нажмите на аватар, чтобы загрузить логотип</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className={s.formRowContainer}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Имя</label>
              <input className={s.formInput} placeholder="Имя" value={settingsFirstName} onChange={e => setSettingsFirstName(e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Фамилия</label>
              <input className={s.formInput} placeholder="Фамилия" value={settingsLastName} onChange={e => setSettingsLastName(e.target.value)} />
            </div>
          </div>
          <div className={s.formRowContainer}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Email</label>
              <input className={s.formInput} value={user?.email ?? ""} readOnly style={{ background: "#fafafa", color: "#939393" }} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Телефон</label>
              <input className={s.formInput} placeholder="+7 (999) 000-00-00" value={settingsPhone} onChange={e => setSettingsPhone(e.target.value)} />
            </div>
          </div>
          {settingsError && <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>{settingsError}</div>}
          {settingsSuccess && <div style={{ color: "#52c97a", fontSize: 13, padding: "8px 12px", background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>{settingsSuccess}</div>}
          <button className={s.btnSubmit} style={{ width: "fit-content", marginTop: 8, opacity: settingsSaving ? 0.6 : 1 }} onClick={handleSaveProfile} disabled={settingsSaving}>
            {settingsSaving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: 32 }}>
        <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 600, color: "#1a1a2e" }}>Безопасность</h3>
        {!isEditingPassword ? (
          <button className={s.btnSecondary} onClick={() => setIsEditingPassword(true)}>Изменить пароль</button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Текущий пароль</label>
              <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={s.formInput} placeholder="Введите текущий пароль" />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Новый пароль</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={s.formInput} placeholder="Не менее 8 символов" />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Подтвердите пароль</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={s.formInput} />
            </div>
            {passwordError && <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>{passwordError}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className={s.btnSubmit} onClick={handleSavePassword} disabled={passwordSaving} style={{ opacity: passwordSaving ? 0.6 : 1 }}>
                {passwordSaving ? "Сохранение..." : "Сохранить"}
              </button>
              <button className={s.btnCancel} onClick={() => { setIsEditingPassword(false); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }}>Отмена</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

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
          <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a", lineHeight: 1.4 }}>Кабинет застройщика</div>
        </div>

        <nav className={s.navMenu}>
          {NAV.map(item => (
            <div
              key={item.key}
              className={`${s.navItem} ${activeTab === item.key ? s.navItemActive : ""}`}
              onClick={() => { setActiveTab(item.key); if (item.key !== "messages") setActiveChat(null); }}
            >
              <span className={s.navItemIcon}>{item.icon}</span>
              {item.label}
              {item.key === "messages" && chatSummaries.filter(c => c.is_unread).length > 0 && (
                <span style={{ marginLeft: "auto", background: "#f5222d", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {chatSummaries.filter(c => c.is_unread).length}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: "1px solid #f0f0f0" }}>
          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 4 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, #5b73e8, #4a60d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              {(user?.first_name ?? "З").charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a2e" }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize: 11, color: "#939393" }}>Застройщик</div>
            </div>
          </div>
          <div className={s.navItem} onClick={() => { logout(); navigate("/"); }} style={{ color: "#f5222d", cursor: "pointer" }}>
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
            <div className={s.pageTitle}>{PAGE_TITLES[activeTab] || "Кабинет застройщика"}</div>
            <div className={s.topbarSub}>Застройщик · {user?.first_name} {user?.last_name}</div>
          </div>
          <div className={s.topbarRight}>
            {activeTab === "projects" && (
              <button className={s.btnAdd} onClick={() => setShowAddProjectModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Создать проект
              </button>
            )}
            {activeTab === "objects" && (
              <button className={s.btnAdd} onClick={() => setShowAddObjectModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Добавить объект
              </button>
            )}
          </div>
        </div>

        <div className={s.content}>
          {activeTab === "overview"     && renderOverview()}
          {activeTab === "projects"     && (
            <ProjectsPage
              projects={projects}
              loading={projectsLoading}
              error={projectsError}
              onAdd={() => setShowAddProjectModal(true)}
              onRefresh={loadProjects}
            />
          )}
          {activeTab === "objects"      && (
            <ObjectsPage
              listings={listings}
              loading={listingsLoading}
              error={listingsError}
              onAdd={() => setShowAddObjectModal(true)}
              onRefresh={loadListings}
            />
          )}
          {activeTab === "applications" && (
            <DevApplicationsPage
              applications={applications}
              loading={appsLoading}
              error={appsError}
              onOpenApp={setSelectedApp}
              onRefresh={loadApplications}
            />
          )}
          {activeTab === "messages"     && renderMessages()}
          {activeTab === "analytics"    && (
            <AnalyticsPage
              applications={applications}
              listings={listings}
              projects={projects}
            />
          )}
          {activeTab === "settings"     && renderSettings()}
        </div>
      </div>

      {/* Onboarding */}
      {showOnboarding && (
        <div className={s.overlay}>
          <div className={s.onboarding}>
            <button className={s.onboardingClose} onClick={() => setShowOnboarding(false)}>✕</button>
            <div className={s.onboardingStep}>Шаг {obStep === 0 ? 1 : obStep} из {ONBOARDING_STEPS.length}</div>
            <div className={s.progressBar}>
              <div className={s.progressFill} style={{ width: `${((obStep === 0 ? 0 : obStep) / ONBOARDING_STEPS.length) * 100}%` }} />
            </div>
            <div className={s.onboardingIconWrap}>{ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.icon}</div>
            <div className={s.onboardingTitle}>{ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.title}</div>
            <div className={s.onboardingDesc}>{ONBOARDING_STEPS[obStep === 0 ? 0 : obStep - 1]?.desc}</div>
            <div className={s.onboardingActions}>
              <button className={s.btnSkip} onClick={() => setShowOnboarding(false)}>Пропустить</button>
              <button className={s.btnNext} onClick={() => {
                const next = obStep + 1;
                if (next > ONBOARDING_STEPS.length) setShowOnboarding(false);
                else setObStep(next);
              }}>
                {obStep >= ONBOARDING_STEPS.length ? "Перейти к работе →" : "Далее →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application detail modal */}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleStatusChange}
          onReply={() => {
            setSelectedApp(null);
            const existing = chatSummaries.find(c => c.application_id === selectedApp.id);
            const chat: ChatSummary = existing ?? {
              application_id: selectedApp.id,
              listing_title:  selectedApp.listing_title ?? `Объект #${selectedApp.listing_id}`,
              company_name:   "",
              user_name:      selectedApp.full_name,
              last_message:   "",
              last_message_at: "",
              is_unread:      false,
            };
            setActiveTab("messages");
            setActiveChat(chat);
          }}
        />
      )}

      {/* Add project modal */}
      {showAddProjectModal && (
        <AddProjectModal
          onClose={() => setShowAddProjectModal(false)}
          onSaved={p => setProjects(prev => [p, ...prev])}
        />
      )}

      {/* Add object modal */}
      {showAddObjectModal && (
        <AddObjectModal
          onClose={() => setShowAddObjectModal(false)}
          onSaved={l => setListings(prev => [l, ...prev])}
          projects={projects}
        />
      )}
    </div>
  );
};

// ─── VERIFICATION WRAPPER ─────────────────────────────────────────────────────

const DeveloperDashboard: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.company_id) { setLoading(false); return; }
    adminAPI.getCompanyById(user.company_id)
      .then(company => setStatus(company.verification_status))
      .catch(() => setStatus("verified"))
      .finally(() => setLoading(false));
  }, [user?.company_id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f7f9fa" }}>
        <div style={{ fontSize: 14, color: "#939393" }}>Загрузка...</div>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f7f9fa" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 460, width: "90%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fff7e6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d48806" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>Ожидание верификации</div>
          <div style={{ fontSize: 14, color: "#595959", lineHeight: 1.7, marginBottom: 24 }}>
            Ваша компания зарегистрирована и ожидает проверки администратором. После одобрения вы получите полный доступ к кабинету.
          </div>
          <div style={{ padding: "14px 18px", background: "#fffbe6", borderRadius: 8, border: "1px solid #ffe58f", fontSize: 13, color: "#7c4a00", marginBottom: 24, textAlign: "left" }}>
            ⏳ Обычно проверка занимает до 24 часов. Попробуйте войти позже.
          </div>
          <button style={{ padding: "10px 24px", background: "#f5f5f5", border: "none", borderRadius: 8, fontSize: 14, color: "#595959", cursor: "pointer" }}
            onClick={() => { logout(); navigate("/"); }}>Выйти</button>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f7f9fa" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 460, width: "90%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fff1f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cf1322" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>Заявка отклонена</div>
          <div style={{ fontSize: 14, color: "#595959", lineHeight: 1.7, marginBottom: 24 }}>
            К сожалению, ваша компания не прошла верификацию. Свяжитесь с поддержкой для уточнения причины.
          </div>
          <button style={{ padding: "10px 24px", background: "#f5f5f5", border: "none", borderRadius: 8, fontSize: 14, color: "#595959", cursor: "pointer" }}
            onClick={() => { logout(); navigate("/"); }}>Выйти</button>
        </div>
      </div>
    );
  }

  return <DeveloperDashboardContent />;
};

export default DeveloperDashboard;
