import React from 'react';
import '../scssCart/cart.scss';

import { useState } from 'react';
import NotFoundBlock from '../components/NotFound';
import { useDispatch, useSelector } from 'react-redux';
import CartItem from '../components/cartItem';
import { Link } from 'react-router-dom';
import { clearItems } from '../redux/slices/cartSlice';
import CartEmpty from '../components/cartEmpty/CartEmpty';
import CheckoutModal from '../components/CheckoutModal/CheckoutModal';

const Cart = () => {
  const dispatch = useDispatch();
  const { totalPrice, items } = useSelector((state) => state.cart);
  const [isModalOpen, setModalOpen] = useState(false);

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
        <button onClick={() => setModalOpen(true)} className="cart__checkout-btn">
          Оформить заказ
        </button>
      </div>
      <CheckoutModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        cartItems={items}
        totalPrice={totalPrice}
      />
    </div>
  );
};

export default Cart;
