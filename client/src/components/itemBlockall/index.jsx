import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addItem, minusItem, removeItem } from '../../redux/slices/cartSlice';

function Bestsellers({ id, title, weight, desc, price, image, onClick }) {
  const cartItem = useSelector((state) => state.cart.items.find((obj) => obj.id === id));
  const dispatch = useDispatch();

  const addedCount = cartItem ? cartItem.count : 0;

  const onClickAdd = (e) => {
    e.stopPropagation();
    dispatch(addItem({ id, title, price, image }));
  };

  const onClickMinus = (e) => {
    e.stopPropagation();
    if (cartItem.count === 1) {
      dispatch(removeItem(id));
    } else {
      dispatch(minusItem(id));
    }
  };

  return (
    <div className="product-card" onClick={onClick}>
      <img className="product-img" src={image} alt={title} />
      <div className="product-content">
        <div className="title-weight">
          <p className="title">{title}</p>
          <p className="weight">{weight}</p>
        </div>
        <p className="desc">{desc}</p>
        <div className="price-row">
          <p className="price">{price} ₽</p>
          {addedCount > 0 ? (
            <div className="cart-controls">
              <button onClick={onClickMinus} className="cart-btn minus">
                −
              </button>
              <span className="cart-count">{addedCount}</span>
              <button onClick={onClickAdd} className="cart-btn plus">
                +
              </button>
            </div>
          ) : (
            <button onClick={onClickAdd} className="btn">
              В корзину
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Bestsellers;
