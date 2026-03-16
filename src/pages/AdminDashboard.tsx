import { useState, type FunctionComponent } from "react";
import s from "../css/Admin.module.css";
import AdminSidebar from "../components/AdminSidebar";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const COMPANIES = [
  { id: 1, name: "Элит Недвижимость",     type: "Агентство",   status: "На проверке",   docs: 5, date: "15.02.2026" },
  { id: 2, name: "ПремьерГрад",           type: "Застройщик",  status: "Верифицировано",docs: 8, date: "10.02.2026" },
  { id: 3, name: "Столичная Недвижимость",type: "Агентство",   status: "На проверке",   docs: 3, date: "17.02.2026" },
];

const LISTINGS = [
  { id: 1, title: "Двухкомнатная квартира в центре",  company: "Элит Недвижимость", price: "12 500 000 ₸", status: "Отклонено",     date: "16.02.2026" },
  { id: 2, title: "Трёхкомнатная квартира с видом",   company: "Элит Недвижимость", price: "18 900 000 ₸", status: "На модерации",  date: "16.02.2026" },
  { id: 3, title: "Студия в новостройке",             company: "ПремьерГрад",       price: "7 800 000 ₸",  status: "Активно",       date: "15.02.2026" },
];

const COMPLAINTS = [
  { id: 1, type: "Некорректное объявление", target: "Двухкомнатная квартира", author: "Пользователь #4521", status: "Новая",       date: "17.02.2026", desc: "Указаны неверные характеристики объекта" },
  { id: 2, type: "Нарушение правил",        target: "Элит Недвижимость",      author: "Пользователь #3412", status: "В обработке", date: "16.02.2026", desc: "Агентство не отвечает на звонки и спамит." },
  { id: 3, type: "Мошенничество",           target: "Студия 30 м²",           author: "Пользователь #2341", status: "Закрыта",     date: "14.02.2026", desc: "Сдали объект другим, но взяли предоплату." },
];

const USERS = [
  { id: 1, name: "Иван Петров",   email: "ivan@mail.kz",   role: "Пользователь", status: "Активен",      regDate: "10.01.2025" },
  { id: 2, name: "Мария Сидорова",email: "maria@mail.kz",  role: "Пользователь", status: "Заблокирован", regDate: "15.02.2025" },
  { id: 3, name: "Алексей Иванов",email: "alex@mail.kz",   role: "Пользователь", status: "Заблокирован", regDate: "23.07.2025" },
];

const LOGS = [
  { id: 1, text: 'Одобрена компания "ПремьерГрад"',          meta: "Администратор • 17.02.2026 14:08", color: "green",  category: "Компания"   },
  { id: 2, text: 'Отклонено объявление "Студия 30м²"',        meta: "Модератор 1 • 17.02.2026 11:23",  color: "red",    category: "Объявление" },
  { id: 3, text: "Заблокирован пользователь #3412",            meta: "Администратор • 16.02.2026 17:12", color: "red",    category: "Пользователь" },
  { id: 4, text: "Обработана жалоба #4521",                   meta: "Модератор 1 • 16.02.2026 9:51",   color: "orange", category: "Жалоба"      },
  { id: 5, text: 'Верифицирована компания "Элит Недвижимость"',meta: "Администратор • 16.02.2026 8:47",  color: "green",  category: "Компания"   },
  { id: 6, text: 'Одобрено объявление "Трёхкомнатная квартира"',  meta: "Модератор 1 • 15.02.2026 10:05",  color: "green",  category: "Объявление" },
  { id: 7, text: "Закрыта жалоба #3412: меры приняты",      meta: "Модератор 1 • 14.02.2026 16:30",  color: "orange", category: "Жалоба"      },
];

