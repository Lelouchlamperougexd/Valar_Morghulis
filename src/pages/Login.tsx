import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/Login.module.css";

type Props = {
  onClose: () => void;
};

const Container: FunctionComponent<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isValidForm = email.includes("@") && email.includes(".") && password.length >= 6;

  const handleLogin = () => {
    if (!isValidForm) return;
    onClose();
    navigate('/admin');
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
            
            <div className={styles.container6 }>
              
              <input
                className={styles.emailInput}
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <img src="src/assets/email.svg" className={styles.icon} alt="aa"/>
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
              />
              <img src="src/assets/password.svg" className={styles.icon} alt=""/>
               <img src="src/assets/password2.svg" className={styles.buttonIcon} alt=""/>
            </div>
             
          </div>
        </div>

        {/* BUTTON */}
        <button 
          className={styles.button} 
          onClick={handleLogin}
          disabled={!isValidForm}
        >
          Войти
        </button>

      </div>
    </div>
  );
};

export default Container;