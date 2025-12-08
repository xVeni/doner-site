import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearItems } from '../../redux/slices/cartSlice';
import styles from './successPage.module.scss';

function SuccessPage() {
  const { id } = useParams();
  const dispatch = useDispatch();

  useEffect(() => {
    // Очистка корзины при заходе на страницу успеха
    dispatch(clearItems());
  }, [dispatch]);

  return (
    <div className={styles.container}>
      <h1>Заказ успешно оформлен</h1>
      <h2>Ваш номер заказа: {id}</h2>

      <p className={styles.text}>Спасибо за то что выбираете Doner!</p>

      <p className={styles.textSmall}>
        Если вы хотите отменить заказ звоните по номеру{' '}
        <a href="tel:+79144871717" className={styles.phone}>
          +7 (914) 487-17-17
        </a>
      </p>
    </div>
  );
}

export default SuccessPage;
