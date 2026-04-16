import { useState, useEffect, useRef, useCallback, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "../css/Dashboard.module.css";
import {
  getDashboardOverview,
  getFavorites,
  removeFavorite,
  getMyApplications,
  getChats,
  getMessages,
  sendMessage,
  updateProfile,
  changePassword,
  statusLabel,
  statusColor,
  type DashboardOverview,
  type FavoriteListing,
  type Application,
  type ChatSummary,
  type ApplicationMessage,
} from "../api/dashboard";
import { getErrorMessage } from "../api/auth";

const logo = "/assets/logo.png";

type TabId = "overview" | "favorites" | "applications" | "messages" | "settings";

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ h = 18, w = "100%", r = 8 }: { h?: number; w?: string | number; r?: number }) {
  return (
    <div
      style={{
        height: h, width: w, borderRadius: r,
        background: "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: "#939393" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#3a3a3a", marginBottom: 4 }}>{text}</div>
      {sub && <div style={{ fontSize: 13, color: "#b0b0b0" }}>{sub}</div>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 10px",
      borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      {statusLabel(status)}
    </span>
  );
}

// ─── Date format ──────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
      .format(new Date(iso));
  } catch { return iso.slice(0, 10); }
}

function fmtTime(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" })
      .format(new Date(iso));
  } catch { return ""; }
}

