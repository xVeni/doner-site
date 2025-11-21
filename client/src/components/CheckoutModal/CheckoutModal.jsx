import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './CheckoutModal.module.scss';
import axios from 'axios';
import { booleanPointInPolygon } from '@turf/turf';
import zones from '../ZoneBlock/zones.json';
import * as turf from '@turf/turf';
import { useEffect } from 'react';

const OUT_OF_ZONE_PRICE = 600;
const DEFAULT_PRICE = 150;
const FREE_DELIVERY_THRESHOLD = 1500;

const DADATA_TOKEN = '728949fbd9504dea0d285c475d65396381f7f7b2';

const CheckoutModal = ({ isOpen, onClose, cartItems, totalPrice: initialTotalPrice }) => {
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [callBack, setCallBack] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [timeOption, setTimeOption] = useState('nearest');
  const [orderTime, setOrderTime] = useState('');
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [email, setEmail] = useState('');

  // deliveryPrice учитывает бесплатную доставку
  const initialDeliveryPrice = initialTotalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_PRICE;
  const [deliveryPrice, setDeliveryPrice] = useState(initialDeliveryPrice);

  // totalPrice вычисляем на лету
  const totalPrice = initialTotalPrice + deliveryPrice;

  const [suggestions, setSuggestions] = useState([]);
  const timeoutRef = useRef(null);

  // Функция форматирования номера
  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = digits.slice(1);
    if (!digits.startsWith('7')) digits = '7' + digits;
    digits = digits.slice(0, 11);

    let formatted = '+7 ';
    if (digits.length > 1) formatted += '(' + digits.slice(1, 4);
    if (digits.length >= 4) formatted += ') ' + digits.slice(4, 7);
    if (digits.length >= 7) formatted += '-' + digits.slice(7, 9);
    if (digits.length >= 9) formatted += '-' + digits.slice(9, 11);

    return formatted;
  };

  const orderItems = cartItems.map((item) => ({
    id_dishes: item.id,
    title: item.title,
    quantity: item.count,
  }));

  const getNearestTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 20);
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDeliveryPriceFromZones = (coords) => {
    const matchedZones = zones.features.filter((feature) =>
      booleanPointInPolygon({ type: 'Point', coordinates: coords }, feature),
    );

    if (matchedZones.length === 0) return OUT_OF_ZONE_PRICE;

    matchedZones.sort((a, b) => turf.area(a) - turf.area(b));

    const priceMatch = matchedZones[0].properties.description.match(/(\d+)\s*р/);
    return priceMatch ? parseInt(priceMatch[1], 10) : OUT_OF_ZONE_PRICE;
  };

  // После объявления [deliveryPrice, setDeliveryPrice]
  useEffect(() => {
    // Если сумма товаров >= 1500, доставка бесплатная
    if (initialTotalPrice >= FREE_DELIVERY_THRESHOLD) {
      setDeliveryPrice(0);
    } else {
      // Если доставка была бесплатной, восстанавливаем базовую стоимость доставки
      setDeliveryPrice(DEFAULT_PRICE);
    }
  }, [initialTotalPrice]);

  const handleAddressChange = (value) => {
    setAddress(value);
    setSuggestions([]);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (!value.trim()) return;

      try {
        const res = await axios.post(
          'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
          {
            query: value,
            count: 5,
            locations: [{ city: 'Чита', region: 'Забайкальский' }],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Token ${DADATA_TOKEN}`,
            },
          },
        );

        if (res.data.suggestions) {
          setSuggestions(res.data.suggestions);
        }
      } catch (err) {
        console.error('Ошибка Dadata suggest:', err);
      }
    }, 600);
  };

  const handleSelectSuggestion = async (item) => {
    setAddress(item.value);
    setSuggestions([]);

    const data = item.data;
    if (!data.geo_lat || !data.geo_lon) {
      alert('Не удалось определить координаты');
      return;
    }

    const lat = Number(data.geo_lat);
    const lon = Number(data.geo_lon);

    const priceFromZone = getDeliveryPriceFromZones([lon, lat]);

    // Бесплатная доставка, если сумма товаров >= FREE_DELIVERY_THRESHOLD
    const finalDeliveryPrice = initialTotalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : priceFromZone;

    setDeliveryPrice(finalDeliveryPrice);
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) return alert('Введите имя');
    if (!phone.trim()) return alert('Введите телефон');
    if (!email.trim()) return alert('Введите email');
    if (deliveryType === 'delivery' && !address.trim()) return alert('Введите адрес');
    if (deliveryType === 'delivery' && !comment.trim()) return alert('Введите комментарий');
    if (paymentMethod === 'cash' && !changeAmount.trim()) return alert('Введите сумму');
    if (timeOption === 'custom' && !orderTime.trim()) return alert('Выберите время');
    if (!agreePolicy) return alert('Необходимо согласие с политикой');

    const timeToSend = timeOption === 'nearest' ? getNearestTime() : orderTime;

    const orderData = {
      type: deliveryType,
      address: deliveryType === 'delivery' ? address : 'Самовывоз',
      comment,
      paymentMethod,
      customer_name: customerName,
      phone,
      items: orderItems,
      total: totalPrice,
      need_callback: callBack,
      change_amount: paymentMethod === 'cash' ? changeAmount : null,
      time: timeToSend,
      email,
      deliveryPrice,
    };

    try {
      await axios.post('http://localhost:3000/api/orders', orderData);
      alert('Заказ успешно оформлен!');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Ошибка при отправке заказа');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.root}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <h2 className={styles.title}>Оформление заказа</h2>

        {/* Имя + телефон */}
        <div className={styles.section}>
          <label>Ваше имя:</label>
          <input
            type="text"
            placeholder="Введите имя"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <label>Телефон:</label>
          <input
            type="tel"
            placeholder="+7 (999) 999-99-99"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
        </div>

        {/* Email */}
        <div className={styles.section}>
          <label>Email для отправки чека:</label>
          <input
            type="email"
            placeholder="example@mail.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Доставка или самовывоз */}
        <div className={styles.section}>
          <label>Выберите способ получения:</label>
          <div className={styles.radioGroup}>
            <label>
              <input
                type="radio"
                value="delivery"
                checked={deliveryType === 'delivery'}
                onChange={() => setDeliveryType('delivery')}
              />
              Доставка
            </label>
            <label>
              <input
                type="radio"
                value="pickup"
                checked={deliveryType === 'pickup'}
                onChange={() => setDeliveryType('pickup')}
              />
              Самовывоз
            </label>
          </div>
        </div>

        {/* Адрес */}
        {deliveryType === 'delivery' ? (
          <div className={styles.section}>
            <div className={styles.deliveryInfo}>
              <p className={styles.infoTitle}>Доставка из кафе работает:</p>
              <ul className={styles.infoList}>
                <li>с пн-сб 9:30-22:30</li>
                <li>в вс 10:00-22:30</li>
                <li>
                  Время доставки от 60-90 минут (может быть увеличенно в зависимости от расстояния,
                  маршрута, погодных условий, загруженности)
                </li>
                <li>Доставка осуществляется до подъезда, а не до двери</li>
              </ul>
            </div>
            <label>Адрес доставки:</label>
            <input
              type="text"
              placeholder="Введите адрес"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
            />
            <div className={styles.deliveryPrice}>
              Стоимость доставки: {deliveryPrice} ₽
              {initialTotalPrice >= FREE_DELIVERY_THRESHOLD && ' (бесплатно)'}
            </div>

            {suggestions.length > 0 && (
              <ul className={styles.suggestions}>
                {suggestions.map((s) => (
                  <li
                    key={s.value}
                    className={styles.suggestionItem}
                    onClick={() => handleSelectSuggestion(s)}>
                    {s.value}
                  </li>
                ))}
              </ul>
            )}

            <label>Комментарий:</label>
            <textarea
              placeholder="Подъезд, домофон, этаж..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        ) : (
          <div className={styles.section}>
            <p>
              <strong>Адрес ресторана:</strong> г. Чита, ул. Курнатовского, 30
            </p>
            <p>Время заказа от 20 минут.</p>
          </div>
        )}

        {/* Остальные блоки */}
        <div className={styles.sectionCheckbox}>
          <span>Нужно перезвонить</span>
          <input type="checkbox" checked={callBack} onChange={() => setCallBack(!callBack)} />
        </div>

        {paymentMethod === 'cash' && (
          <div className={styles.section}>
            <label>С какой суммы дать сдачу?</label>
            <input
              type="number"
              placeholder="Введите сумму"
              value={changeAmount}
              onChange={(e) => setChangeAmount(e.target.value)}
            />
          </div>
        )}

        <div className={styles.section}>
          <label>Способ оплаты:</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="card">Картой онлайн</option>
            <option value="cash">Наличными</option>
          </select>
        </div>

        <div className={styles.section}>
          <label>Время заказа:</label>
          <div className={styles.radioGroup}>
            <label>
              <input
                type="radio"
                value="nearest"
                checked={timeOption === 'nearest'}
                onChange={() => setTimeOption('nearest')}
              />
              Ближайшее
            </label>
            <label>
              <input
                type="radio"
                value="custom"
                checked={timeOption === 'custom'}
                onChange={() => setTimeOption('custom')}
              />
              Выбрать своё
            </label>
          </div>

          {timeOption === 'custom' && (
            <input type="time" value={orderTime} onChange={(e) => setOrderTime(e.target.value)} />
          )}
        </div>

        <div className={styles.sectionCheckbox}>
          <input
            type="checkbox"
            checked={agreePolicy}
            onChange={() => setAgreePolicy(!agreePolicy)}
          />
          <span>
            Я согласен с{' '}
            <Link to="/offer" target="_blank">
              политикой конфиденциальности
            </Link>
          </span>
        </div>

        <div className={styles.footer}>
          <span className={styles.total}>Итого: {totalPrice} ₽</span>
          <button className={styles.submitBtn} onClick={handleSubmit}>
            Подтвердить заказ
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