const STAT_CHART_DATA: Record<string, number[]> = {
  "7 дней":  [42, 75, 55, 90, 65, 110, 80],
  "30 дней": [30, 55, 40, 80, 60, 95, 70, 85, 50, 65, 90, 75, 45, 60, 110, 80, 55, 70, 40, 95, 65, 85, 50, 75, 60, 90, 45, 70, 80, 65],
  "3 дня":   [88, 105, 72],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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
  };
  return `${st.badge} ${st[map[status] || "badge"]}`;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
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
  const [items, setItems] = useState(COMPANIES);
  const [filter, setFilter] = useState<"Все" | "На проверке">("Все");
  const [selected, setSelected] = useState<typeof COMPANIES[0] | null>(null);

  const approve = (id: number) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, status: "Верифицировано" } : c));
  const reject  = (id: number) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, status: "Отклонено" } : c));

  const displayed = filter === "Все" ? items : items.filter(c => c.status === "На проверке");

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Компании</div>
        <div className={s.filterRow}>
          <button
            className={`${s.filterBtn} ${filter === "Все" ? s.filterBtnActive : ""}`}
            onClick={() => setFilter("Все")}
          >
            Все
          </button>
          <button
            className={`${s.filterBtn} ${filter === "На проверке" ? s.filterBtnActive : ""}`}
            onClick={() => setFilter("На проверке")}
          >
            На проверке
          </button>
        </div>
      </div>
      <div className={s.tableCard}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>Название</th>
              <th className={s.th}>Тип</th>
              <th className={s.th}>Статус</th>
              <th className={s.th}>Документы</th>
              <th className={s.th}>Дата подачи</th>
              <th className={s.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr>
                <td colSpan={6} className={s.td} style={{ textAlign: 'center', color: '#939393', padding: '32px 20px' }}>
                  Нет компаний на проверке
                </td>
              </tr>
            )}
            {displayed.map(c => (
              <tr key={c.id} className={`${s.tr} ${s.trClickable}`} onClick={() => setSelected(c)}>
                <td className={s.td}><strong>{c.name}</strong></td>
                <td className={s.td}>{c.type}</td>
                <td className={s.td}><span className={statusClass(c.status, s)}>{c.status}</span></td>
                <td className={s.td}>{c.docs}</td>
                <td className={s.td}>{c.date}</td>
                <td className={s.td} onClick={e => e.stopPropagation()}>
                  <div className={s.actionCell}>
                    {c.status === "На проверке" ? (
                      <>
                        <button className={s.btnApprove} onClick={() => approve(c.id)}>Подтвердить</button>
                        <button className={s.btnReject}  onClick={() => reject(c.id)}>Отклонить</button>
                      </>
                    ) : (
                      <span className={s.actionStatusText}>
                        {c.status === "Верифицировано" ? "✓ Верифицировано" : "✕ Отклонено"}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <Detail label="Название компании">{selected.name}</Detail>
          <Detail label="Тип">{selected.type}</Detail>
          <Detail label="Статус"><span className={statusClass(selected.status, s)}>{selected.status}</span></Detail>
          <Detail label="Документов">{selected.docs} файл(ов)</Detail>
          <Detail label="Дата подачи">{selected.date}</Detail>
          {selected.status === "На проверке" && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                className={s.btnApprove}
                style={{ fontSize: 13, padding: '8px 20px' }}
                onClick={() => { approve(selected.id); setSelected(prev => prev ? { ...prev, status: "Верифицировано" } : null); }}
              >
                Подтвердить
              </button>
              <button
                className={s.btnReject}
                style={{ fontSize: 13, padding: '8px 20px' }}
                onClick={() => { reject(selected.id); setSelected(prev => prev ? { ...prev, status: "Отклонено" } : null); }}
              >
                Отклонить
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}



// ── Listings ──
type ListingItem = typeof LISTINGS[0] & { rejectReason?: string };

function ListingsPage() {
  const [items, setItems] = useState<ListingItem[]>(LISTINGS);
  const [selected, setSelected] = useState<ListingItem | null>(null);
  const [rejectMode, setRejectMode] = useState<number | null>(null); // id of item being rejected
  const [rejectReason, setRejectReason] = useState("");

  const approve = (id: number) => {
    setItems(p => p.map(i => i.id === id ? { ...i, status: "Активно" } : i));
    setSelected(prev => prev?.id === id ? { ...prev, status: "Активно" } : prev);
  };

  const startReject = (id: number) => {
    setRejectMode(id);
    setRejectReason("");
  };

  const confirmReject = (id: number, reason: string) => {
    setItems(p => p.map(i => i.id === id ? { ...i, status: "Отклонено", rejectReason: reason } : i));
    setSelected(prev => prev?.id === id ? { ...prev, status: "Отклонено", rejectReason: reason } : prev);
    setRejectMode(null);
    setRejectReason("");
  };

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Объявления на модерации</div>
        <span style={{ fontSize: 13, color: "#939393" }}>В очереди: {items.filter(i => i.status === "На модерации").length}</span>
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
            {items.map(item => (
              <>
                <tr key={item.id} className={`${s.tr} ${s.trClickable}`} onClick={() => setSelected(item)}>
                  <td className={s.td}><strong>{item.title}</strong></td>
                  <td className={s.td}>{item.company}</td>
                  <td className={s.td}>{item.price}</td>
                  <td className={s.td}><span className={statusClass(item.status, s)}>{item.status}</span></td>
                  <td className={s.td}>{item.date}</td>
                  <td className={s.td} onClick={e => e.stopPropagation()}>
                    <div className={s.actionCell}>
                      {item.status === "На модерации" ? (
                        <>
                          <button className={s.btnApprove} onClick={() => approve(item.id)}>Одобрить</button>
                          <button className={s.btnReject} onClick={() => startReject(item.id)}>Отклонить</button>
                        </>
                      ) : (
                        <span className={s.actionStatusText}>
                          {item.status === "Активно" ? "✓ Активно" : item.status === "Отклонено" ? "✕ Отклонено" : item.status}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {rejectMode === item.id && (
                  <tr key={`reject-${item.id}`}>
                    <td colSpan={6} style={{ padding: 0 }}>
                      <div style={{
                        margin: '0 20px 12px',
                        padding: '14px 16px',
                        background: '#fff8f8',
                        borderRadius: 8,
                        border: '1px solid #ffa39e',
                      }}>
                        <div style={{ fontSize: 13, color: '#cf1322', marginBottom: 8, fontWeight: 500 }}>
                          Причина отклонения «{item.title}»
                        </div>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Опишите причину отклонения объявления — автор её увидит..."
                          style={{
                            width: '100%', minHeight: 80, padding: '8px 10px',
                            borderRadius: 6, border: '1.5px solid #ffa39e', fontSize: 13,
                            fontFamily: 'Inter, sans-serif', resize: 'vertical', outline: 'none',
                            boxSizing: 'border-box', color: '#3a3a3a',
                          }}
                          onFocus={e => e.target.style.borderColor = '#ff7875'}
                          onBlur={e => e.target.style.borderColor = '#ffa39e'}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                          <button
                            className={s.btnReject}
                            style={{ fontSize: 12, padding: '6px 16px', opacity: rejectReason.trim() ? 1 : 0.45, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed' }}
                            onClick={() => rejectReason.trim() && confirmReject(item.id, rejectReason)}
                          >
                            Подтвердить отклонение
                          </button>
                          <button className={s.btnNeutral} style={{ fontSize: 12, padding: '6px 16px' }} onClick={() => setRejectMode(null)}>Отмена</button>
                          {!rejectReason.trim() && <span style={{ fontSize: 12, color: '#faad14' }}>Укажите причину</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <Detail label="Компания">{selected.company}</Detail>
          <Detail label="Цена"><span className={s.detailPrice}>{selected.price}</span></Detail>
          <Detail label="Статус"><span className={statusClass(selected.status, s)}>{selected.status}</span></Detail>
          <Detail label="Дата подачи">{selected.date}</Detail>
          {selected.rejectReason && <Detail label="Причина отклонения">{selected.rejectReason}</Detail>}
          {selected.status === "На модерации" && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className={s.btnApprove} style={{ fontSize: 13, padding: '8px 20px' }} onClick={() => { approve(selected.id); setSelected(null); }}>Одобрить</button>
              <button className={s.btnReject}  style={{ fontSize: 13, padding: '8px 20px' }} onClick={() => { setSelected(null); startReject(selected.id); }}>Отклонить...</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}


// ── Complaints ──
type Complaint = typeof COMPLAINTS[0] & { resolution?: string; assignedAt?: string };

function ComplaintsPage() {
  const [items, setItems] = useState<Complaint[]>(COMPLAINTS);
  const [filter, setFilter] = useState("Все");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState("");

  const filters = ["Все", "Новая", "В обработке", "Закрыта"];
  const filtered = filter === "Все" ? items : items.filter(c => c.status === filter);

  const updateItem = (id: number, patch: Partial<Complaint>) =>
    setItems(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));

  // Новая → В обработке
  const takeInProgress = (id: number) => {
    const now = new Date().toLocaleDateString("ru");
    updateItem(id, { status: "В обработке", assignedAt: now });
    setSelected(prev => prev ? { ...prev, status: "В обработке", assignedAt: now } : null);
  };

  // В обработке → Закрыта (с резолюцией)
  const closeComplaint = (id: number, res: string) => {
    updateItem(id, { status: "Закрыта", resolution: res });
    setSelected(null);
    setResolution("");
  };

  const openModal = (c: Complaint) => {
    setSelected(c);
    setResolution(c.resolution ?? "");
  };

  const stepColors: Record<string, { bg: string; color: string; border: string }> = {
    "Новая":        { bg: '#fff7e6', color: '#d48806', border: '#ffe58f' },
    "В обработке":  { bg: '#eef4ff', color: '#70a0ff', border: '#70a0ff' },
    "Закрыта":      { bg: '#f6ffed', color: '#389e0d', border: '#b7eb8f' },
  };

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Жалобы</div>
        <div className={s.filterRow}>
          {filters.map(f => (
            <button
              key={f}
              className={`${s.filterBtn} ${filter === f ? s.filterBtnActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className={s.td} style={{ textAlign: 'center', color: '#939393', padding: '32px 20px' }}>
                  Нет жалоб с таким статусом
                </td>
              </tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className={`${s.tr} ${s.trClickable}`} onClick={() => openModal(c)}>
                <td className={s.td}>{c.type}</td>
                <td className={s.td}><strong>{c.target}</strong></td>
                <td className={s.td}>{c.author}</td>
                <td className={s.td}><span className={statusClass(c.status, s)}>{c.status}</span></td>
                <td className={s.td}>{c.date}</td>
                <td className={s.td} onClick={e => e.stopPropagation()}>
                  <div className={s.actionCell}>
                    {c.status === "Новая" && (
                      <button className={s.btnNeutral} onClick={() => takeInProgress(c.id)}>
                        Взять в работу
                      </button>
                    )}
                    {c.status === "В обработке" && (
                      <button className={s.btnApprove} onClick={() => openModal(c)}>
                        Закрыть
                      </button>
                    )}
                    {c.status === "Закрыта" && (
                      <span className={s.actionStatusText}>✓ Закрыта</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal title={`Жалоба #${selected.id} — ${selected.type}`} onClose={() => { setSelected(null); setResolution(""); }}>
          {/* Workflow steps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
            {["Новая", "В обработке", "Закрыта"].map((step, i) => {
              const steps = ["Новая", "В обработке", "Закрыта"];
              const current = steps.indexOf(selected.status);
              const isActive = i === current;
              const isDone = i < current;
              const sc = stepColors[step];
              return (
                <span key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    background: (isActive || isDone) ? sc.bg : '#f5f5f5',
                    color: (isActive || isDone) ? sc.color : '#bfbfbf',
                    border: `1px solid ${(isActive || isDone) ? sc.border : '#e8e8e8'}`,
                    opacity: isDone ? 0.7 : 1,
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: (isActive || isDone) ? sc.color : '#d9d9d9',
                      flexShrink: 0,
                    }} />
                    {step}
                  </span>
                  {i < 2 && <span style={{ color: '#d9d9d9', fontSize: 12 }}>→</span>}
                </span>
              );
            })}
          </div>

          <Detail label="Тип жалобы">{selected.type}</Detail>
          <Detail label="Объект жалобы">{selected.target}</Detail>
          <Detail label="Автор (пользователь)">{selected.author}</Detail>
          <Detail label="Описание жалобы">{selected.desc}</Detail>
          <Detail label="Дата подачи">{selected.date}</Detail>
          {selected.assignedAt && (
            <Detail label="Взята в обработку">{selected.assignedAt}</Detail>
          )}

          {/* Step-specific actions */}
          {selected.status === "Новая" && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: '#fff7e6', borderRadius: 8, border: '1px solid #ffe58f', fontSize: 13, color: '#7c4a00' }}>
              Жалоба ещё не взята в обработку. Нажмите кнопку ниже, чтобы начать работу с ней.
              <div style={{ marginTop: 12 }}>
                <button
                  className={s.btnNeutral}
                  style={{ fontSize: 13, padding: '8px 20px' }}
                  onClick={() => takeInProgress(selected.id)}
                >
                  Взять в работу
                </button>
              </div>
            </div>
          )}

          {selected.status === "В обработке" && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 12, color: '#939393', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Связаться с автором / Ответ пользователю
              </div>
              <div style={{ padding: '12px 14px', background: '#f0f7ff', borderRadius: 8, border: '1px solid #91d5ff', fontSize: 13, color: '#096dd9', marginBottom: 12 }}>
                💬 Свяжитесь с пользователем <strong>{selected.author}</strong> через встроенный чат или по email, чтобы уточнить детали жалобы и сообщить о принятых мерах.
              </div>
              <div style={{ marginBottom: 6, fontSize: 12, color: '#939393', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Резолюция / Принятые меры
              </div>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="Опишите, какие меры были приняты по данной жалобе..."
                style={{
                  width: '100%',
                  minHeight: 100,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #d9d9d9',
                  fontSize: 13,
                  fontFamily: 'Inter, sans-serif',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  color: '#3a3a3a',
                }}
                onFocus={e => e.target.style.borderColor = '#70a0ff'}
                onBlur={e => e.target.style.borderColor = '#d9d9d9'}
              />
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button
                  className={s.btnApprove}
                  style={{ fontSize: 13, padding: '8px 20px', opacity: resolution.trim() ? 1 : 0.5, cursor: resolution.trim() ? 'pointer' : 'not-allowed' }}
                  onClick={() => resolution.trim() && closeComplaint(selected.id, resolution)}
                >
                  ✓ Закрыть жалобу
                </button>
                <button
                  className={s.btnReject}
                  style={{ fontSize: 13, padding: '8px 20px' }}
                  onClick={() => { setSelected(null); setResolution(""); }}
                >
                  Отмена
                </button>
              </div>
              {!resolution.trim() && (
                <div style={{ fontSize: 12, color: '#faad14', marginTop: 6 }}>
                  ⚠ Напишите резолюцию перед закрытием жалобы
                </div>
              )}
            </div>
          )}

          {selected.status === "Закрыта" && selected.resolution && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
              <div style={{ fontSize: 12, color: '#389e0d', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                ✓ Резолюция
              </div>
              <div style={{ fontSize: 13, color: '#3a3a3a' }}>{selected.resolution}</div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}



// ── Users ──
function UsersPage() {
  const [items, setItems] = useState(USERS);
  const [confirmBlock, setConfirmBlock] = useState<number | null>(null);

  const block = (id: number) => {
    setItems(p => p.map(u => u.id === id ? { ...u, status: "Заблокирован" } : u));
    setConfirmBlock(null);
  };
  const unblock = (id: number) =>
    setItems(p => p.map(u => u.id === id ? { ...u, status: "Активен" } : u));
  const changeRole = (id: number) =>
    setItems(p => p.map(u => u.id === id ? { ...u, role: u.role === "Пользователь" ? "Модератор" : "Пользователь" } : u));

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Пользователи</div>
        <span style={{ fontSize: 13, color: "#939393" }}>Всего: {items.length}</span>
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
            {items.map(u => (
              <>
                <tr key={u.id} className={s.tr}>
                  <td className={s.td}><strong>{u.name}</strong></td>
                  <td className={s.td}>{u.email}</td>
                  <td className={s.td}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      background: u.role === "Модератор" ? '#f9f0ff' : '#f5f5f5',
                      color: u.role === "Модератор" ? '#722ed1' : '#595959',
                      border: `1px solid ${u.role === "Модератор" ? '#d3adf7' : '#e8e8e8'}`,
                    }}>{u.role}</span>
                  </td>
                  <td className={s.td}><span className={statusClass(u.status, s)}>{u.status}</span></td>
                  <td className={s.td}>{u.regDate}</td>
                  <td className={s.td}>
                    <div className={s.actionCell}>
                      {u.status === "Активен" ? (
                        <button
                          className={s.btnReject}
                          onClick={() => setConfirmBlock(u.id)}
                        >
                          Заблокировать
                        </button>
                      ) : (
                        <button
                          className={s.btnApprove}
                          onClick={() => unblock(u.id)}
                        >
                          Разблокировать
                        </button>
                      )}
                      <button
                        className={s.btnNeutral}
                        onClick={() => changeRole(u.id)}
                        disabled={u.status === "Заблокирован"}
                        title={u.status === "Заблокирован" ? "Нельзя менять роль заблокированному пользователю" : `Сменить роль`}
                        style={{ opacity: u.status === "Заблокирован" ? 0.35 : 1, cursor: u.status === "Заблокирован" ? 'not-allowed' : 'pointer' }}
                      >
                        {u.role === "Пользователь" ? "→ Модератор" : "→ Пользователь"}
                      </button>
                    </div>
                  </td>
                </tr>
                {confirmBlock === u.id && (
                  <tr key={`confirm-${u.id}`}>
                    <td colSpan={6} style={{ padding: 0, borderBottom: 'none' }}>
                      <div style={{
                        margin: '0 20px 12px',
                        padding: '12px 16px',
                        background: '#fff1f0',
                        borderRadius: 8,
                        border: '1px solid #ffa39e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 13,
                        color: '#cf1322',
                      }}>
                        <span style={{ flex: 1 }}>Вы уверены, что хотите заблокировать пользователя <strong>{u.name}</strong>?</span>
                        <button
                          className={s.btnReject}
                          style={{ whiteSpace: 'nowrap' }}
                          onClick={() => block(u.id)}
                        >
                          Да, заблокировать
                        </button>
                        <button
                          className={s.btnNeutral}
                          style={{ whiteSpace: 'nowrap' }}
                          onClick={() => setConfirmBlock(null)}
                        >
                          Отмена
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Logs ──
function LogsPage() {
  const [active, setActive] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState("Все");

  const dotClass: Record<string, string> = { green: s.logDotGreen, red: s.logDotRed, orange: s.logDotOrange, blue: s.logDotBlue };

  const catStyle: Record<string, { bg: string; color: string; border: string }> = {
    "Компания":   { bg: '#eef4ff', color: '#70a0ff', border: '#70a0ff' },
    "Объявление": { bg: '#f9f0ff', color: '#722ed1', border: '#d3adf7' },
    "Жалоба":    { bg: '#fff7e6', color: '#d48806', border: '#ffe58f' },
    "Пользователь": { bg: '#fff1f0', color: '#cf1322', border: '#ffa39e' },
  };

  const categories = ["Все", "Компания", "Объявление", "Жалоба", "Пользователь"];
  const visibleLogs = catFilter === "Все" ? LOGS : LOGS.filter(l => l.category === catFilter);

  return (
    <>
      <div className={s.pageHeader}>
        <div className={s.pageTitle}>Журнал действий</div>
        <div className={s.filterRow}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${s.filterBtn} ${catFilter === cat ? s.filterBtnActive : ""}`}
              onClick={() => setCatFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className={s.logList}>
        {visibleLogs.length === 0 && (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: '#939393', fontSize: 13 }}>
            Нет записей в этой категории
          </div>
        )}
        {visibleLogs.map(log => (
          <div
            key={log.id}
            className={`${s.logItem} ${active === log.id ? s.logItemActive : ""}`}
            onClick={() => setActive(active === log.id ? null : log.id)}
          >
            <div className={`${s.logDot} ${dotClass[log.color]}`} />
            <div className={s.logContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div className={s.logText}>{log.text}</div>
                {catStyle[log.category] && (
                  <span style={{
                    display: 'inline-block',
                    padding: '1px 8px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 500,
                    background: catStyle[log.category].bg,
                    color: catStyle[log.category].color,
                    border: `1px solid ${catStyle[log.category].border}`,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {log.category}
                  </span>
                )}
              </div>
              <div className={s.logMeta}>{log.meta}</div>
            </div>
            <div className={s.logChevron}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {active === log.id ? <path d="M18 15l-6-6-6 6"/> : <path d="M6 9l6 6 6-6"/>}
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
  const [period, setPeriod] = useState("7 дней");
  const periodDays: Record<string, string[]> = {
    "7 дней":  ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    "30 дней": Array.from({ length: 30 }, (_, i) => `${i + 1}`),
    "3 дня":   ["Сегодня", "Вчера", "2 дня назад"],
  };

  const chart = STAT_CHART_DATA[period];
  const days  = periodDays[period];
  const maxH  = Math.max(...chart);

  const statCards = [
    { label: "Всего пользователей", value: "1 245", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
    { label: "Компании",            value: "87",    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V8h4V2h8v20M16 22h4v-8h-4"/><path d="M2 22h20"/></svg> },
    { label: "Объявления",          value: "3 421", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg> },
    { label: "На модерации",        value: "1",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#faad14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> },
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
        <div className={s.chartBars} style={{ alignItems: 'flex-end', height: 140, padding: '0 4px' }}>
          {chart.map((h, i) => (
            <div key={i} className={s.chartBarWrap} style={{ minWidth: 0 }}>
              <div
                className={s.chartBar}
                style={{ height: `${Math.max((h / maxH) * 100, 6)}%`, background: 'linear-gradient(180deg, #70a0ff 0%, #5080e0 100%)', opacity: 0.88 }}
                title={`${h} действий`}
              />
              {chart.length <= 10 && <div className={s.chartLabel}>{days[i]}</div>}
            </div>
          ))}
        </div>
        {chart.length > 10 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: '0 4px', fontSize: 11, color: '#939393' }}>
            <span>{days[0]}</span>
            <span>{days[Math.floor(days.length / 2)]}</span>
            <span>{days[days.length - 1]}</span>
          </div>
        )}
      </div>
    </>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

const AdminDashboard: FunctionComponent = () => {
  const [tab, setTab] = useState("companies");

  const pages: Record<string, React.ReactNode> = {
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
