import React from 'react';
import { IoClose } from 'react-icons/io5';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '../../redux/slices/cartSlice';
import styles from './ProductModal.module.scss';

const ProductModal = ({ item, onClose }) => {
  const dispatch = useDispatch();
  const cartItem = useSelector((state) => state.cart.items.find((obj) => obj.id === item.id));

  const addedCount = cartItem ? cartItem.count : 0;

  const onClickAdd = () => {
    dispatch(addItem({ id: item.id, title: item.title, price: item.price, image: item.image }));
  };

  if (!item) return null;

  return (
    <div className={styles.root} onClick={onClose}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <IoClose size={24} />
        </button>

        <img src={item.image} alt={item.title} className={styles.image} />
        <h2>{item.title}</h2>
        <p className={styles.desc}>{item.desc}</p>
        <div className={styles.footer}>
          <span className={styles.price}>{item.price} ₽</span>
          <button onClick={onClickAdd} className={styles.addBtn}>
            В корзину {addedCount > 0 && `(${addedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
