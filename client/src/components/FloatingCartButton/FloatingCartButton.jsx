import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './FloatingCartButton.module.scss';

const FloatingCartButton = () => {
  const cart = useSelector((state) => state.cart.items);
  const navigate = useNavigate();

  const totalCount = cart.reduce((sum, item) => sum + item.count, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.count, 0);

  // Если в корзине ничего нет — кнопку не показываем
  if (totalCount === 0) return null;

  return (
    <div className={styles.button} onClick={() => navigate('/cart')}>
      <span className={styles.left}>🛒 {totalCount} товаров</span>
      <span className={styles.right}>{totalPrice} ₽</span>
    </div>
  );
};

export default FloatingCartButton;
