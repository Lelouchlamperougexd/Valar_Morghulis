import type { FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import s from "../css/Admin.module.css";
import logo from "../assets/logo.png";


interface Props {
  activeTab: string;
  onNav: (tab: string) => void;
}

const NAV_ITEMS = [
  { key: "companies",  label: "Компании",     icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V8h4V2h8v20M16 22h4v-8h-4"/><path d="M2 22h20M8 6h.01M12 6h.01M12 10h.01M12 14h.01M8 10h.01"/></svg> },
  { key: "listings",   label: "Объявления",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg> },
  { key: "complaints", label: "Жалобы",       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> },
  { key: "users",      label: "Пользователи", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  { key: "logs",       label: "Логи",         icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { key: "stats",      label: "Статистика",   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
];

const AdminSidebar: FunctionComponent<Props> = ({ activeTab, onNav }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <aside className={s.sidebar}>
      <div className={s.sidebarTop}>
        <div className={s.sidebarLogo}>
          <img src={logo} alt="Qonys" className={s.sidebarLogoImg} />
          <span className={s.sidebarLogoName}>Qonys</span>
        </div>
        <button className={s.backBtn} onClick={() => navigate("/")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          На главную
        </button>
        <div className={s.sidebarTitle}>Панель администратора</div>
      </div>
      <nav className={s.navMenu}>
        {NAV_ITEMS.map(item => (
          <div
            key={item.key}
            className={`${s.navItem} ${activeTab === item.key ? s.active : ""}`}
            onClick={() => onNav(item.key)}
          >
            <span className={s.navItemIcon}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>
      <div style={{ marginTop: "auto", padding: "16px 12px", borderTop: "1px solid #f0f0f0" }}>
        <div
          className={s.navItem}
          style={{ color: "#f5222d" }}
          onClick={() => { logout(); navigate("/"); }}
        >
          <span className={s.navItemIcon} style={{ color: "#f5222d", opacity: 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </span>
          Выйти
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
