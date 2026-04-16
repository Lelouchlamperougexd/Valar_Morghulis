import { useState, useEffect, type FunctionComponent, type ReactNode, Fragment } from "react";
import s from "../css/Admin.module.css";
import AdminSidebar from "../components/AdminSidebar";
import {
  adminAPI,
  type Company, type Listing, type Complaint, type AdminUser,
  type AdminLog, type Invite, type ActivityPoint, type StatsOverview,
} from "../api/admin";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Adjust these to match your backend's role IDs
const USER_ROLE_ID      = 3;
const MODERATOR_ROLE_ID = 2;

const COMPANY_STATUS: Record<string, string> = {
  pending:  "На проверке",
  verified: "Верифицировано",
  rejected: "Отклонено",
};

const COMPANY_TYPE: Record<string, string> = {
  agency:    "Агентство",
  developer: "Застройщик",
};

const LISTING_STATUS: Record<string, string> = {
  moderation: "На модерации",
  active:     "Активно",
  rejected:   "Отклонено",
  draft:      "Черновик",
  archived:   "Архив",
};

const COMPLAINT_STATUS: Record<string, string> = {
  new:         "Новая",
  in_progress: "В обработке",
  closed:      "Закрыта",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("ru-RU"); } catch { return iso; }
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("ru-RU")} ₸`;
}

function statusClass(status: string, st: Record<string, string>) {
  const map: Record<string, string> = {
    "На проверке":   "badgePending",
    "Верифицировано":"badgeVerified",
    "Активно":       "badgeActive",
    "На модерации":  "badgeModeration",
    "Отклонено":     "badgeRejected",
    "Новая":         "badgeNew",
    "В обработке":   "badgeProcessing",
    "Закрыта":       "badgeClosed",
    "Активен":       "badgeActive",
    "Заблокирован":  "badgeBlocked",
    "Черновик":      "badgePending",
    "Архив":         "badgeBlocked",
  };
  return `${st.badge} ${st[map[status] || "badge"] || st.badge}`;
}

function logColor(actionType: string): string {
  if (/verif|approv|active|unblock|create/.test(actionType)) return "green";
  if (/reject|block|delete|ban/.test(actionType))            return "red";
  if (/close|update|status/.test(actionType))                return "orange";
  return "blue";
}

function logCategory(targetType: string): string {
  const map: Record<string, string> = {
    company:   "Компания",
    listing:   "Объявление",
    complaint: "Жалоба",
    user:      "Пользователь",
  };
  return map[targetType] || "Другое";
}

function isElevatedRole(user: AdminUser): boolean {
  return ["moderator", "admin"].includes(user.role?.name ?? "");
}

function displayRole(user: AdminUser): string {
  const map: Record<string, string> = {
    admin:     "Администратор",
    moderator: "Модератор",
    user:      "Пользователь",
    buyer:     "Покупатель",
    agent:     "Агент",
  };
  return map[user.role?.name] || user.role?.name || "Пользователь";
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: "center", color: "#939393", padding: "32px 20px", fontSize: 13 }}>
        Загрузка...
      </td>
    </tr>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: "center", color: "#939393", padding: "32px 20px", fontSize: 13 }}>
        {text}
      </td>
    </tr>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ margin: "0 0 16px", padding: "12px 16px", background: "#fff1f0", border: "1px solid #ffa39e", borderRadius: 8, fontSize: 13, color: "#cf1322" }}>
      <strong>Ошибка загрузки:</strong> {message}
    </div>
  );
}

function getApiError(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const e = err as { response?: { status?: number; data?: unknown } };
    const status = e.response?.status;
    const data = e.response?.data;
    if (status === 401) return "401 — не авторизован. Войдите как администратор.";
    if (status === 403) return "403 — доступ запрещён. Недостаточно прав.";
    if (status === 404) return "404 — эндпоинт не найден.";
    // Backend error format: { "error": "some message" }
    if (data && typeof data === "object" && "error" in data) {
      return `${status}: ${(data as { error: unknown }).error}`;
    }
    if (typeof data === "string" && data) return `${status}: ${data}`;
    return `HTTP ${status}`;
  }
  if (err instanceof Error) return err.message;
  return "Неизвестная ошибка";
}

// ─── MODAL & DETAIL ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div className={s.modalTitle}>{title}</div>
          <button className={s.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={s.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.detailRow}>
      <div className={s.detailLabel}>{label}</div>
      <div className={s.detailValue}>{children}</div>
    </div>
  );
}

// ─── SUB-PAGES ────────────────────────────────────────────────────────────────

// ── Companies ──
function CompaniesPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("all");
  const [selected, setSelected] = useState<Company | null>(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteType, setInviteType] = useState<"agency" | "developer">("agency");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    adminAPI.getCompanies()
      .then(data => setItems(data))
      .catch(err => { console.error("GET /admin/companies:", err); setError(getApiError(err)); })
      .finally(() => setLoading(false));
  }, []);

  const verify = async (id: number, status: "verified" | "rejected") => {
    try {
      const company = await adminAPI.verifyCompany(id, status);
      setItems(prev => prev.map(c => c.id === id ? company : c));
      setSelected(prev => prev?.id === id ? company : prev);
    } catch {}
  };

  const createInvite = async () => {
    setInviteLoading(true);
    try {
      const inv = await adminAPI.createInvite(inviteType);
      setInvite(inv);
    } catch {}
    setInviteLoading(false);
  };

  const displayed = filter === "all"
    ? items
    : items.filter(c => c.verification_status === "pending");

  return (
    <>
      {error && <ErrorBanner message={error} />}
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Компании</div>
        <div className={s.filterRow}>
          <button
            className={`${s.filterBtn} ${filter === "all" ? s.filterBtnActive : ""}`}
            onClick={() => setFilter("all")}
          >Все</button>
          <button
            className={`${s.filterBtn} ${filter === "pending" ? s.filterBtnActive : ""}`}
            onClick={() => setFilter("pending")}
          >На проверке</button>
          <button
            className={s.btnNeutral}
            style={{ marginLeft: 8 }}
            onClick={() => { setInviteModal(true); setInvite(null); }}
          >+ Приглашение</button>
        </div>
      </div>

      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>Название</th>
              <th className={s.th}>Тип</th>
              <th className={s.th}>Статус</th>
              <th className={s.th}>Email</th>
              <th className={s.th}>Дата подачи</th>
              <th className={s.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow cols={6} />}
            {!loading && displayed.length === 0 && <EmptyRow cols={6} text="Нет компаний" />}
            {displayed.map(c => {
              const statusRu = COMPANY_STATUS[c.verification_status] || c.verification_status;
              return (
                <tr key={c.id} className={`${s.tr} ${s.trClickable}`} onClick={() => setSelected(c)}>
                  <td className={s.td}><strong>{c.name}</strong></td>
                  <td className={s.td}>{COMPANY_TYPE[c.type] || c.type}</td>
                  <td className={s.td}><span className={statusClass(statusRu, s)}>{statusRu}</span></td>
                  <td className={s.td}>{c.email}</td>
                  <td className={s.td}>{formatDate(c.created_at)}</td>
                  <td className={s.td} onClick={e => e.stopPropagation()}>
                    <div className={s.actionCell}>
                      {c.verification_status === "pending" ? (
                        <>
                          <button className={s.btnApprove} onClick={() => verify(c.id, "verified")}>Подтвердить</button>
                          <button className={s.btnReject}  onClick={() => verify(c.id, "rejected")}>Отклонить</button>
                        </>
                      ) : (
                        <span className={s.actionStatusText}>
                          {c.verification_status === "verified" ? "✓ Верифицировано" : "✕ Отклонено"}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (() => {
        const statusRu = COMPANY_STATUS[selected.verification_status] || selected.verification_status;
        return (
          <Modal title={selected.name} onClose={() => setSelected(null)}>
            <Detail label="Название компании">{selected.name}</Detail>
            <Detail label="Тип">{COMPANY_TYPE[selected.type] || selected.type}</Detail>
            <Detail label="Статус"><span className={statusClass(statusRu, s)}>{statusRu}</span></Detail>
            <Detail label="Email">{selected.email}</Detail>
            <Detail label="Телефон">{selected.phone}</Detail>
            <Detail label="Город">{selected.city}</Detail>
            <Detail label="Рег. номер">{selected.registration_number}</Detail>
            <Detail label="Дата подачи">{formatDate(selected.created_at)}</Detail>
            {selected.verification_status === "pending" && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  className={s.btnApprove}
                  style={{ fontSize: 13, padding: "8px 20px" }}
                  onClick={() => verify(selected.id, "verified")}
                >Подтвердить</button>
                <button
                  className={s.btnReject}
                  style={{ fontSize: 13, padding: "8px 20px" }}
                  onClick={() => verify(selected.id, "rejected")}
                >Отклонить</button>
              </div>
            )}
          </Modal>
        );
      })()}

      {inviteModal && (
        <Modal title="Создать приглашение" onClose={() => { setInviteModal(false); setInvite(null); }}>
          {!invite ? (
            <>
              <div style={{ marginBottom: 14, fontSize: 14 }}>Тип компании:</div>
              <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <input type="radio" checked={inviteType === "agency"} onChange={() => setInviteType("agency")} />
                  Агентство
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                  <input type="radio" checked={inviteType === "developer"} onChange={() => setInviteType("developer")} />
                  Застройщик
                </label>
              </div>
              <button className={s.btnApprove} onClick={createInvite} disabled={inviteLoading}>
                {inviteLoading ? "Создание..." : "Создать ссылку"}
              </button>
            </>
          ) : (
            <>
              <Detail label="Тип">{COMPANY_TYPE[invite.company_type] || invite.company_type}</Detail>
              <Detail label="Истекает">{formatDate(invite.expires_at)}</Detail>
              <Detail label="Ссылка">
                <div style={{ fontSize: 12, wordBreak: "break-all", background: "#f5f5f5", padding: "8px 10px", borderRadius: 6, marginTop: 4 }}>
                  {invite.url}
                </div>
              </Detail>
              <button
                className={s.btnNeutral}
                style={{ marginTop: 12, fontSize: 12 }}
                onClick={() => navigator.clipboard.writeText(invite.url)}
              >Копировать ссылку</button>
            </>
          )}
        </Modal>
      )}
    </>
  );
}


// ── Listings ──
function ListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Listing | null>(null);

  useEffect(() => {
    adminAPI.getListings()
      .then(data => setItems(data))
      .catch(err => { console.error("GET /admin/listings:", err); setError(getApiError(err)); })
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      const listing = await adminAPI.updateListingStatus(id, status);
      setItems(prev => prev.map(i => i.id === id ? listing : i));
      setSelected(prev => prev?.id === id ? listing : prev);
    } catch {}
  };

  return (
    <>
      {error && <ErrorBanner message={error} />}
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Объявления на модерации</div>
        <span style={{ fontSize: 13, color: "#939393" }}>
          В очереди: {items.filter(i => i.status === "moderation").length}
        </span>
      </div>

      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>Название</th>
              <th className={s.th}>Компания</th>
              <th className={s.th}>Цена</th>
              <th className={s.th}>Статус</th>
              <th className={s.th}>Дата подачи</th>
              <th className={s.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow cols={6} />}
            {!loading && items.length === 0 && <EmptyRow cols={6} text="Нет объявлений" />}
            {items.map(item => {
              const statusRu = LISTING_STATUS[item.status] || item.status;
              return (
                <tr key={item.id} className={`${s.tr} ${s.trClickable}`} onClick={() => setSelected(item)}>
                  <td className={s.td}><strong>{item.title}</strong></td>
                  <td className={s.td}>{item.company_name}</td>
                  <td className={s.td}>{formatPrice(item.price)}</td>
                  <td className={s.td}><span className={statusClass(statusRu, s)}>{statusRu}</span></td>
                  <td className={s.td}>{formatDate(item.created_at)}</td>
                  <td className={s.td} onClick={e => e.stopPropagation()}>
                    <div className={s.actionCell}>
                      {item.status === "moderation" ? (
                        <>
                          <button className={s.btnApprove} onClick={() => updateStatus(item.id, "active")}>Одобрить</button>
                          <button className={s.btnReject}  onClick={() => updateStatus(item.id, "rejected")}>Отклонить</button>
                        </>
                      ) : (
                        <span className={s.actionStatusText}>
                          {item.status === "active" ? "✓ Активно" : item.status === "rejected" ? "✕ Отклонено" : statusRu}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (() => {
        const statusRu = LISTING_STATUS[selected.status] || selected.status;
        return (
          <Modal title={selected.title} onClose={() => setSelected(null)}>
            <Detail label="Компания">{selected.company_name}</Detail>
            <Detail label="Цена"><span className={s.detailPrice}>{formatPrice(selected.price)}</span></Detail>
            <Detail label="Статус"><span className={statusClass(statusRu, s)}>{statusRu}</span></Detail>
            <Detail label="Тип сделки">{selected.deal_type}</Detail>
            <Detail label="Тип недвижимости">{selected.property_type}</Detail>
            <Detail label="Адрес">{selected.address}, {selected.city}</Detail>
            <Detail label="Площадь">{selected.area} м²</Detail>
            <Detail label="Дата подачи">{formatDate(selected.created_at)}</Detail>
            {selected.status === "moderation" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className={s.btnApprove}
                  style={{ fontSize: 13, padding: "8px 20px" }}
                  onClick={() => { updateStatus(selected.id, "active"); setSelected(null); }}
                >Одобрить</button>
                <button
                  className={s.btnReject}
                  style={{ fontSize: 13, padding: "8px 20px" }}
                  onClick={() => { updateStatus(selected.id, "rejected"); setSelected(null); }}
                >Отклонить</button>
              </div>
            )}
          </Modal>
        );
      })()}
    </>
  );
}


// ── Complaints ──
function ComplaintsPage() {
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("Все");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState("");

  const filters = ["Все", "Новая", "В обработке", "Закрыта"];

  useEffect(() => {
    adminAPI.getComplaints()
      .then(data => setItems(data))
      .catch(err => { console.error("GET /admin/complaints:", err); setError(getApiError(err)); })
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: "new" | "in_progress" | "closed") => {
    try {
      const complaint = await adminAPI.updateComplaintStatus(id, status);
      setItems(prev => prev.map(c => c.id === id ? complaint : c));
      setSelected(prev => prev?.id === id ? complaint : prev);
    } catch {}
  };

  const filtered = filter === "Все"
    ? items
    : items.filter(c => (COMPLAINT_STATUS[c.status] || c.status) === filter);

  const stepColors: Record<string, { bg: string; color: string; border: string }> = {
    "Новая":       { bg: "#fff7e6", color: "#d48806", border: "#ffe58f" },
    "В обработке": { bg: "#eef4ff", color: "#70a0ff", border: "#70a0ff" },
    "Закрыта":     { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  };

  return (
    <>
      {error && <ErrorBanner message={error} />}
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Жалобы</div>
        <div className={s.filterRow}>
          {filters.map(f => (
            <button
              key={f}
              className={`${s.filterBtn} ${filter === f ? s.filterBtnActive : ""}`}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>Тип</th>
              <th className={s.th}>Объект жалобы</th>
              <th className={s.th}>Автор</th>
              <th className={s.th}>Статус</th>
              <th className={s.th}>Дата</th>
              <th className={s.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow cols={6} />}
            {!loading && filtered.length === 0 && <EmptyRow cols={6} text="Нет жалоб с таким статусом" />}
            {filtered.map(c => {
              const statusRu = COMPLAINT_STATUS[c.status] || c.status;
              return (
                <tr key={c.id} className={`${s.tr} ${s.trClickable}`} onClick={() => { setSelected(c); setResolution(""); }}>
                  <td className={s.td}>{c.type}</td>
                  <td className={s.td}><strong>{c.target_name}</strong></td>
                  <td className={s.td}>{c.author_name}</td>
                  <td className={s.td}><span className={statusClass(statusRu, s)}>{statusRu}</span></td>
                  <td className={s.td}>{formatDate(c.created_at)}</td>
                  <td className={s.td} onClick={e => e.stopPropagation()}>
                    <div className={s.actionCell}>
                      {c.status === "new" && (
                        <button className={s.btnNeutral} onClick={() => updateStatus(c.id, "in_progress")}>
                          Взять в работу
                        </button>
                      )}
                      {c.status === "in_progress" && (
                        <button className={s.btnApprove} onClick={() => { setSelected(c); setResolution(""); }}>
                          Закрыть
                        </button>
                      )}
                      {c.status === "closed" && <span className={s.actionStatusText}>✓ Закрыта</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (() => {
        const statusRu = COMPLAINT_STATUS[selected.status] || selected.status;
        const steps = ["Новая", "В обработке", "Закрыта"];
        const current = steps.indexOf(statusRu);
        return (
          <Modal
            title={`Жалоба #${selected.id} — ${selected.type}`}
            onClose={() => { setSelected(null); setResolution(""); }}
          >
            {/* Workflow steps */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
              {steps.map((step, i) => {
                const isActive = i === current;
                const isDone   = i < current;
                const sc = stepColors[step];
                return (
                  <span key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: (isActive || isDone) ? sc.bg : "#f5f5f5",
                      color:      (isActive || isDone) ? sc.color : "#bfbfbf",
                      border:     `1px solid ${(isActive || isDone) ? sc.border : "#e8e8e8"}`,
                      opacity: isDone ? 0.7 : 1,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: (isActive || isDone) ? sc.color : "#d9d9d9", flexShrink: 0 }} />
                      {step}
                    </span>
                    {i < 2 && <span style={{ color: "#d9d9d9", fontSize: 12 }}>→</span>}
                  </span>
                );
              })}
            </div>

            <Detail label="Тип жалобы">{selected.type}</Detail>
            <Detail label="Объект жалобы">{selected.target_name}</Detail>
            <Detail label="Автор (пользователь)">{selected.author_name}</Detail>
            <Detail label="Описание жалобы">{selected.description}</Detail>
            <Detail label="Дата подачи">{formatDate(selected.created_at)}</Detail>

            {selected.status === "new" && (
              <div style={{ marginTop: 16, padding: "14px 16px", background: "#fff7e6", borderRadius: 8, border: "1px solid #ffe58f", fontSize: 13, color: "#7c4a00" }}>
                Жалоба ещё не взята в обработку. Нажмите кнопку ниже, чтобы начать работу с ней.
                <div style={{ marginTop: 12 }}>
                  <button
                    className={s.btnNeutral}
                    style={{ fontSize: 13, padding: "8px 20px" }}
                    onClick={() => updateStatus(selected.id, "in_progress")}
                  >Взять в работу</button>
                </div>
              </div>
            )}

            {selected.status === "in_progress" && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: "#939393", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Резолюция / Принятые меры
                </div>
                <textarea
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  placeholder="Опишите, какие меры были приняты по данной жалобе..."
                  style={{
                    width: "100%", minHeight: 100, padding: "10px 12px",
                    borderRadius: 8, border: "1.5px solid #d9d9d9", fontSize: 13,
                    fontFamily: "Inter, sans-serif", resize: "vertical", outline: "none",
                    boxSizing: "border-box", color: "#3a3a3a",
                  }}
                  onFocus={e => e.target.style.borderColor = "#70a0ff"}
                  onBlur={e => e.target.style.borderColor = "#d9d9d9"}
                />
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button
                    className={s.btnApprove}
                    style={{ fontSize: 13, padding: "8px 20px", opacity: resolution.trim() ? 1 : 0.5, cursor: resolution.trim() ? "pointer" : "not-allowed" }}
                    onClick={() => {
                      if (resolution.trim()) {
                        updateStatus(selected.id, "closed").then(() => {
                          setSelected(null);
                          setResolution("");
                        });
                      }
                    }}
                  >✓ Закрыть жалобу</button>
                  <button
                    className={s.btnReject}
                    style={{ fontSize: 13, padding: "8px 20px" }}
                    onClick={() => { setSelected(null); setResolution(""); }}
                  >Отмена</button>
                </div>
                {!resolution.trim() && (
                  <div style={{ fontSize: 12, color: "#faad14", marginTop: 6 }}>⚠ Напишите резолюцию перед закрытием жалобы</div>
                )}
              </div>
            )}
          </Modal>
        );
      })()}
    </>
  );
}


