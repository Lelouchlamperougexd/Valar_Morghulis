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
  getCompanyListings,
  createListing,
  updateProfile,
  changePassword,
  statusLabel,
  statusColor,
  type Application,
  type ChatSummary,
  type ApplicationMessage,
  type CompanyListing,
  type CreateListingPayload,
} from "../api/dashboard";
import { getErrorMessage } from "../api/auth";
import s from "../css/AgencyDashboard.module.css";

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

function listingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active:     "Активно",
    moderation: "На модерации",
    rejected:   "Отклонено",
    draft:      "Черновик",
    archived:   "Архив",
  };
  return map[status] ?? status;
}

function badgeClass(st: Record<string, string>, status: string) {
  const map: Record<string, string> = {
    active:     "badgeActive",
    moderation: "badgeModerate",
    rejected:   "badgeRejected",
    draft:      "badgeDraft",
    archived:   "badge",
    // legacy Russian keys kept for compatibility
    "Активно":      "badgeActive",
    "На проверке":  "badgePending",
    "На модерации": "badgeModerate",
    "Отклонено":    "badgeRejected",
    "Черновик":     "badgeDraft",
  };
  return `${st.badge} ${st[map[status] || "badge"] || ""}`;
}

function appStatusColor(status: string) {
  return statusColor(status);
}

const ITEMS_PER_PAGE = 8;

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

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

// ─── AGENCY CHAT WINDOW ───────────────────────────────────────────────────────

