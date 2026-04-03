import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/SignUp.module.css";
import { registerUser, getErrorMessage } from "../api/auth";
import { useAuth } from "../context/AuthContext";

type Props = {
  onClose: () => void;
  onBack: () => void;
};

const SignUpUser: FunctionComponent<Props> = ({ onClose, onBack }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidForm =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.includes("@") &&
    email.includes(".") &&
    phone.trim().length >= 10 &&
    password.length >= 8 &&
    password === confirmPassword &&
    agreed;

  const handleSubmit = async () => {
    if (!isValidForm) return;
    setError("");
    setLoading(true);

    try {
      const data = await registerUser({
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        password_confirmation: confirmPassword,
        phone,
      });

      // Auto-login: extract token from response
      const { token, ...user } = data;
      login(token, user);

      onClose();
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container} style={{ height: "auto", maxHeight: "90vh" }}>
      <div className={styles.container18} style={{ position: "sticky", background: "#fff", zIndex: 10 }}>
        <div className={styles.heading2}>
          <div className={styles.div10}>Регистрация</div>
        </div>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.container2Outer}>
        <div className={styles.paragraph} style={{ marginBottom: "24px", textAlign: "center", width: "100%" }}>
          <div className={styles.div}>Шаг 2 из 2</div>
        </div>

        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Имя<span>*</span></label>
              <input type="text" className={styles.input} placeholder="Алуа" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Фамилия<span>*</span></label>
              <input type="text" className={styles.input} placeholder="Садыкова" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email<span>*</span></label>
              <input type="email" className={styles.input} placeholder="sadykova@example.kz" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Телефон<span>*</span></label>
              <input type="tel" className={styles.input} placeholder="+7 700 000 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Пароль<span>*</span></label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${styles.input} ${styles.passwordInput}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button type="button" className={styles.eyeButton} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Повторите пароль<span>*</span></label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`${styles.input} ${styles.passwordInput}`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <button type="button" className={styles.eyeButton} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Password mismatch hint */}
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <div style={{ color: "#e53e3e", fontSize: "12px", marginTop: "-8px", marginBottom: "4px" }}>
              Пароли не совпадают
            </div>
          )}

          <label className={styles.checkboxRow}>
            <input type="checkbox" className={styles.checkbox} checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>Я принимаю условия сервиса и согласен(а) на обработку персональных данных.</span>
          </label>

          {/* Error */}
          {error && (
            <div style={{ color: "#e53e3e", fontSize: "13px", padding: "8px 12px", background: "#fff5f5", borderRadius: "6px", border: "1px solid #fed7d7" }}>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.buttonSecondary} onClick={onBack} disabled={loading}>Назад</button>
            <button
              className={styles.buttonPrimary}
              disabled={!isValidForm || loading}
              style={{
                backgroundColor: isValidForm && !loading ? "#70a0ff" : "#d2d2d2",
                cursor: isValidForm && !loading ? "pointer" : "not-allowed",
                transition: "all 0.3s ease",
                opacity: loading ? 0.7 : 1,
              }}
              onClick={handleSubmit}
            >
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpUser;