// ─── Application Detail Modal ─────────────────────────────────────────────────
function AppDetailModal({ app, onClose }: { app: Application; onClose: () => void }) {
  const rows: { label: string; value: string | number | boolean | null | undefined }[] = [
    { label: "Имя", value: app.full_name },
    { label: "Телефон", value: app.phone },
    { label: "Email", value: app.email },
    { label: "Тип сделки", value: app.deal_type === "rent" ? "Аренда" : "Продажа" },
    { label: "Жильцов", value: app.occupant_count },
    { label: "Дети", value: app.has_children == null ? null : app.has_children ? "Да" : "Нет" },
    { label: "Животные", value: app.has_pets == null ? null : app.has_pets ? "Да" : "Нет" },
    { label: "Студент", value: app.is_student == null ? null : app.is_student ? "Да" : "Нет" },
    { label: "Срок аренды (мес.)", value: app.stay_term_months },
    { label: "Ипотека", value: app.needs_mortgage == null ? null : app.needs_mortgage ? "Да" : "Нет" },
    { label: "Срок покупки", value: app.purchase_term },
    { label: "Комментарий", value: app.comment },
  ].filter(r => r.value != null && r.value !== "");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
              {app.listing_title ?? `Объект #${app.listing_id}`}
            </div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 2 }}>Заявка #{app.id} · Обновлено: {fmtDate(app.updated_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#939393", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge status={app.status} />
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "2px 10px",
            borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: app.is_compatible ? "#f6ffed" : "#fff7e6",
            color: app.is_compatible ? "#52c97a" : "#faad14",
            border: `1px solid ${app.is_compatible ? "#b7eb8f" : "#ffd591"}`,
          }}>
            {app.is_compatible ? "Подходит" : "Не подходит"}
          </span>
        </div>

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 0 }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < rows.length - 1 ? "1px solid #f5f5f5" : "none" }}>
              <span style={{ fontSize: 13, color: "#939393", flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 13, color: "#3a3a3a", textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{String(r.value)}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ marginTop: 24, width: "100%", padding: "12px 0", background: "#f5f5f5", border: "none", borderRadius: 10, fontSize: 14, cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

// ─── Chat window ──────────────────────────────────────────────────────────────
function ChatWindow({
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

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <button className={styles.chatBackButton} onClick={onBack}>←</button>
        <div className={styles.msgAvatar} style={{ width: 40, height: 40, fontSize: 16 }}>
          {chat.company_name.charAt(0)}
        </div>
        <div className={styles.chatTitleGroup}>
          <div className={styles.chatTitle}>{chat.company_name}</div>
          <div className={styles.chatSubtitle}>{chat.listing_title}</div>
        </div>
      </div>

      <div className={styles.chatMessages}>
        {loading && <div style={{ padding: 24, textAlign: "center", color: "#ccc" }}>Загрузка...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#b0b0b0", fontSize: 14 }}>
            Сообщений пока нет
          </div>
        )}
        {messages.map(msg => {
          const isSent = msg.sender_user_id === userId;
          return (
            <div key={msg.id} className={`${styles.messageBubble} ${isSent ? styles.messageSent : styles.messageReceived}`}>
              {msg.body}
              <div className={styles.messageTime}>{fmtTime(msg.created_at)}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className={styles.chatInputArea}>
        <input
          type="text"
          className={styles.chatInput}
          placeholder="Написать сообщение..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          disabled={sending}
        />
        <button className={styles.sendButton} onClick={handleSend} disabled={sending}>
          <img src="/assets/send.svg" alt="" style={{ width: 20, filter: "brightness(0) invert(1)" }} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard: FunctionComponent = () => {
  const navigate = useNavigate();
  const { logout, login, user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Data state
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [favorites, setFavorites] = useState<FavoriteListing[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);

  // Loading states
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [favLoading, setFavLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);

  // Error states
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [favError, setFavError] = useState<string | null>(null);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [chatsError, setChatsError] = useState<string | null>(null);

  // UI state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [activeChat, setActiveChat] = useState<ChatSummary | null>(null);
  const [removingFav, setRemovingFav] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Settings state
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load overview on mount
  useEffect(() => {
    getDashboardOverview()
      .then(setOverview)
      .catch(e => setOverviewError(getErrorMessage(e)))
      .finally(() => setOverviewLoading(false));
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === "favorites" && favorites.length === 0) {
      setFavLoading(true);
      setFavError(null);
      getFavorites()
        .then(setFavorites)
        .catch(e => setFavError(getErrorMessage(e)))
        .finally(() => setFavLoading(false));
    }
    if (activeTab === "applications" && applications.length === 0) {
      setAppsLoading(true);
      setAppsError(null);
      getMyApplications()
        .then(setApplications)
        .catch(e => setAppsError(getErrorMessage(e)))
        .finally(() => setAppsLoading(false));
    }
    if (activeTab === "messages" && chats.length === 0 && !activeChat) {
      setChatsLoading(true);
      setChatsError(null);
      getChats()
        .then(setChats)
        .catch(e => setChatsError(getErrorMessage(e)))
        .finally(() => setChatsLoading(false));
    }
  }, [activeTab]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRemoveFavorite = async (listingId: number) => {
    setRemovingFav(listingId);
    try {
      await removeFavorite(listingId);
      setFavorites(prev => prev.filter(f => f.listing_id !== listingId));
      if (overview) {
        setOverview(prev => prev ? { ...prev, favorites_count: Math.max(0, prev.favorites_count - 1) } : prev);
      }
      showToast("Удалено из избранного");
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingFav(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() && !lastName.trim() && !phone.trim()) return;
    setProfileError("");
    setProfileSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (firstName.trim()) payload.first_name = firstName.trim();
      if (lastName.trim()) payload.last_name = lastName.trim();
      if (phone.trim()) payload.phone = phone.trim();
      await updateProfile(payload);
      // Update the user in AuthContext so sidebar name reflects the change
      if (user && token) {
        login(token, {
          ...user,
          first_name: firstName.trim() || user.first_name,
          last_name: lastName.trim() || user.last_name,
          phone: phone.trim() || user.phone,
        });
      }
      showToast("Профиль успешно обновлён");
    } catch (e) {
      setProfileError(getErrorMessage(e));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (newPassword !== confirmPassword) { setPasswordError("Пароли не совпадают"); return; }
    if (newPassword.length < 8) { setPasswordError("Новый пароль должен быть не менее 8 символов"); return; }
    setPasswordSaving(true);
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword, new_password_confirmation: confirmPassword });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      showToast("Пароль успешно изменён");
    } catch (e) {
      setPasswordError(getErrorMessage(e));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setProfileImage(ev.target.result as string); };
    reader.readAsDataURL(file);
  };

  // ── Renderers ─────────────────────────────────────────────────────────────

  const renderOverview = () => {
    if (overviewLoading) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className={styles.summaryGrid}>
            {[0, 1, 2].map(i => <div key={i} className={styles.summaryCard}><Skeleton h={60} /></div>)}
          </div>
          <div className={styles.cardListContainer}><Skeleton h={120} /></div>
        </div>
      );
    }

    if (overviewError) {
      return (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "16px 20px", background: "#fff5f5", borderRadius: 12, border: "1px solid #fed7d7" }}>
          Не удалось загрузить данные: {overviewError}
        </div>
      );
    }

    const ov = overview;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Stats */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <img src="/assets/favorites.svg" alt="" style={{ width: 16 }} /> Избранное
            </div>
            <div className={styles.summaryValue}>{ov?.favorites_count ?? 0}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <img src="/assets/applications.svg" alt="" style={{ width: 16 }} /> Активные заявки
            </div>
            <div className={styles.summaryValue}>{ov?.active_applications_count ?? 0}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHeader}>
              <img src="/assets/messages.svg" alt="" style={{ width: 16 }} /> Непрочитанных
            </div>
            <div className={styles.summaryValue}>{ov?.unread_messages_count ?? 0}</div>
          </div>
        </div>

        {/* Recent favourites */}
        <div className={styles.cardListContainer}>
          <div className={styles.sectionTitle}>Недавно добавленные в избранное</div>
          {(!ov?.recent_listings || ov.recent_listings.length === 0) ? (
            <EmptyState icon="🏠" text="Нет избранных объектов" sub="Добавляйте понравившиеся объявления в избранное" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {ov.recent_listings.map(item => (
                <div key={item.listing_id} className={styles.propertyListCard} style={{ cursor: "pointer" }} onClick={() => navigate(`/property/${item.listing_id}`)}>
                  <div className={styles.propertyInfoBlock}>
                    {item.cover_url ? (
                      <img src={item.cover_url} alt={item.title} className={styles.propertyImage} style={{ objectFit: "cover" }} />
                    ) : (
                      <div className={styles.propertyImage} style={{ background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img src="/assets/home.svg" alt="" style={{ width: 28, opacity: 0.3 }} />
                      </div>
                    )}
                    <div className={styles.propertyDetails}>
                      <div className={styles.propertyTitle}>{item.title}</div>
                      <div className={styles.propertySubtitle}>
                        <img src="/assets/location.svg" alt="" style={{ width: 12, marginRight: 4 }} />
                        {item.city}
                      </div>
                      <div className={styles.propertyPrice}>{item.price.toLocaleString("ru-RU")} ₸</div>
                    </div>
                  </div>
                  <div className={styles.propertyMeta}>
                    {item.area && <div>{item.area} м²</div>}
                    <div>{fmtDate(item.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent applications */}
        <div className={styles.cardListContainer}>
          <div className={styles.sectionTitle}>Последние заявки</div>
          {(!ov?.recent_applications || ov.recent_applications.length === 0) ? (
            <EmptyState icon="📋" text="Заявок пока нет" sub="Заявки появятся когда вы откликнитесь на объявление" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ov.recent_applications.map(app => (
                <div key={app.id} className={styles.appCard} style={{ cursor: "pointer" }} onClick={() => { setActiveTab("applications"); }}>
                  <div className={styles.appInfo}>
                    <div className={styles.appTitle}>{app.listing_title}</div>
                    <div className={styles.appSubtitle}>{app.company_name}</div>
                  </div>
                  <div className={styles.appMeta}>
                    <StatusBadge status={app.status} />
                    <div className={styles.dateText}>{fmtDate(app.updated_at)}</div>
                    <div className={styles.arrowRight}>{">"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFavorites = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={styles.sectionTitle} style={{ background: "#fff", padding: "24px 32px", borderRadius: 16, margin: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
        Избранное
      </div>
      {favLoading ? (
        <div className={styles.favoritesGrid}>
          {[0, 1, 2].map(i => <div key={i} className={styles.favCard}><Skeleton h={200} /></div>)}
        </div>
      ) : favError ? (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7" }}>
          {favError}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState icon="❤️" text="Избранных объектов нет" sub="Добавляйте объявления в избранное и они появятся здесь" />
      ) : (
        <div className={styles.favoritesGrid}>
          {favorites.map(item => (
            <div key={item.listing_id} className={styles.favCard}>
              {item.cover_url ? (
                <img src={item.cover_url} alt={item.title} className={styles.favImage} style={{ objectFit: "cover", cursor: "pointer" }} onClick={() => navigate(`/property/${item.listing_id}`)} />
              ) : (
                <div className={styles.favImage} style={{ background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate(`/property/${item.listing_id}`)}>
                  <img src="/assets/home.svg" alt="" style={{ width: 40, opacity: 0.3 }} />
                </div>
              )}
              <div className={styles.favInfo}>
                <div className={styles.favTitle} style={{ cursor: "pointer" }} onClick={() => navigate(`/property/${item.listing_id}`)}>{item.title}</div>
                <div className={styles.favAddress}>
                  <img src="/assets/location.svg" alt="" style={{ width: 12, opacity: 0.5, marginRight: 4 }} />
                  {item.city}
                </div>
                <div className={styles.favFooter}>
                  <div className={styles.favPrice}>{item.price.toLocaleString("ru-RU")} ₸</div>
                  {item.area && <div className={styles.favArea}>{item.area} м²</div>}
                </div>
                <button
                  onClick={() => handleRemoveFavorite(item.listing_id)}
                  disabled={removingFav === item.listing_id}
                  style={{
                    marginTop: 8, width: "100%", padding: "6px 0", border: "1px solid #fed7d7",
                    borderRadius: 8, background: removingFav === item.listing_id ? "#f0f0f0" : "#fff5f5",
                    color: "#e53e3e", fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif",
                  }}
                >
                  {removingFav === item.listing_id ? "Удаление..." : "Удалить из избранного"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderApplications = () => (
    <div className={styles.cardListContainer} style={{ height: "fit-content" }}>
      <div className={styles.sectionTitle}>Мои заявки</div>
      {appsLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2].map(i => <Skeleton key={i} h={72} />)}
        </div>
      ) : appsError ? (
        <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7" }}>
          {appsError}
        </div>
      ) : applications.length === 0 ? (
        <EmptyState icon="📋" text="Заявок нет" sub="Когда вы откликнетесь на объявление, заявка появится здесь" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {applications.map(app => (
            <div
              key={app.id}
              className={styles.appCard}
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedApp(app)}
            >
              <div className={styles.appInfo}>
                <div className={styles.appTitle}>
                  {app.listing_title ?? `Объект #${app.listing_id}`}
                </div>
                <div className={styles.appSubtitle}>
                  {app.deal_type === "rent" ? "Аренда" : "Продажа"}
                  {" · "}
                  <span style={{ color: app.is_compatible ? "#52c97a" : "#faad14", fontWeight: 500 }}>
                    {app.is_compatible ? "Подходит" : "Не подходит"}
                  </span>
                </div>
              </div>
              <div className={styles.appMeta}>
                <StatusBadge status={app.status} />
                <div className={styles.dateText}>{fmtDate(app.updated_at)}</div>
                <div className={styles.arrowRight}>{">"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMessages = () => {
    if (activeChat) {
      return <ChatWindow chat={activeChat} userId={user?.id ?? 0} onBack={() => setActiveChat(null)} />;
    }
    return (
      <div className={styles.cardListContainer} style={{ height: "fit-content" }}>
        <div className={styles.sectionTitle}>Сообщения</div>
        {chatsLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1].map(i => <Skeleton key={i} h={72} />)}
          </div>
        ) : chatsError ? (
          <div style={{ color: "#e53e3e", fontSize: 13, padding: "12px 16px", background: "#fff5f5", borderRadius: 10, border: "1px solid #fed7d7" }}>
            {chatsError}
          </div>
        ) : chats.length === 0 ? (
          <EmptyState icon="💬" text="Сообщений нет" sub="Чаты появятся когда вы подадите заявку на объявление" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {chats.map(chat => (
              <div
                key={chat.application_id}
                className={styles.messageCard}
                onClick={() => setActiveChat(chat)}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.msgLeft}>
                  <div className={styles.msgAvatar} style={{ position: "relative" }}>
                    {chat.company_name.charAt(0)}
                    {chat.is_unread && (
                      <div style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, background: "#f5222d", borderRadius: "50%", border: "2px solid #fff" }} />
                    )}
                  </div>
                  <div className={styles.msgContent}>
                    <div className={styles.msgSender}>{chat.company_name}</div>
                    <div className={styles.msgPreview} style={{ fontStyle: "italic", color: chat.is_unread ? "#1a1a2e" : "#939393", fontWeight: chat.is_unread ? 600 : 400 }}>
                      {chat.last_message}
                    </div>
                    <div style={{ fontSize: 11, color: "#b0b0b0", marginTop: 2 }}>{chat.listing_title}</div>
                  </div>
                </div>
                <div className={styles.msgRight}>
                  <span style={{ fontSize: 12, color: "#b0b0b0" }}>{fmtTime(chat.last_message_at)}</span>
                  <span className={styles.arrowRight}>{">"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Profile */}
      <div className={styles.settingsContainer}>
        <div className={styles.sectionTitle} style={{ marginBottom: 24 }}>Персональные данные</div>

        <div className={styles.profileSection}>
          <div className={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()}>
            {profileImage
              ? <img src={profileImage} alt="Profile" className={styles.avatarImage} />
              : <span style={{ fontSize: 22, fontWeight: 700, color: "#70a0ff" }}>
                  {(user?.first_name?.charAt(0) ?? "") + (user?.last_name?.charAt(0) ?? "")}
                </span>
            }
            <div className={styles.avatarOverlay}>
              <img src="/assets/avatar.svg" alt="Upload" style={{ width: 24, filter: "brightness(0) invert(1)" }} />
            </div>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className={styles.uploadInput} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div style={{ fontSize: 13, color: "#939393", marginTop: 2 }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: "#70a0ff", marginTop: 2, textTransform: "capitalize" }}>
              {user?.role?.name ?? "Пользователь"}
            </div>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Имя</label>
            <input type="text" className={styles.formInput} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Имя" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Фамилия</label>
            <input type="text" className={styles.formInput} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Фамилия" />
          </div>
        </div>

        <div className={styles.formGroup} style={{ marginBottom: 24 }}>
          <label className={styles.formLabel}>Телефон</label>
          <input type="tel" className={styles.formInput} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (999) 000-00-00" />
        </div>

        <div className={styles.formGroup} style={{ marginBottom: 24 }}>
          <label className={styles.formLabel}>Email (нельзя изменить)</label>
          <input type="email" className={styles.formInput} value={user?.email ?? ""} disabled style={{ background: "#fafafa", color: "#939393" }} />
        </div>

        {profileError && (
          <div style={{ color: "#e53e3e", fontSize: 13, marginBottom: 16, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
            {profileError}
          </div>
        )}

        <button className={styles.btnPrimary} onClick={handleSaveProfile} disabled={profileSaving}>
          {profileSaving ? "Сохранение..." : "Сохранить изменения"}
        </button>
      </div>

      {/* Password */}
      <div className={styles.settingsContainer}>
        <div className={styles.sectionTitle} style={{ marginBottom: 24 }}>Безопасность</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Текущий пароль</label>
            <div style={{ position: "relative" }}>
              <input type={showOld ? "text" : "password"} className={styles.formInput} value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowOld(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}>
                {showOld ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Новый пароль</label>
            <div style={{ position: "relative" }}>
              <input type={showNew ? "text" : "password"} className={styles.formInput} value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordError(""); }} placeholder="Минимум 8 символов" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}>
                {showNew ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Подтверждение пароля</label>
            <input
              type="password" className={styles.formInput}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPasswordError(""); }}
              placeholder="Повторите новый пароль"
              style={{ borderColor: passwordError && confirmPassword ? "#ff4d4f" : undefined }}
            />
          </div>

          {passwordError && (
            <div style={{ color: "#e53e3e", fontSize: 13, padding: "8px 12px", background: "#fff5f5", borderRadius: 8, border: "1px solid #fed7d7" }}>
              {passwordError}
            </div>
          )}

          <button className={styles.btnPrimary} onClick={handleChangePassword} disabled={passwordSaving || !oldPassword || !newPassword || !confirmPassword}>
            {passwordSaving ? "Сохранение..." : "Изменить пароль"}
          </button>
        </div>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          На главную
        </button>
        <div className={styles.sidebarTitle}>Личный кабинет</div>
        <nav className={styles.navMenu}>
          {([
            { id: "overview",      label: "Обзор",      icon: "/assets/overview.svg" },
            { id: "favorites",     label: "Избранное",  icon: "/assets/favorites.svg" },
            { id: "applications",  label: "Заявки",     icon: "/assets/applications.svg" },
            { id: "messages",      label: "Сообщения",  icon: "/assets/messages.svg" },
          ] as { id: TabId; label: string; icon: string }[]).map(item => (
            <div
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.navItemActive : ""}`}
              onClick={() => { setActiveTab(item.id); if (item.id === "messages") setActiveChat(null); }}
            >
              <img src={item.icon} alt="" style={{ width: 18, opacity: activeTab === item.id ? 1 : 0.5 }} />
              {item.label}
              {item.id === "messages" && (overview?.unread_messages_count ?? 0) > 0 && (
                <span style={{ marginLeft: "auto", background: "#f5222d", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {overview!.unread_messages_count}
                </span>
              )}
            </div>
          ))}
          <div
            className={`${styles.navItem} ${activeTab === "settings" ? styles.navItemActive : ""}`}
            onClick={() => setActiveTab("settings")}
            style={{ marginTop: 16 }}
          >
            <img src="/assets/settings.svg" alt="" style={{ width: 18, opacity: activeTab === "settings" ? 1 : 0.5 }} />
            Настройки
          </div>
        </nav>

        {/* User info */}
        <div style={{ margin: "auto 0 0", padding: "12px 24px", borderTop: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#70a0ff", flexShrink: 0 }}>
              {(user?.first_name?.charAt(0) ?? "") + (user?.last_name?.charAt(0) ?? "")}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.first_name} {user?.last_name}
              </div>
              <div style={{ fontSize: 11, color: "#939393", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
            </div>
          </div>
          <div
            className={styles.navItem}
            style={{ color: "#f5222d", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            onClick={() => { logout(); navigate("/"); }}
          >
            <span style={{ display: "flex", alignItems: "center", opacity: 1 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            </span>
            Выйти
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>{renderContent()}</main>

      {/* Detail modal */}
      {selectedApp && (
        <AppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className={styles.toastCard}>
          <div style={{ fontSize: 18 }}>✓</div>
          {toast}
        </div>
      )}

      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
