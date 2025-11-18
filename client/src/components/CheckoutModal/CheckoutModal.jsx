import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './CheckoutModal.module.scss';
import axios from 'axios';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import zones from '../ZoneBlock/zones.json';

const OUT_OF_ZONE_PRICE = 600;
const DEFAULT_PRICE = 150;

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
  const [deliveryPrice, setDeliveryPrice] = useState(DEFAULT_PRICE);
  const [totalPrice, setTotalPrice] = useState(initialTotalPrice + DEFAULT_PRICE);
  const [suggestions, setSuggestions] = useState([]);

  const timeoutRef = useRef(null);

  const orderItems = cartItems.map((item) => ({
    id_dishes: item.id,
    title: item.title,
    quantity: item.count,
  }));

  const getNearestTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 20);
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Получение цены из JSON зон
  const getDeliveryPriceFromZones = (coords) => {
    for (let feature of zones.features) {
      if (booleanPointInPolygon({ type: 'Point', coordinates: coords }, feature)) {
        const match = feature.properties.description.match(/(\d+)\s*р/);
        if (match) return parseInt(match[1], 10);
      }
    }
    return OUT_OF_ZONE_PRICE;
  };

  // Форматирование подсказки: улица и номер дома
  const formatAddress = (item) => {
    const road = item.address.road || item.address.street || '';
    const houseNumber = item.address.house_number || '';
    return road ? (houseNumber ? `${road}, ${houseNumber}` : road) : '';
  };

  // Проверка, есть ли улица и дом
  const isAddressComplete = (item) => {
    return item.address && (item.address.road || item.address.street) && item.address.house_number;
  };

  // Нормализация русских сокращений типа "мкр", "д", "ул"
  const normalizeQuery = (text) => {
    return text
      .replace(/\bмкр\b/gi, 'микрорайон')
      .replace(/\bул\b/gi, 'улица')
      .replace(/\bпр\b/gi, 'проспект')
      .replace(/\bпер\b/gi, 'переулок')
      .replace(/\bкорп\b/gi, 'корпус')
      .replace(/\bстр\b/gi, 'строение');
  };

  // Дебаунс-обработка адреса
  const handleAddressChange = (value) => {
    setAddress(value);
    setSuggestions([]);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (!value.trim()) {
        setDeliveryPrice(DEFAULT_PRICE);
        setTotalPrice(initialTotalPrice + DEFAULT_PRICE);
        return;
      }

      try {
        const response = await axios.get('https://suggest-maps.yandex.ru/v1/suggest', {
          params: {
            apikey: '83b87b6a-7c0f-403a-bca1-0a380902be6e',
            text: value,
            lang: 'ru_RU',
            types: 'geo',
            results: 5,
          },
        });

        if (!response.data.results) return;

        const formatted = response.data.results.map((item, index) => ({
          place_id: index,
          display_name: item.text,
          fullText: item.text,
        }));

        setSuggestions(formatted);
      } catch (error) {
        console.error('Ошибка Yandex Suggest:', error);
      }
    }, 500);
  };

  // Выбор подсказки (YANDEX GEOCODER)
  const handleSelectSuggestion = async (item) => {
    setAddress(item.display_name);
    setSuggestions([]);

    try {
      const geo = await axios.get('https://geocode-maps.yandex.ru/1.x/', {
        params: {
          apikey: '83b87b6a-7c0f-403a-bca1-0a380902be6e',
          geocode: item.fullText,
          format: 'json',
        },
      });

      const pos = geo.data.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos;

      const [lon, lat] = pos.split(' ').map(Number);

      const price = getDeliveryPriceFromZones([lon, lat]);

      setDeliveryPrice(price);
      setTotalPrice(initialTotalPrice + price);
    } catch (error) {
      console.error('Ошибка Yandex Geocoder:', error);
      alert('Не удалось определить координаты адреса');
    }
  };

  const handleSubmit = async () => {
    // Проверка обязательных полей
    if (!customerName.trim()) {
      alert('Пожалуйста, введите ваше имя');
      return;
    }
    if (!phone.trim()) {
      alert('Пожалуйста, введите телефон');
      return;
    }
    if (!email.trim()) {
      alert('Пожалуйста, введите email');
      return;
    }
    if (deliveryType === 'delivery' && !address.trim()) {
      alert('Пожалуйста, введите адрес доставки');
      return;
    }
    if (deliveryType === 'delivery' && !comment.trim()) {
      alert('Пожалуйста, укажите комментарий к заказу');
      return;
    }
    if (paymentMethod === 'cash' && !changeAmount.trim()) {
      alert('Пожалуйста, укажите сумму для сдачи');
      return;
    }
    if (timeOption === 'custom' && !orderTime.trim()) {
      alert('Пожалуйста, выберите время заказа');
      return;
    }
    if (!agreePolicy) {
      alert('Пожалуйста, согласитесь с политикой конфиденциальности');
      return;
    }

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
    };

    try {
      await axios.post('http://192.168.0.11:3000/orders', orderData);
      alert('Заказ успешно оформлен!');
      onClose();
    } catch (error) {
      alert('Ошибка при отправке заказа 😢');
      console.error(error);
    }

    console.log(orderData);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.root}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
        <h2 className={styles.title}>Оформление заказа</h2>

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
            type="text"
            placeholder="+7 (999) 999-99-99"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className={styles.section}>
          <label>Email для отправки чека:</label>
          <input
            type="email"
            placeholder="example@mail.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

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

        {deliveryType === 'delivery' ? (
          <div className={styles.section}>
            <label>Адрес доставки:</label>
            <input
              type="text"
              placeholder="Введите полный адрес"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
            />
            <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
              Стоимость доставки: {deliveryPrice} ₽
            </div>

            <ul style={{ border: '1px solid #ccc', marginTop: 0, paddingLeft: 0 }}>
              {suggestions.map((sug) => (
                <li
                  key={sug.place_id}
                  style={{ listStyle: 'none', cursor: 'pointer', padding: 5 }}
                  onClick={() => handleSelectSuggestion(sug)}>
                  {sug.display_name}
                </li>
              ))}
            </ul>

            <label>Комментарий к заказу:</label>
            <textarea
              placeholder="Например: подъезд 3, домофон 123"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        ) : (
          <div className={styles.section}>
            <p>
              <strong>Адрес ресторана:</strong> г. Чита, ул. Курнатовского, 30
            </p>
            <p>Заберите заказ через 20 минут после оформления.</p>
          </div>
        )}

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
            <option value="cash">Наличными при получении</option>
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
