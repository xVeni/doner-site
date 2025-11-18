import React from 'react';
import { addItem, minusItem, removeItem } from '../redux/slices/cartSlice';
import { useDispatch } from 'react-redux';

const CartItem = ({ id, title, weight, price, count, image, desc }) => {
  const dispatch = useDispatch();

  const onClickPlus = () => {
    dispatch(
      addItem({
        id,
        title,
        price,
        weight,
        desc,
        image,
      }),
    );
  };

  const onClickMinus = () => {
    dispatch(minusItem(id));
  };

  const onClickRemove = () => {
    if (window.confirm('Ты точно уверен что хочешь удалить товар?')) {
      dispatch(removeItem(id));
    }
  };

  return (
    <div className="cart-item">
      <img src={image} alt="Товар" className="cart-item__img" />
      <div className="cart-item__info">
        <h2 className="cart-item__title">{title}</h2>
        <p className="cart-item__desc">
          {desc} {weight}
        </p>
        <div className="cart-item__controls">
          <div className="cart-item__quantity">
            <button onClick={onClickMinus} className="cart-item__btn">
              −
            </button>
            <span className="cart-item__count">{count}</span>
            <button onClick={onClickPlus} className="cart-item__btn">
              +
            </button>
          </div>
          <div className="cart-item__price">{price * count} ₽</div>
          <button onClick={onClickRemove} className="cart-item__remove">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
