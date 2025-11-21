import React from 'react';
import styles from './offers.module.scss';

function Offers() {
  const files = [
    { name: 'Политика конфиденциальности', url: '/files/privacy-policy.docx' },
    { name: 'Договор оферта', url: '/files/agreement.docx' },
    { name: 'Политика персональных данных', url: '/files/data-policy.docx' },
  ];

  return (
    <div className={styles.agreement}>
      <div className={styles.container}>
        <h1 className={styles.title}>Доставка и оплата</h1>

        <div className={styles.info}>
          <p>
            <strong>ИП Симонян Т.В.</strong>
          </p>
          <p>Адрес: 672000 Забайкальский край, г. Чита, ул. Курнатовского, 30</p>
          <p>Кафе «Doner kebab»</p>
          <p>Тел: 8914-487-17-17, 8929-481-17-17</p>
          <p>Режим работы: Пн-Сб 9:30-23:00, Вс 10:00-23:00</p>
          <p>Доставка: Пн-Вс 10:00-22:30</p>
          <p>Для писем: eduard.s.i@mail.ru</p>
          <p></p>
        </div>

        <h2 className={styles.downloadTitle}>Скачать документы:</h2>
        <div className={styles.downloads}>
          {files.map((file, index) => (
            <a key={index} href={file.url} download className={styles.downloadBtn}>
              {file.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Offers;