function AgencyChatWindow({
  chat, userId, onBack,
}: { chat: ChatSummary; userId: number; onBack: () => void }) {
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(chat.application_id, body);
      setMessages(prev => [...prev, msg]);
      setText("");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const senderName = chat.user_name || chat.company_name;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", display: "flex", flexDirection: "column", height: 600 }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#939393", padding: 0 }}>←</button>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f0f7ff", color: "#70a0ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
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
          <div style={{ textAlign: "center", color: "#b0b0b0", fontSize: 14, marginTop: 40 }}>
            Сообщений пока нет. Начните диалог первыми.
          </div>
        )}
        {messages.map(msg => {
          const isSent = msg.sender_user_id === userId;
          return (
            <div key={msg.id} style={{ alignSelf: isSent ? "flex-end" : "flex-start", maxWidth: "70%" }}>
              <div style={{
                padding: "12px 16px", borderRadius: isSent ? "16px 16px 0 16px" : "16px 16px 16px 0",
                background: isSent ? "#70a0ff" : "#f5f5f5", color: isSent ? "#fff" : "#1a1a2e",
                fontSize: 14, lineHeight: 1.5
              }}>{msg.body}</div>
              <div style={{ fontSize: 11, color: "#939393", marginTop: 4, textAlign: isSent ? "right" : "left" }}>
                {fmtTime(msg.created_at)}
              </div>
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
          onClick={handleSend}
          disabled={sending}
          style={{ width: 44, height: 44, borderRadius: "50%", background: sending ? "#ccc" : "#70a0ff", border: "none", cursor: sending ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── LISTINGS PAGE ────────────────────────────────────────────────────────────

function ListingsPage({
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
  const [filterDeal, setFilterDeal] = useState("Все");
  const [page, setPage] = useState(1);

  const filtered = listings.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.title.toLowerCase().includes(q);
    const matchStatus = filterStatus === "Все" || listingStatusLabel(l.status) === filterStatus;
    const matchDeal = filterDeal === "Все" || (filterDeal === "Аренда" ? l.deal_type === "rent" : l.deal_type === "sale");
    return matchSearch && matchStatus && matchDeal;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const stats = {
    total:      listings.length,
    active:     listings.filter(l => l.status === "active").length,
    moderation: listings.filter(l => l.status === "moderation").length,
    views:      0, // not returned by API
    apps:       0, // not returned by API
  };

  return (
    <>
      <div className={s.statsRow}>
        {[
          { label: "Всего объявлений", value: stats.total,      cls: "statCardIconBlue",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg> },
          { label: "Активно",          value: stats.active,     cls: "statCardIconGreen",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: "На модерации",     value: stats.moderation, cls: "statCardIconOrange", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> },
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

      <div className={s.toolbar}>
        <input
          className={s.searchInput}
          placeholder="Поиск объявлений..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className={s.filterSelect} value={filterDeal} onChange={e => { setFilterDeal(e.target.value); setPage(1); }}>
          <option>Все</option>
          <option>Аренда</option>
          <option>Продажа</option>
        </select>
        <select className={s.filterSelect} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option>Все</option>
          <option>Активно</option>
          <option>На модерации</option>
          <option>Отклонено</option>
          <option>Черновик</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className={s.btnAdd} onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Добавить объявление
        </button>
      </div>

      {error && (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7", marginBottom: 16 }}>
          {error}
          <button onClick={onRefresh} style={{ marginLeft: 12, color: "#70a0ff", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
        </div>
      )}

      <div className={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>
        ) : pageItems.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#939393" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a", marginBottom: 6 }}>
              {listings.length === 0 ? "Объявлений пока нет" : "Нет совпадений по фильтру"}
            </div>
            {listings.length === 0 && (
              <div style={{ fontSize: 13, color: "#b0b0b0" }}>Нажмите «Добавить объявление», чтобы создать первое</div>
            )}
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Фото</th>
                <th className={s.th}>Название объекта</th>
                <th className={s.th}>Тип</th>
                <th className={s.th}>Статус</th>
                <th className={s.th}>Цена</th>
                <th className={s.th}>Дата</th>
                <th className={s.th}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => (
                <tr key={item.id} className={s.tr} style={{ cursor: "pointer" }} onClick={e => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  navigate(`/property/${item.id}`);
                }}>
                  <td className={s.td}>
                    <div className={s.propImgPlaceholder}>
                      {item.media?.[0]?.url ? (
                        <img src={item.media[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#70a0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      )}
                    </div>
                  </td>
                  <td className={s.td} style={{ maxWidth: 200, fontWeight: 500 }}>{item.title}</td>
                  <td className={s.td}>{item.deal_type === "rent" ? "Аренда" : "Продажа"}</td>
                  <td className={s.td}><span className={badgeClass(s, item.status)}>{listingStatusLabel(item.status)}</span></td>
                  <td className={s.td}>{item.price.toLocaleString("ru-RU")} ₸</td>
                  <td className={s.td}>{fmtDate(item.created_at)}</td>
                  <td className={s.td}>
                    <div className={s.rowActions}>
                      <button className={s.rowBtn} title="Просмотр" onClick={() => navigate(`/property/${item.id}`)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && pageItems.length > 0 && (
          <div className={s.pagination}>
            <span>Показано {pageItems.length} из {filtered.length} объявлений</span>
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

function AgencyApplicationsPage({
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
          <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s.statCardIconBlue}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div></div>
          <div className={s.statCardValue}>{reviewCount}</div>
          <div className={s.statCardLabel}>На рассмотрении</div>
        </div>
      </div>

      {error && (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7", marginBottom: 16 }}>
          {error}
          <button onClick={onRefresh} style={{ marginLeft: 12, color: "#70a0ff", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
        </div>
      )}

      <div className={s.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>
        ) : applications.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Заявок пока нет</div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Заявитель</th>
                <th className={s.th}>Объект</th>
                <th className={s.th}>Тип</th>
                <th className={s.th}>Совместимость</th>
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
                  <td className={s.td}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: a.is_compatible ? "#52c97a" : "#faad14" }}>
                      {a.is_compatible ? "✓ Подходит" : "~ Не подходит"}
                    </span>
                  </td>
                  <td className={s.td}>{fmtDate(a.created_at)}</td>
                  <td className={s.td}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "2px 10px",
                      borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: `${appStatusColor(a.status)}18`, color: appStatusColor(a.status),
                      border: `1px solid ${appStatusColor(a.status)}40`,
                    }}>
                      {statusLabel(a.status)}
                    </span>
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

function ApplicationDetailModal({
  app,
  onClose,
  onReply,
  onStatusChange,
}: {
  app: Application;
  onClose: () => void;
  onReply: () => void;
  onStatusChange: (id: number, status: 'new' | 'review' | 'approved' | 'rejected') => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleStatus = async (status: 'new' | 'review' | 'approved' | 'rejected') => {
    setSaving(true);
    try {
      await onStatusChange(app.id, status);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const rows: { label: string; value: string | number | boolean | null | undefined }[] = [
    { label: "Имя",               value: app.full_name },
    { label: "Телефон",           value: app.phone },
    { label: "Email",             value: app.email },
    { label: "Тип сделки",        value: app.deal_type === "rent" ? "Аренда" : "Продажа" },
    { label: "Жильцов",           value: app.occupant_count },
    { label: "Дети",              value: app.has_children == null ? null : app.has_children ? "Да" : "Нет" },
    { label: "Животные",          value: app.has_pets == null ? null : app.has_pets ? "Да" : "Нет" },
    { label: "Студент",           value: app.is_student == null ? null : app.is_student ? "Да" : "Нет" },
    { label: "Срок аренды (мес)", value: app.stay_term_months },
    { label: "Ипотека",           value: app.needs_mortgage == null ? null : app.needs_mortgage ? "Да" : "Нет" },
    { label: "Срок покупки",      value: app.purchase_term },
    { label: "Комментарий",       value: app.comment },
  ].filter(r => r.value != null && r.value !== "");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
              Заявка на: {app.listing_title ?? `Объект #${app.listing_id}`}
            </div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 2 }}>{app.full_name} · {fmtDate(app.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#939393" }}>×</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: `${appStatusColor(app.status)}20`, color: appStatusColor(app.status),
            border: `1px solid ${appStatusColor(app.status)}50`,
          }}>
            {statusLabel(app.status)}
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: app.is_compatible ? "#f6ffed" : "#fff7e6",
            color: app.is_compatible ? "#52c97a" : "#faad14",
            border: `1px solid ${app.is_compatible ? "#b7eb8f" : "#ffd591"}`,
          }}>
            {app.is_compatible ? "Подходит" : "Не подходит"}
          </span>
        </div>

        <div style={{ fontSize: 12, color: "#939393", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 12, fontWeight: 500 }}>
          Анкета заявителя
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid #f5f5f5" : "none" }}>
              <span style={{ fontSize: 13, color: "#939393", flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 13, color: "#3a3a3a", textAlign: "right" }}>{String(r.value)}</span>
            </div>
          ))}
        </div>

        {/* Status actions */}
        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {app.status !== "approved" && (
            <button
              disabled={saving}
              onClick={() => handleStatus("approved")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#52c97a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >Одобрить</button>
          )}
          {app.status !== "review" && (
            <button
              disabled={saving}
              onClick={() => handleStatus("review")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#70a0ff", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >На рассмотрение</button>
          )}
          {app.status !== "rejected" && (
            <button
              disabled={saving}
              onClick={() => handleStatus("rejected")}
              style={{ flex: 1, minWidth: 120, padding: "10px 0", background: "#f5f5f5", color: "#f5222d", border: "1px solid #fed7d7", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >Отклонить</button>
          )}
        </div>

        <button
          onClick={onReply}
          style={{ marginTop: 12, width: "100%", padding: "12px 0", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          Написать сообщение
        </button>
      </div>
    </div>
  );
}

// ─── ADD LISTING MODAL ────────────────────────────────────────────────────────

function AddListingModal({ onClose, onSaved }: { onClose: () => void; onSaved: (l: CompanyListing) => void }) {
  const [form, setForm] = useState<{
    title: string; description: string; property_type: string;
    deal_type: "rent" | "sale"; price: string; city: string;
    address: string; rooms: string; area: string; floor: string; total_floors: string;
  }>({
    title: "", description: "", property_type: "apartment",
    deal_type: "rent", price: "", city: "",
    address: "", rooms: "", area: "", floor: "", total_floors: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.price || !form.city.trim()) {
      setError("Заполните обязательные поля: название, описание, цена, город");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload: CreateListingPayload = {
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
      };
      const created = await createListing(payload);
      onSaved(created);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const f = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));

  return (
    <div className={s.modal} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className={s.modalHeader}>
          <div className={s.modalTitle}>Новое объявление</div>
          <button className={s.modalCloseBtn} onClick={onClose}>✕</button>
        </div>
        <div className={s.modalBody}>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Название *</label>
            <input className={s.formInput} placeholder="Например: 2-комнатная квартира в центре" value={form.title} onChange={e => f("title", e.target.value)} />
          </div>
          <div className={s.formGroup}>
            <label className={s.formLabel}>Описание *</label>
            <textarea className={s.formTextarea} placeholder="Опишите объект..." value={form.description} onChange={e => f("description", e.target.value)} />
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип объекта</label>
              <select className={s.formSelect} value={form.property_type} onChange={e => f("property_type", e.target.value)}>
                <option value="apartment">Квартира</option>
                <option value="house">Дом</option>
                <option value="studio">Студия</option>
                <option value="commercial">Коммерческое</option>
                <option value="land">Земля</option>
              </select>
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Тип сделки</label>
              <select className={s.formSelect} value={form.deal_type} onChange={e => f("deal_type", e.target.value as "rent" | "sale")}>
                <option value="rent">Аренда</option>
                <option value="sale">Продажа</option>
              </select>
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Цена (₸) *</label>
              <input className={s.formInput} type="number" placeholder="450000" value={form.price} onChange={e => f("price", e.target.value)} />
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
              <label className={s.formLabel}>Комнат</label>
              <input className={s.formInput} type="number" placeholder="2" value={form.rooms} onChange={e => f("rooms", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Площадь (м²)</label>
              <input className={s.formInput} type="number" placeholder="65" value={form.area} onChange={e => f("area", e.target.value)} />
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Этаж</label>
              <input className={s.formInput} type="number" placeholder="5" value={form.floor} onChange={e => f("floor", e.target.value)} />
            </div>
            <div className={s.formGroup}>
              <label className={s.formLabel}>Этажей в доме</label>
              <input className={s.formInput} type="number" placeholder="12" value={form.total_floors} onChange={e => f("total_floors", e.target.value)} />
            </div>
          </div>
          {error && (
            <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
              {error}
            </div>
          )}
        </div>
        <div className={s.modalFooter}>
          <button className={s.btnCancel} onClick={onClose}>Отмена</button>
          <button className={s.btnSubmit} onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение..." : "Добавить →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const AgencyDashboardContent: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout, user, token, login } = useAuth();

  const [obStep, setObStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddModal, setShowAddModal] = useState(false);

  // Real data
  const [applications, setApplications] = useState<Application[]>([]);
  const [listings, setListings] = useState<CompanyListing[]>([]);
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);

  // Loaded flags (load once per session)
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [listingsLoaded, setListingsLoaded] = useState(false);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [overviewLoaded, setOverviewLoaded] = useState(false);

  // Loading / error states
  const [appsLoading, setAppsLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [chatsError, setChatsError] = useState<string | null>(null);

  // UI state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);

  // Settings state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsFirstName, setSettingsFirstName] = useState(user?.first_name ?? "");
  const [settingsLastName, setSettingsLastName] = useState(user?.last_name ?? "");
  const [settingsPhone, setSettingsPhone] = useState(user?.phone ?? "");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

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
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
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

  // ── Data loaders ──────────────────────────────────────────────────────────

  const loadApplications = useCallback(() => {
    setAppsLoading(true);
    setAppsError(null);
    getMyApplications()
      .then(data => { setApplications(data); setAppsLoaded(true); })
      .catch(e => setAppsError(getErrorMessage(e)))
      .finally(() => setAppsLoading(false));
  }, []);

  const loadListings = useCallback(() => {
    setListingsLoading(true);
    setListingsError(null);
    getCompanyListings()
      .then(data => { setListings(data); setListingsLoaded(true); })
      .catch(() => {
        // /listings/mine endpoint may not be deployed yet — silently use empty list
        setListings([]);
        setListingsLoaded(true);
      })
      .finally(() => setListingsLoading(false));
  }, []);

  const loadChats = useCallback(() => {
    setChatsLoading(true);
    setChatsError(null);
    getChats()
      .then(data => { setChatSummaries(data); setChatsLoaded(true); })
      .catch(e => setChatsError(getErrorMessage(e)))
      .finally(() => setChatsLoading(false));
  }, []);

  // Load overview data on mount (applications + chats are enough for overview stats)
  useEffect(() => {
    if (!overviewLoaded) {
      setOverviewLoaded(true);
      loadApplications();
      loadChats();
    }
  }, []);

  // Lazy-load per tab
  useEffect(() => {
    if (activeTab === "applications" && !appsLoaded && !appsLoading) loadApplications();
    if (activeTab === "listings"     && !listingsLoaded && !listingsLoading) loadListings();
    if (activeTab === "messages"     && !chatsLoaded && !chatsLoading) loadChats();
  }, [activeTab]);

  // ── Status update ─────────────────────────────────────────────────────────

  const handleStatusChange = async (id: number, status: 'new' | 'review' | 'approved' | 'rejected') => {
    const updated = await updateApplicationStatus(id, status);
    setApplications(prev => prev.map(a => a.id === id ? updated : a));
  };

  // ── Nav ───────────────────────────────────────────────────────────────────

  const NAV = [
    { key: "overview",     label: "Обзор",      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key: "listings",     label: "Объявления", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg> },
    { key: "applications", label: "Заявки",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { key: "messages",     label: "Сообщения",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
    { key: "analytics",    label: "Аналитика",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
    { key: "settings",     label: "Настройки",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
  ];

  const PAGE_TITLES: Record<string, string> = {
    overview: "Обзор", listings: "Управление объявлениями",
    applications: "Заявки от пользователей", messages: "Сообщения",
    analytics: "Аналитика", settings: "Настройки",
  };

  // ── Renderers ─────────────────────────────────────────────────────────────

  const renderOverview = () => {
    const unreadCount = chatSummaries.filter(c => c.is_unread).length;
    const newApps     = applications.filter(a => a.status === "new").length;
    const activeCount = listings.filter(l => l.status === "active").length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className={s.statsRow}>
          {[
            { label: "Активных заявок",    value: newApps,     cls: "statCardIconTeal",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
            { label: "Непрочитанных",      value: unreadCount, cls: "statCardIconBlue",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
            { label: "Активных объявлений",value: activeCount, cls: "statCardIconGreen",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          ].map(card => (
            <div key={card.label} className={s.statCard}>
              <div className={s.statCardTop}><div className={`${s.statCardIconWrap} ${s[card.cls]}`}>{card.icon}</div></div>
              <div className={s.statCardValue}>{card.value}</div>
              <div className={s.statCardLabel}>{card.label}</div>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Последние заявки</h3>
          {appsLoading ? (
            <div style={{ color: "#939393", fontSize: 14 }}>Загрузка...</div>
          ) : applications.length === 0 ? (
            <div style={{ color: "#939393", fontSize: 14 }}>Заявок пока нет</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {applications.slice(0, 3).map(app => (
                <div
                  key={app.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "16px 20px", borderRadius: 12, border: "1px solid #e8e8e8", cursor: "pointer" }}
                  onClick={() => setSelectedApp(app)}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>
                      {app.listing_title ?? `Объект #${app.listing_id}`}
                    </div>
                    <div style={{ fontSize: 13, color: "#939393" }}>От: {app.full_name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", padding: "2px 10px",
                      borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: `${appStatusColor(app.status)}18`, color: appStatusColor(app.status),
                      border: `1px solid ${appStatusColor(app.status)}40`,
                    }}>{statusLabel(app.status)}</span>
                    <span style={{ fontSize: 13, color: "#939393" }}>{fmtDate(app.created_at)}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#939393" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    // If a chat is open, show the chat window
    if (activeChat) {
      return (
        <AgencyChatWindow
          chat={activeChat}
          userId={user?.id ?? 0}
          onBack={() => setActiveChat(null)}
        />
      );
    }

    // Otherwise show the chat list
    if (chatsLoading) {
      return <div style={{ padding: 40, textAlign: "center", color: "#939393" }}>Загрузка...</div>;
    }

    if (chatsError) {
      return (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7" }}>
          {chatsError}
          <button onClick={loadChats} style={{ marginLeft: 12, color: "#70a0ff", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Обновить</button>
        </div>
      );
    }

    if (chatSummaries.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#939393" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a" }}>Сообщений нет</div>
          <div style={{ fontSize: 13, color: "#b0b0b0", marginTop: 4 }}>Чаты появятся когда пользователи напишут вам</div>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {chatSummaries.map(chat => {
          const senderName = chat.user_name || chat.company_name;
          return (
            <div
              key={chat.application_id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "16px 20px", borderRadius: 12, border: "1px solid #e8e8e8", cursor: "pointer" }}
              onClick={() => setActiveChat(chat)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0f7ff", color: "#70a0ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 18, position: "relative", flexShrink: 0 }}>
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
          {activeTab === "listings"     && (
            <ListingsPage
              listings={listings}
              loading={listingsLoading}
              error={listingsError}
              onAdd={() => setShowAddModal(true)}
              onRefresh={loadListings}
            />
          )}
          {activeTab === "applications" && (
            <AgencyApplicationsPage
              applications={applications}
              loading={appsLoading}
              error={appsError}
              onOpenApp={setSelectedApp}
              onRefresh={loadApplications}
            />
          )}
          {activeTab === "messages"     && renderMessages()}
          {activeTab === "analytics"    && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className={s.statsRow}>
                {[
                  { label: "Заявки",          value: applications.length, icon: "📋" },
                  { label: "Объявления",       value: listings.length,     icon: "🏠" },
                  { label: "Активных",         value: listings.filter(l => l.status === "active").length, icon: "✅" },
                  { label: "На модерации",     value: listings.filter(l => l.status === "moderation").length, icon: "⏳" },
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
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>Активность</h3>
                <div style={{ fontSize: 13, color: "#939393" }}>Детальная аналитика будет доступна позже</div>
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
                    <div className={s.avatarOverlay}><span style={{ fontSize: 24, color: "#fff" }}>📷</span></div>
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
                  {settingsError && (
                    <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
                      {settingsError}
                    </div>
                  )}
                  {settingsSuccess && (
                    <div style={{ color: "#52c97a", fontSize: 13, padding: "8px 12px", background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
                      {settingsSuccess}
                    </div>
                  )}
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
                    {passwordError && (
                      <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
                        {passwordError}
                      </div>
                    )}
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
          )}
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

      {/* Application Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onStatusChange={handleStatusChange}
          onReply={() => {
            setSelectedApp(null);
            // Build a synthetic ChatSummary for direct chat with this applicant
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

      {/* Add Listing Modal */}
      {showAddModal && (
        <AddListingModal
          onClose={() => setShowAddModal(false)}
          onSaved={created => {
            setListings(prev => [created, ...prev]);
          }}
        />
      )}
    </div>
  );
};

// ─── VERIFICATION WRAPPER ─────────────────────────────────────────────────────

const AgencyDashboard: FunctionComponent = () => {
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

  return <AgencyDashboardContent />;
};

export default AgencyDashboard;
