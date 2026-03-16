import { useState, type FunctionComponent } from "react";
import styles from "../css/SignUp.module.css";
import SignUpUser from "./SignUpUser";
import SignUpCompany from "./SignUpCompany";

type Props = {
  onClose: () => void;
};

const SignUp: FunctionComponent<Props> = ({ onClose }) => {

  const [role, setRole] = useState<"user" | "agency" | "developer" | null>(null);
  const [step, setStep] = useState(1);

  if (step === 2 && role === "user") {
    return <SignUpUser onClose={onClose} onBack={() => setStep(1)} />;
  }

  if (step === 2 && (role === "agency" || role === "developer")) {
    return <SignUpCompany role={role} onClose={onClose} onBack={() => setStep(1)} />;
  }

  return (
    <div className={styles.container}>

      <div className={styles.container18}>
        <div className={styles.heading2}>
          <div className={styles.div10}>Регистрация</div>
        </div>

        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.container2}>

        <div className={styles.paragraph}>
          <div className={styles.div}>Шаг 1 из 2</div>
        </div>

        <div className={styles.heading3}>
          <div className={styles.div2}>Выберите тип аккаунта</div>
        </div>

        <div className={styles.container3}>

          {/* USER */}
          <button
            className={`${styles.button2} ${role === "user" ? styles.active : ""}`}
            onClick={() => setRole("user")}
          >
            <div className={styles.container4}>

              <div className={styles.radio}>
                {role === "user" && <div className={styles.radioFill}></div>}
              </div>

              <div className={styles.container7}>
                <div className={styles.container8}>
                  <img className={styles.icon} src="/assets/user.svg" alt="" />

                  <div className={styles.heading4}>
                    <div className={styles.div3}>Пользователь</div>
                  </div>
                </div>

                <div className={styles.paragraph2}>
                  <div className={styles.div4}>
                    Просмотр объектов и отправка заявок
                  </div>
                </div>
              </div>

            </div>
          </button>

          {/* AGENCY */}
          <button
            className={`${styles.button2} ${role === "agency" ? styles.active : ""}`}
            onClick={() => setRole("agency")}
          >
            <div className={styles.container4}>

              <div className={styles.radio}>
                {role === "agency" && <div className={styles.radioFill}></div>}
              </div>

              <div className={styles.container7}>
                <div className={styles.container8}>
                  <img className={styles.icon} src="/assets/agency.svg" alt="" />

                  <div className={styles.heading42}>
                    <div className={styles.div3}>Агентство недвижимости</div>
                  </div>
                </div>

                <div className={styles.paragraph2}>
                  <div className={styles.div4}>
                    Публикация объявлений и работа с клиентами
                  </div>
                </div>
              </div>

            </div>
          </button>

          {/* DEVELOPER */}
          <button
            className={`${styles.button2} ${role === "developer" ? styles.active : ""}`}
            onClick={() => setRole("developer")}
          >
            <div className={styles.container4}>

              <div className={styles.radio}>
                {role === "developer" && <div className={styles.radioFill}></div>}
              </div>

              <div className={styles.container7}>
                <div className={styles.container8}>
                  <img className={styles.icon} src="/assets/dev.svg" alt="" />

                  <div className={styles.heading43}>
                    <div className={styles.div3}>Застройщик</div>
                  </div>
                </div>

                <div className={styles.paragraph2}>
                  <div className={styles.div4}>
                    Размещение проектов и управление объектами
                  </div>
                </div>
              </div>

            </div>
          </button>

        </div>

        <button 
          className={styles.button4} 
          disabled={!role} 
          onClick={() => {
            if (role) setStep(2);
          }}
          style={{ opacity: role ? 1 : 0.5, cursor: role ? 'pointer' : 'not-allowed' }}
        >
          Продолжить
        </button>

      </div>
    </div>
  );
};

export default SignUp;