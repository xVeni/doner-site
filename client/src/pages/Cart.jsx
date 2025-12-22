import React, { useEffect, useState } from 'react';
import '../scssCart/cart.scss';

import { useDispatch, useSelector } from 'react-redux';
import CartItem from '../components/cartItem';
import { Link } from 'react-router-dom';
import { clearItems, addItem } from '../redux/slices/cartSlice';
import CartEmpty from '../components/cartEmpty/CartEmpty';
import axios from 'axios';

const Cart = () => {
  const dispatch = useDispatch();
  const { totalPrice, items } = useSelector((state) => state.cart);
  const [packages, setPackages] = useState([]);

  // Загружаем пакеты с сервера
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data } = await axios.get('/api/dishes?category=200'); // фильтр по категории пакетов
        setPackages(data);
      } catch (err) {
        console.error('Ошибка загрузки пакетов:', err);
      }
    };
    fetchPackages();
  }, []);

  const onClickClear = () => {
    if (window.confirm('Ты точно уверен что хочешь очистить корзину?')) {
      dispatch(clearItems());
    }
  };

  if (!totalPrice) {
    return <CartEmpty />;
  }

  return (
    <div className="cart">
      <div className="cart__top">
        <Link to="/" className="cart__back-btn">
          ← Вернуться назад
        </Link>
        <button onClick={onClickClear} className="cart__clear-btn">
          Очистить корзину ✕
        </button>
      </div>

      <h1 className="cart__title">Корзина</h1>
      <p>При заказе от 1500 ₽ доставка бесплатная</p>

      {/* Кнопки добавления пакетов */}
      {packages.length > 0 && (
        <div className="cart__add-bags">
          {packages.map((pkg) => (
            <button key={pkg.id} onClick={() => dispatch(addItem(pkg))}>
              Добавить {pkg.title} +{pkg.price} ₽
            </button>
          ))}
        </div>
      )}

      <div className="cart__items">
        {items.map((item) => (
          <CartItem key={item.id} {...item} />
        ))}
      </div>

      <div className="cart__bottom">
        <div className="cart__summary">
          <span className="cart__sum-text">Сумма заказа:</span>
          <span className="cart__sum-value">{totalPrice} ₽</span>
        </div>
        <Link to="/payment" className="cart__checkout-btn">
          Оформить заказ
        </Link>
      </div>
    </div>
  );
};

export default Cart;
