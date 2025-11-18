import React from 'react';
import styles from './EmptyCart.module.scss';
import { Link } from 'react-router-dom';

const CartEmpty = () => {
  return (
    <div className={styles.root}>
      <h2 className={styles.title}>Корзина пустая 😕</h2>

      <p className={styles.text}>
        Похоже, вы ещё ничего не добавили. <br />
        Чтобы заказать товары, перейдите на главную страницу.
      </p>

      <div className={styles.icon}>🛒</div>

      <Link to="/" className={styles.btn}>
        ← Вернуться назад
      </Link>
    </div>
  );
};

export default CartEmpty;
