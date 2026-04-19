import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Login.module.css";
import { loginUser, getErrorMessage } from "../api/auth";
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
  const [showPassword, setShowPassword] = useState(false);

  // Минимальная валидация формы
  const isValidForm =
    email.includes("@") && email.includes(".") && password.length >= 3;

  const handleLogin = async () => {
    if (!isValidForm) return;
    setError("");
    setLoading(true);

    try {
      const data = await loginUser({ email, password });

      login(data.token, data.user);
      onClose();

      // Roles from DB: admin(3), moderator(2), agency(1), developer(1), user(1)
      const roleName = data.user?.role?.name ?? "";

      if (roleName === "admin" || roleName === "moderator") {
        navigate("/admin");
      } else if (roleName === "agency") {
        navigate("/agency");
      } else if (roleName === "developer") {
        navigate("/developer");
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
                id="login-email"
                className={styles.emailInput}
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete="email"
              />
              <img src="/assets/email.svg" className={styles.icon} alt="" />
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
                id="login-password"
                className={styles.passwordInput}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete="current-password"
              />
              <img src="/assets/password.svg" className={styles.icon} alt="" />
              <img
                src="/assets/password2.svg"
                className={styles.buttonIcon2}
                alt="Показать пароль"
                style={{ cursor: "pointer" }}
                onClick={() => setShowPassword((v) => !v)}
              />
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
              padding: "10px 14px",
              background: "#fff5f5",
              borderRadius: "8px",
              border: "1px solid #fed7d7",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* BUTTON */}
        <button
          id="login-submit"
          className={styles.button}
          onClick={handleLogin}
          disabled={!isValidForm || loading}
          style={{ opacity: loading || !isValidForm ? 0.7 : 1 }}
        >
          {loading ? "Входим..." : "Войти"}
        </button>
      </div>
    </div>
  );
};

export default Container;