// ── Users ──
function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmBlock, setConfirmBlock] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminAPI.getUsers()
      .then(data => setItems(data))
      .catch(err => { console.error("GET /admin/users:", err); setError(getApiError(err)); })
      .finally(() => setLoading(false));
  }, []);

  const setStatus = async (id: number, is_active: boolean) => {
    try {
      await adminAPI.updateUserStatus(id, is_active);
      setItems(prev => prev.map(u => u.id === id ? { ...u, is_active } : u));
      setConfirmBlock(null);
    } catch {}
  };

  const changeRole = async (user: AdminUser) => {
    const newRoleId = isElevatedRole(user) ? USER_ROLE_ID : MODERATOR_ROLE_ID;
    try {
      await adminAPI.updateUserRole(user.id, newRoleId);
      setItems(prev => prev.map(u => u.id === user.id ? {
        ...u,
        role_id: newRoleId,
        role: { ...u.role, id: newRoleId, name: isElevatedRole(u) ? "user" : "moderator" },
      } : u));
    } catch {}
  };

  const filtered = search.trim()
    ? items.filter(u => {
        const name = `${u.first_name} ${u.last_name}`.toLowerCase();
        return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      })
    : items;

  return (
    <>
      {error && <ErrorBanner message={error} />}
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Пользователи</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени или email"
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e0e0e0", fontSize: 13, outline: "none", width: 220 }}
          />
          <span style={{ fontSize: 13, color: "#939393" }}>Всего: {items.length}</span>
        </div>
      </div>

      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>Имя</th>
              <th className={s.th}>Email</th>
              <th className={s.th}>Роль</th>
              <th className={s.th}>Статус</th>
              <th className={s.th}>Дата регистрации</th>
              <th className={s.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow cols={6} />}
            {!loading && filtered.length === 0 && <EmptyRow cols={6} text="Нет пользователей" />}
            {filtered.map(u => {
              const fullName  = `${u.first_name} ${u.last_name}`.trim() || u.username || u.email;
              const roleLabel = displayRole(u);
              const elevated  = isElevatedRole(u);
              const statusRu  = u.is_active ? "Активен" : "Заблокирован";
              const isAdmin   = u.role?.name === "admin";
              return (
                <Fragment key={u.id}>
                  <tr className={s.tr}>
                    <td className={s.td}><strong>{fullName}</strong></td>
                    <td className={s.td}>{u.email}</td>
                    <td className={s.td}>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 20,
                        fontSize: 12, fontWeight: 500,
                        background: elevated ? "#f9f0ff" : "#f5f5f5",
                        color:      elevated ? "#722ed1" : "#595959",
                        border:     `1px solid ${elevated ? "#d3adf7" : "#e8e8e8"}`,
                      }}>{roleLabel}</span>
                    </td>
                    <td className={s.td}><span className={statusClass(statusRu, s)}>{statusRu}</span></td>
                    <td className={s.td}>{formatDate(u.created_at)}</td>
                    <td className={s.td}>
                      <div className={s.actionCell}>
                        {u.is_active ? (
                          <button className={s.btnReject} onClick={() => setConfirmBlock(u.id)}>Заблокировать</button>
                        ) : (
                          <button className={s.btnApprove} onClick={() => setStatus(u.id, true)}>Разблокировать</button>
                        )}
                        <button
                          className={s.btnNeutral}
                          onClick={() => changeRole(u)}
                          disabled={!u.is_active || isAdmin}
                          title={isAdmin ? "Нельзя менять роль администратора" : !u.is_active ? "Нельзя менять роль заблокированному" : "Сменить роль"}
                          style={{ opacity: (!u.is_active || isAdmin) ? 0.35 : 1, cursor: (!u.is_active || isAdmin) ? "not-allowed" : "pointer" }}
                        >
                          {elevated ? "→ Пользователь" : "→ Модератор"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {confirmBlock === u.id && (
                    <tr key={`confirm-${u.id}`}>
                      <td colSpan={6} style={{ padding: 0, borderBottom: "none" }}>
                        <div style={{
                          margin: "0 20px 12px", padding: "12px 16px", background: "#fff1f0",
                          borderRadius: 8, border: "1px solid #ffa39e",
                          display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#cf1322",
                        }}>
                          <span style={{ flex: 1 }}>Вы уверены, что хотите заблокировать <strong>{fullName}</strong>?</span>
                          <button className={s.btnReject} style={{ whiteSpace: "nowrap" }} onClick={() => setStatus(u.id, false)}>Да, заблокировать</button>
                          <button className={s.btnNeutral} style={{ whiteSpace: "nowrap" }} onClick={() => setConfirmBlock(null)}>Отмена</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}


// ── Logs ──
function LogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState("Все");

  useEffect(() => {
    adminAPI.getLogs()
      .then(data => setLogs(data))
      .catch(err => { console.error("GET /admin/logs:", err); setError(getApiError(err)); })
      .finally(() => setLoading(false));
  }, []);

  const dotClass: Record<string, string> = {
    green:  s.logDotGreen,
    red:    s.logDotRed,
    orange: s.logDotOrange,
    blue:   s.logDotBlue,
  };

  const catStyle: Record<string, { bg: string; color: string; border: string }> = {
    "Компания":     { bg: "#eef4ff", color: "#70a0ff", border: "#70a0ff" },
    "Объявление":   { bg: "#f9f0ff", color: "#722ed1", border: "#d3adf7" },
    "Жалоба":       { bg: "#fff7e6", color: "#d48806", border: "#ffe58f" },
    "Пользователь": { bg: "#fff1f0", color: "#cf1322", border: "#ffa39e" },
  };

  const categories = ["Все", "Компания", "Объявление", "Жалоба", "Пользователь"];

  const mapped = logs.map(log => ({
    ...log,
    text:     log.details || log.action_type,
    meta:     `${log.admin_name} (${log.admin_role}) • ${formatDate(log.created_at)}`,
    color:    logColor(log.action_type),
    category: logCategory(log.target_type),
  }));

  const visible = catFilter === "Все" ? mapped : mapped.filter(l => l.category === catFilter);

  return (
    <>
      {error && <ErrorBanner message={error} />}
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Журнал действий</div>
        <div className={s.filterRow}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${s.filterBtn} ${catFilter === cat ? s.filterBtnActive : ""}`}
              onClick={() => setCatFilter(cat)}
            >{cat}</button>
          ))}
        </div>
      </div>

      <div className={s.logList}>
        {loading && (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "#939393", fontSize: 13 }}>Загрузка...</div>
        )}
        {!loading && visible.length === 0 && (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "#939393", fontSize: 13 }}>Нет записей в этой категории</div>
        )}
        {visible.map(log => (
          <div
            key={log.id}
            className={`${s.logItem} ${active === log.id ? s.logItemActive : ""}`}
            onClick={() => setActive(active === log.id ? null : log.id)}
          >
            <div className={`${s.logDot} ${dotClass[log.color] || s.logDotBlue}`} />
            <div className={s.logContent}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div className={s.logText}>{log.text}</div>
                {catStyle[log.category] && (
                  <span style={{
                    display: "inline-block", padding: "1px 8px", borderRadius: 20,
                    fontSize: 11, fontWeight: 500,
                    background: catStyle[log.category].bg,
                    color:      catStyle[log.category].color,
                    border:     `1px solid ${catStyle[log.category].border}`,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}>{log.category}</span>
                )}
              </div>
              <div className={s.logMeta}>{log.meta}</div>
            </div>
            <div className={s.logChevron}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {active === log.id ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
              </svg>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}


// ── Stats ──
function StatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [period, setPeriod] = useState("7 дней");
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  const periodDays: Record<string, number> = { "7 дней": 7, "30 дней": 30, "3 дня": 3 };

  useEffect(() => {
    adminAPI.getStatsOverview()
      .then(data => setOverview(data))
      .catch(() => {})
      .finally(() => setLoadingOverview(false));
  }, []);

  useEffect(() => {
    setLoadingChart(true);
    adminAPI.getStatsActivity(periodDays[period])
      .then(data => setActivity(data))
      .catch(() => setActivity([]))
      .finally(() => setLoadingChart(false));
  }, [period]);

  const chart  = activity.map(p => p.new_users + p.new_companies + p.new_listings);
  const labels = activity.map(p => {
    try { return new Date(p.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }); }
    catch { return p.date; }
  });
  const maxH = Math.max(...chart, 1);

  const statCards = [
    {
      label: "Всего пользователей",
      value: loadingOverview ? "..." : (overview?.total_users ?? 0).toLocaleString("ru-RU"),
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    },
    {
      label: "Компании",
      value: loadingOverview ? "..." : (overview?.total_companies ?? 0).toLocaleString("ru-RU"),
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V8h4V2h8v20M16 22h4v-8h-4"/><path d="M2 22h20"/></svg>,
    },
    {
      label: "Объявления",
      value: loadingOverview ? "..." : (overview?.total_listings ?? 0).toLocaleString("ru-RU"),
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>,
    },
    {
      label: "На модерации",
      value: loadingOverview ? "..." : (overview?.on_moderation ?? 0).toLocaleString("ru-RU"),
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#faad14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
    },
  ];

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Статистика платформы</div>
      </div>

      <div className={s.statsGrid}>
        {statCards.map(card => (
          <div key={card.label} className={s.statCard}>
            <div className={s.statCardHeader}>
              <span className={s.statCardIcon}>{card.icon}</span>
              <span className={s.statCardLabel}>{card.label}</span>
            </div>
            <div className={s.statCardValue}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className={s.chartCard}>
        <div className={s.chartHeader}>
          <div className={s.chartTitle}>Активность за последние {period}</div>
          <div className={s.filterRow}>
            {["7 дней", "30 дней", "3 дня"].map(p => (
              <button key={p} className={`${s.filterBtn} ${period === p ? s.filterBtnActive : ""}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
        </div>

        {loadingChart ? (
          <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "#939393", fontSize: 13 }}>Загрузка...</div>
        ) : chart.length === 0 ? (
          <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "#939393", fontSize: 13 }}>Нет данных</div>
        ) : (
          <>
            <div className={s.chartBars} style={{ alignItems: "flex-end", height: 140, padding: "0 4px" }}>
              {chart.map((h, i) => (
                <div key={i} className={s.chartBarWrap} style={{ minWidth: 0 }}>
                  <div
                    className={s.chartBar}
                    style={{ height: `${Math.max((h / maxH) * 100, 6)}%`, background: "linear-gradient(180deg, #70a0ff 0%, #5080e0 100%)", opacity: 0.88 }}
                    title={`${h} действий`}
                  />
                  {chart.length <= 10 && <div className={s.chartLabel}>{labels[i]}</div>}
                </div>
              ))}
            </div>
            {chart.length > 10 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, padding: "0 4px", fontSize: 11, color: "#939393" }}>
                <span>{labels[0]}</span>
                <span>{labels[Math.floor(labels.length / 2)]}</span>
                <span>{labels[labels.length - 1]}</span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

const AdminDashboard: FunctionComponent = () => {
  const [tab, setTab] = useState("companies");

  const pages: Record<string, ReactNode> = {
    companies:  <CompaniesPage />,
    listings:   <ListingsPage />,
    complaints: <ComplaintsPage />,
    users:      <UsersPage />,
    logs:       <LogsPage />,
    stats:      <StatsPage />,
  };

  return (
    <div className={s.adminLayout}>
      <AdminSidebar activeTab={tab} onNav={setTab} />
      <main className={s.main}>
        <div className={s.content}>{pages[tab]}</div>
      </main>
    </div>
  );
};

export default AdminDashboard;
