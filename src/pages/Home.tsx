import { useState, type FunctionComponent } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../css/App.module.css";
import Container from "./Login";
import SignUp from "./SignUp";

const Home: FunctionComponent = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className={styles.realEstateLandingPageIniti}>
      <div className={styles.body}>
        <div className={styles.pk}>
          <div className={styles.mainContent}>
            <div className={styles.section}>
              <div className={styles.container}>
                <div className={styles.heading2}>
                  <div className={styles.div}>Как работает платформа</div>
                </div>
                <div className={styles.paragraph}>
                  <div className={styles.div2}>
                    Четыре этапа работы с объектами недвижимости
                  </div>
                </div>
              </div>
              <div className={styles.container2}>
                <div className={styles.container3}>
                  <img className={styles.containerIcon} alt="" />
                  <div className={styles.container4}>
                    <div className={styles.div3}>01</div>
                  </div>
                  <div className={styles.heading3}>
                    <div className={styles.div4}>Поиск объектов на карте</div>
                  </div>
                  <div className={styles.paragraph2}>
                    <div className={styles.div5}>
                      Фильтрация по городу, району и параметрам.
                    </div>
                  </div>
                </div>
                <div className={styles.container5}>
                  <img className={styles.containerIcon} alt="" />
                  <div className={styles.container4}>
                    <div className={styles.div3}>02</div>
                  </div>
                  <div className={styles.heading32}>
                    <div className={styles.div7}>
                      Просмотр проверенных объявлений
                    </div>
                  </div>
                  <div className={styles.paragraph3}>
                    <div className={styles.div8}>
                      Модерация и верификация всех объявлений.
                    </div>
                  </div>
                </div>
                <div className={styles.container7}>
                  <img className={styles.containerIcon} alt="" />
                  <div className={styles.container4}>
                    <div className={styles.div3}>03</div>
                  </div>
                  <div className={styles.heading3}>
                    <div className={styles.div10}>Связь с агентством</div>
                  </div>
                  <div className={styles.paragraph2}>
                    <div className={styles.div11}>
                      Встроенный чат для прямого общения.
                    </div>
                  </div>
                </div>
                <div className={styles.container9}>
                  <img className={styles.containerIcon} alt="" />
                  <div className={styles.container4}>
                    <div className={styles.div3}>04</div>
                  </div>
                  <div className={styles.heading3}>
                    <div className={styles.div13}>Бронирование объекта</div>
                  </div>
                  <div className={styles.paragraph2}>
                    <div className={styles.div14}>
                      Отправка заявки без онлайн-оплаты.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.section2}>
              <div className={styles.container}>
                <div className={styles.heading2}>
                  <div className={styles.div15}>Платформа для разных ролей</div>
                </div>
                <div className={styles.paragraph}>
                  <div className={styles.div16}>
                    Функциональность для покупателей, агентств и застройщиков
                  </div>
                </div>
              </div>
              <div className={styles.container12}>
                <div className={styles.container13}>
                  <div className={styles.container14}>
                    <img
                      className={styles.imageIcon}
                      src="src/assets/source/Image.jpg"
                      alt=""
                    />
                    <div className={styles.container15} />
                    <div className={styles.container16}>
                      <img
                        className={styles.containerIcon5}
                        src="src/assets/Icon-17.svg"
                        alt=""
                      />
                      <div className={styles.heading35}>
                        <div className={styles.div17}>Покупателям</div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.container17}>
                    <div className={styles.list}>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text}>
                          <div className={styles.div18}>
                            Проверенные объявления
                          </div>
                        </div>
                      </div>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text2}>
                          <div className={styles.div18}>Карта и фильтры</div>
                        </div>
                      </div>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text3}>
                          <div className={styles.div18}>
                            Прямая связь с агентствами
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.button}>
                      <div className={styles.div21}>Подробнее</div>
                    </div>
                  </div>
                </div>
                <div className={styles.container18}>
                  <div className={styles.container14}>
                    <img
                      className={styles.imageIcon}
                      src="src/assets/Image (Агентствам).png"
                      alt=""
                    />
                    <div className={styles.container15} />
                    <div className={styles.container21}>
                      <img
                        className={styles.containerIcon5}
                        src="src/assets/Icon-15.svg"
                        alt=""
                      />
                      <div className={styles.heading35}>
                        <div className={styles.div17}>Агентствам</div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.container17}>
                    <div className={styles.list}>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text4}>
                          <div className={styles.div18}>Личный кабинет</div>
                        </div>
                      </div>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text5}>
                          <div className={styles.div18}>
                            Управление объявлениями
                          </div>
                        </div>
                      </div>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text6}>
                          <div className={styles.div18}>Заявки и чаты</div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.button}>
                      <div className={styles.div26}>Подробнее</div>
                    </div>
                  </div>
                </div>
                <div className={styles.container23}>
                  <div className={styles.container14}>
                    <img
                      className={styles.imageIcon}
                      src="src/assets/Image (Застройщикам).png"
                      alt=""
                    />
                    <div className={styles.container15} />
                    <div className={styles.container26}>
                      <img
                        className={styles.containerIcon5}
                        src="src/assets/Icon-14.svg"
                        alt=""
                      />
                      <div className={styles.heading37}>
                        <div className={styles.div17}>Застройщикам</div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.container17}>
                    <div className={styles.list}>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text7}>
                          <div className={styles.div18}>
                            Размещение новостроек
                          </div>
                        </div>
                      </div>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text8}>
                          <div className={styles.div18}>
                            Управление проектами
                          </div>
                        </div>
                      </div>
                      <div className={styles.listItem}>
                        <img
                          className={styles.containerIcon6}
                          src="src/assets/Icon-16.svg"
                          alt=""
                        />
                        <div className={styles.text9}>
                          <div className={styles.div18}>
                            Аналитика просмотров
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.button}>
                      <div className={styles.div21}>Подробнее</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.section3}>
              <div className={styles.container28}>
                <div className={styles.container29}>
                  <img
                    className={styles.icon}
                    src="src/assets/Icon-13.svg"
                    alt=""
                  />
                  <div className={styles.text10}>
                    <div className={styles.div32}>Система контроля</div>
                  </div>
                </div>
                <div className={styles.heading23}>
                  <div className={styles.div33}>
                    Безопасность и контроль качества
                  </div>
                </div>
                <div className={styles.paragraph7}>
                  <div className={styles.div34}>
                    Верификация агентств, модерация объявлений и защищённая
                    коммуникация.
                  </div>
                </div>
                <div className={styles.container30}>
                  <div className={styles.button4} onClick={() => navigate('/catalog')} style={{ cursor: 'pointer' }}>
                    <div className={styles.div35}>Найти объект</div>
                  </div>
                  <div className={styles.button5}>
                    <div className={styles.div36}>
                      Зарегистрировать агентство
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.container31}>
                <div className={styles.container32}>
                  <div className={styles.container33}>
                    <div className={styles.container34}>
                      <img
                        className={styles.containerIcon17}
                        src="src/assets/Icon-12.svg"
                        alt=""
                      />
                      <div className={styles.container35}>
                        <div className={styles.container36}>
                          <div className={styles.heading38}>
                            <div className={styles.div37}>
                              Верификация объявлений
                            </div>
                          </div>
                          <div className={styles.text11}>
                            <div className={styles.div38}>Проверено</div>
                          </div>
                        </div>
                        <div className={styles.paragraph8}>
                          <div className={styles.div39}>
                            Проверка данных агентств и документов.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.container33}>
                    <div className={styles.container34}>
                      <img
                        className={styles.containerIcon17}
                        src="src/assets/Icon-11.svg"
                        alt=""
                      />
                      <div className={styles.container35}>
                        <div className={styles.container36}>
                          <div className={styles.heading39}>
                            <div className={styles.div37}>
                              Модерация контента
                            </div>
                          </div>
                          <div className={styles.text12}>
                            <div className={styles.div38}>
                              Контроль качества
                            </div>
                          </div>
                        </div>
                        <div className={styles.paragraph8}>
                          <div className={styles.div39}>
                            Ручная проверка всех объявлений.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.container33}>
                    <div className={styles.container34}>
                      <img
                        className={styles.containerIcon17}
                        src="src/assets/Icon-10.svg"
                        alt=""
                      />
                      <div className={styles.container35}>
                        <div className={styles.container36}>
                          <div className={styles.heading310}>
                            <div className={styles.div37}>
                              Безопасная коммуникация
                            </div>
                          </div>
                          <div className={styles.text13}>
                            <div className={styles.div38}>Защищено</div>
                          </div>
                        </div>
                        <div className={styles.paragraph8}>
                          <div className={styles.div39}>
                            Встроенный чат без передачи личных данных.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.container45}>
                  <div className={styles.container46}>
                    <div className={styles.container47}>
                      <div className={styles.k}>~10K</div>
                    </div>
                    <div className={styles.container48}>
                      <div className={styles.infoplatformkz}>Объектов</div>
                    </div>
                  </div>
                  <div className={styles.container49}>
                    <div className={styles.container47}>
                      <div className={styles.k}>~500</div>
                    </div>
                    <div className={styles.container48}>
                      <div className={styles.infoplatformkz}>Агентств</div>
                    </div>
                  </div>
                  <div className={styles.container52}>
                    <div className={styles.container47}>
                      <div className={styles.k}>~50K</div>
                    </div>
                    <div className={styles.container48}>
                      <div className={styles.infoplatformkz}>Пользователей</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.section4}>
              <div className={styles.container55}>
                <div className={styles.container56} />
              </div>
              <div className={styles.container57}>
                <div className={styles.container58}>
                  <div className={styles.heading1}>
                    <div className={styles.div50}>
                      Платформа для агентств и застройщиков
                    </div>
                  </div>
                  <div className={styles.paragraph11}>
                    <div className={styles.div51}>
                      Размещение и поиск проверенной недвижимости с модерацией и
                      прямой связью с агентствами.
                    </div>
                  </div>
                  <div className={styles.container59}>
                    <div className={styles.button6} onClick={() => navigate('/catalog')} style={{ cursor: 'pointer' }}>
                      <img
                        className={styles.icon2}
                        src="src/assets/Icon-21.svg"
                        alt=""
                      />
                      <div className={styles.div52}>Найти объект</div>
                    </div>
                    <div className={styles.button7}>
                      <div className={styles.div53}>
                        Зарегистрировать агентство
                      </div>
                    </div>
                  </div>
                  <div className={styles.container60}>
                    <div className={styles.container61}>
                      <div className={styles.container62} />
                      <div className={styles.text14}>
                        <div className={styles.infoplatformkz}>
                          Проверенные объявления
                        </div>
                      </div>
                    </div>
                    <div className={styles.container63}>
                      <div className={styles.container62} />
                      <div className={styles.text14}>
                        <div className={styles.infoplatformkz}>Модерация</div>
                      </div>
                    </div>
                    <div className={styles.container65}>
                      <div className={styles.container62} />
                      <div className={styles.text14}>
                        <div className={styles.infoplatformkz}>
                          Поиск на карте
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.container67}>
                  <div className={styles.heading311}>
                    <div className={styles.div37}>Быстрый поиск объектов</div>
                  </div>
                  <div className={styles.container68}>
                    <div className={styles.container69}>
                      <div className={styles.label}>
                        <div className={styles.div32}>Город</div>
                      </div>
                      <div className={styles.container70}>
                        <div className={styles.text17}>
                          <div className={styles.div18}>Выберите город</div>
                        </div>
                        <img
                          className={styles.icon3}
                          src="src/assets/Icon-8.svg"
                          alt=""
                        />
                      </div>
                    </div>
                    <div className={styles.container69}>
                      <div className={styles.label}>
                        <div className={styles.div32}>Тип недвижимости</div>
                      </div>
                      <div className={styles.container70}>
                        <div className={styles.text18}>
                          <div className={styles.div18}>Квартира</div>
                        </div>
                        <img
                          className={styles.icon3}
                          src="src/assets/Icon-7.svg"
                          alt=""
                        />
                      </div>
                    </div>
                    <div className={styles.container73}>
                      <div className={styles.container74}>
                        <div className={styles.label}>
                          <div className={styles.div32}>Цена от</div>
                        </div>
                        <div className={styles.textInput}>
                          <div className={styles.div63}>0</div>
                        </div>
                      </div>
                      <div className={styles.container75}>
                        <div className={styles.label}>
                          <div className={styles.div32}>Цена до</div>
                        </div>
                        <div className={styles.textInput}>
                          <div className={styles.div63}>∞</div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.button8}>
                      <img
                        className={styles.icon5}
                        src="src/assets/Icon-21.svg"
                        alt=""
                      />
                      <div className={styles.div66}>Поиск</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.footer}>
            <div className={styles.container76}>
              <div className={styles.container77}>
                <div className={styles.container78}>
                  <div className={styles.heading311}>
                    <div className={styles.div37}>Qonys</div>
                  </div>
                  <div className={styles.paragraph12}>
                    <div className={styles.div68}>
                      Платформа для поиска проверенных объектов недвижимости.
                      Соединяем покупателей, агентства и застройщиков.
                    </div>
                  </div>
                  <div className={styles.container79}>
                    <img
                      className={styles.linkIcon}
                      src="src/assets/Icon-6.svg"
                      alt=""
                    />
                    <img
                      className={styles.linkIcon}
                      src="src/assets/Icon-5.svg"
                      alt=""
                    />
                    <img
                      className={styles.linkIcon}
                      src="src/assets/Icon-4.svg"
                      alt=""
                    />
                  </div>
                </div>
                <div className={styles.container80}>
                  <div className={styles.listItem}>
                    <div className={styles.div69}>О платформе</div>
                  </div>
                  <div className={styles.list4}>
                    <div className={styles.listItem10}>
                      <div className={styles.div70}>О нас</div>
                    </div>
                    <div className={styles.listItem10}>
                      <div className={styles.div70}>Как это работает</div>
                    </div>
                    <div className={styles.listItem10}>
                      <div className={styles.div70}>Тарифы</div>
                    </div>
                    <div className={styles.listItem10}>
                      <div className={styles.div70}>Блог</div>
                    </div>
                  </div>
                </div>
                <div className={styles.container81}>
                  <div className={styles.listItem}>
                    <div className={styles.div69}>Пользователям</div>
                  </div>
                  <div className={styles.list4}>
                    <div className={styles.listItem10}>
                      <div className={styles.div70}>Поиск объектов</div>
                    </div>
                    <div className={styles.listItem10}>
                      <div className={styles.div70}>Агентствам</div>
                    </div>
                    <div className={styles.listItem10}>
                      <div className={styles.div70}>Застройщикам</div>
                    </div>
                    <div className={styles.listItem10}>
                      <div className={styles.div70}>Помощь</div>
                    </div>
                  </div>
                </div>
                <div className={styles.container82}>
                  <div className={styles.listItem}>
                    <div className={styles.div69}>Контакты</div>
                  </div>
                  <div className={styles.list6}>
                    <div className={styles.listItem18}>
                      <img
                        className={styles.icon6}
                        src="src/assets/Icon-3.svg"
                        alt=""
                      />
                      <div className={styles.text19}>
                        <div className={styles.infoplatformkz}>
                          г. Алматы, ул. Примерная, 123
                        </div>
                      </div>
                    </div>
                    <div className={styles.listItem19}>
                      <img
                        className={styles.icon7}
                        src="src/assets/Icon-2.svg"
                        alt=""
                      />
                      <div className={styles.text20}>
                        <div className={styles.infoplatformkz}>
                          +7 700 000 00 00
                        </div>
                      </div>
                    </div>
                    <div className={styles.listItem19}>
                      <img
                        className={styles.icon7}
                        src="src/assets/Icon-1.svg"
                        alt=""
                      />
                      <div className={styles.text21}>
                        <div className={styles.infoplatformkz}>
                          info@platform.kz
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.container83}>
                <div className={styles.paragraph13}>
                  <div className={styles.infoplatformkz}>
                    © 2026 Qonys. Все права защищены.
                  </div>
                </div>
                <div className={styles.container84}>
                  <div className={styles.link}>
                    <div className={styles.infoplatformkz}>
                      Политика конфиденциальности
                    </div>
                  </div>
                  <div className={styles.link2}>
                    <div className={styles.infoplatformkz}>
                      Условия использования
                    </div>
                  </div>
                  <div className={styles.link3}>
                    <div className={styles.infoplatformkz}>Cookie</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.header}>
        <div className={styles.container85}>
          <div className={styles.container86}>
            <div className={styles.paragraph14} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <img src="/src/assets/logo.png" alt="Qonys" style={{ height: '80px', objectFit: 'contain', transform: 'translateY(10px)' }} />
            </div>
          </div>
          <div className={styles.navigation}>
            <div className={styles.link4}>
              <div className={styles.div18}>Главная</div>
            </div>
            <div className={styles.button9} onClick={() => navigate('/catalog')} style={{ cursor: 'pointer' }}>
              <div className={styles.div87}>Каталог</div>
            </div>
          </div>
          <div className={styles.container87}>
            <div className={styles.button10}>
              <div className={styles.div88}>Создать объявление</div>
            </div>
            <div className={styles.button11} onClick={() => setShowRegister(true)}>
              <div className={styles.div88}>Зарегистрироваться</div>
            </div>
            <div className={styles.button12} onClick={() => setShowLogin(true)}>
              <img src="src/assets/Icon.svg" className={styles.icon9} />
              <div className={styles.div90}>Войти</div>
            </div>
          </div>
        </div>
      </div>
      {showLogin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <Container onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}
      {showRegister && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <SignUp onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
