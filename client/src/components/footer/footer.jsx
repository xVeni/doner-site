import styles from './footer.module.scss';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <div className={styles.footer}>
      <div className={styles.footerTop}>
        <div className={styles.footerLogo}>
          <img src="/images/logo.png" alt="Логотип" className={styles.logoCircle} />
          <div>
            <h3>Doner Kebab Чита</h3>
            <p>+7(914) 487‒17‒17</p>
          </div>
        </div>

        <div className={styles.footerLinks}>
          <div>
            <Link to="/offer">
              <p>Доставка и оплата</p>
            </Link>
            <Link to="/about">
              <p>О компании</p>
            </Link>
          </div>

          <div>
            <Link to="https://yandex.ru/profile/1768126806?lang=ru">
              <p>Отзывы</p>
            </Link>
            <Link to="/zone">
              <p>Зоны покрытия доставки</p>
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>© Doner Kebab, 2025</p>
        <p>Забайкальский край, г. Чита, ул. Курнатовского, 30</p>
      </div>
    </div>
  );
}

export default Footer;
