import { useCallback, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DeveloperDashboard: FunctionComponent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: "#ffffff",
        padding: "40px 20px",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "64px",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px" }}>
            🏗️ Qonys
          </span>
          <span
            style={{
              background: "linear-gradient(90deg, #a855f7, #3b82f6)",
              borderRadius: "20px",
              padding: "2px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#fff",
            }}
          >
            Застройщик
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
            {user?.first_name} {user?.last_name}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              color: "#f87171",
              padding: "8px 18px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)";
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          marginTop: "80px",
          textAlign: "center",
          maxWidth: "600px",
          width: "100%",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "28px",
            background: "linear-gradient(135deg, #a855f7, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "48px",
            margin: "0 auto 32px",
            boxShadow: "0 20px 60px rgba(168,85,247,0.4)",
          }}
        >
          🏗️
        </div>

        <h1
          style={{
            fontSize: "40px",
            fontWeight: 800,
            margin: "0 0 16px",
            background: "linear-gradient(135deg, #a855f7, #60a5fa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-1px",
          }}
        >
          Дашборд застройщика
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: "18px",
            lineHeight: 1.6,
            margin: "0 0 48px",
          }}
        >
          Добро пожаловать, {user?.first_name || "Застройщик"}!<br />
          Панель управления находится в разработке.
        </p>

        {/* Stats cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          {[
            { label: "Проекты", value: "—", icon: "🏢" },
            { label: "Объекты", value: "—", icon: "🏠" },
            { label: "Заявки", value: "—", icon: "📋" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "16px",
                padding: "24px 16px",
                backdropFilter: "blur(10px)",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(168,85,247,0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.icon}</div>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "#a855f7",
                  marginBottom: "4px",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(168,85,247,0.15)",
            border: "1px solid rgba(168,85,247,0.3)",
            borderRadius: "50px",
            padding: "10px 24px",
            fontSize: "14px",
            color: "#c084fc",
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#a855f7",
              display: "inline-block",
              animation: "pulse 2s infinite",
            }}
          />
          Функционал находится в разработке
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default DeveloperDashboard;
