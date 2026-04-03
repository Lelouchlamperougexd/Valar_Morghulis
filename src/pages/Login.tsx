import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Login.module.css";
import { loginUser, loginAdmin, getErrorMessage } from "../api/auth";
import { useAuth } from "../context/AuthContext";

type Props = {
  onClose: () => void;
};

const Container: FunctionComponent<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidForm =
    email.includes("@") && email.includes(".") && password.length >= 6;

  const handleLogin = async () => {
    if (!isValidForm) return;
    setError("");
    setLoading(true);

    try {
      // Try admin login first; fall back to regular user login
      let data;
      try {
        data = await loginAdmin({ email, password });
      } catch {
        data = await loginUser({ email, password });
      }

      login(data.token, data.user);
      onClose();

      // Route by role level: admin/moderator → /admin, agency/dev → /agency, user → /dashboard
      const level = data.user.role?.level ?? 0;
      if (level >= 3) {
        navigate("/admin");
      } else if (level === 2) {
        navigate("/agency");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.container2}>
        <div className={styles.heading2}>
          <div className={styles.div}>Войти</div>
        </div>

        {/* кнопка закрытия */}
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      {/* CONTENT */}
      <div className={styles.container3}>
        <div className={styles.paragraph}>
          <div className={styles.div2}>
            Войдите в свой аккаунт для использования платформы
          </div>
        </div>

        {/* EMAIL */}
        <div className={styles.container4}>
          <div className={styles.container5}>
            <div className={styles.label}>
              <div className={styles.email}>
                Email<span className={styles.span}>*</span>
              </div>
            </div>

            <div className={styles.container6}>
              <input
                className={styles.emailInput}
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <img src="src/assets/email.svg" className={styles.icon} alt="" />
            </div>
          </div>

          {/* PASSWORD */}
          <div className={styles.container5}>
            <div className={styles.label}>
              <div className={styles.email}>
                Пароль<span className={styles.span}>*</span>
              </div>
            </div>

            <div className={styles.container6}>
              <input
                className={styles.passwordInput}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <img src="src/assets/password.svg" className={styles.icon} alt="" />
              <img src="src/assets/password2.svg" className={styles.buttonIcon} alt="" />
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              color: "#e53e3e",
              fontSize: "13px",
              marginTop: "8px",
              padding: "8px 12px",
              background: "#fff5f5",
              borderRadius: "6px",
              border: "1px solid #fed7d7",
            }}
          >
            {error}
          </div>
        )}

        {/* BUTTON */}
        <button
          className={styles.button}
          onClick={handleLogin}
          disabled={!isValidForm || loading}
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Входим..." : "Войти"}
        </button>
      </div>
    </div>
  );
};

export default Container;