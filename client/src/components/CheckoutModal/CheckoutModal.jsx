// CheckoutPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './CheckoutModal.module.scss'; // сохраняем стили
import axios from 'axios';
import { booleanPointInPolygon } from '@turf/turf';
import zones from '../ZoneBlock/zones.json';
import * as turf from '@turf/turf';
import { useSelector } from 'react-redux';

const OUT_OF_ZONE_PRICE = 600;
const DEFAULT_PRICE = 200;
const FREE_DELIVERY_THRESHOLD = 1500;
const DADATA_TOKEN = '728949fbd9504dea0d285c475d65396381f7f7b2';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items: cartItems, totalPrice: initialTotalPrice } = useSelector((state) => state.cart);

  const [deliveryType, setDeliveryType] = useState('delivery');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [callBack, setCallBack] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const [timeOption, setTimeOption] = useState('nearest');
  const [orderTime, setOrderTime] = useState('');
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialDeliveryPrice = initialTotalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_PRICE;
  const [deliveryPrice, setDeliveryPrice] = useState(initialDeliveryPrice);

  useEffect(() => {
    if (deliveryType === 'pickup') {
      setDeliveryPrice(0);
    } else {
      // восстановим стандартную цену при доставке
      if (initialTotalPrice >= FREE_DELIVERY_THRESHOLD) {
        setDeliveryPrice(0);
      } else {
        setDeliveryPrice(DEFAULT_PRICE);
      }
    }
  }, [deliveryType, initialTotalPrice]);
  const totalPrice = initialTotalPrice + (deliveryType === 'delivery' ? deliveryPrice : 0);

  const [suggestions, setSuggestions] = useState([]);
  const timeoutRef = useRef(null);

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
    return 'ближайшее';
    // const now = new Date();
    // now.setMinutes(now.getMinutes() + 20);
    // return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  useEffect(() => {
    if (initialTotalPrice >= FREE_DELIVERY_THRESHOLD) {
      setDeliveryPrice(0);
    } else {
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
          { query: value, count: 5, locations: [{ city: 'Чита', region: 'Забайкальский' }] },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Token ${DADATA_TOKEN}`,
            },
          },
        );
        if (res.data.suggestions) setSuggestions(res.data.suggestions);
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
    const finalDeliveryPrice = initialTotalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : priceFromZone;
    setDeliveryPrice(finalDeliveryPrice);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!customerName.trim()) return alert('Введите имя');
    if (!phone.trim()) return alert('Введите телефон');
    if (!email.trim()) return alert('Введите email');
    if (deliveryType === 'delivery' && !address.trim()) return alert('Введите адрес');
    if (deliveryType === 'delivery' && !comment.trim()) return alert('Введите комментарий');
    if (paymentMethod === 'cash' && !changeAmount.trim()) return alert('Введите сумму');
    if (timeOption === 'custom' && !orderTime.trim()) return alert('Выберите время');
    if (!agreePolicy) return alert('Необходимо согласие с политикой');

    setIsSubmitting(true);

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
      payment_id: null,
    };

    try {
      const response = await axios.post('/api/orders', orderData);

      // Если пришла ссылка от ЮKassa — редиректим туда
      if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
        return; // дальше код не выполняем
      }

      // Если оплаты нет — обычный заказ
      alert('Заказ успешно оформлен!');
      navigate(-1);
    } catch (error) {
      console.error(error);
      alert('Ошибка при отправке заказа');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Оформление заказа</h1>

      <Link to="/" className={styles.backBtn}>
        ← Вернуться назад
      </Link>

      <div className={styles.columns}>
        {/* Левая колонка */}
        <div className={styles.leftColumn}>
          {/* Контакты */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Контактная информация</h2>
            <div className={styles.row}>
              <div className={styles.section}>
                <label>Ваше имя</label>
                <input
                  type="text"
                  placeholder="Введите имя"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className={styles.section}>
                <label>Телефон</label>
                <input
                  type="tel"
                  placeholder="+7 (999) 999-99-99"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                />
              </div>
            </div>
            <div className={styles.section}>
              <label>Email для отправки чека</label>
              <input
                type="email"
                placeholder="example@mail.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Доставка / Самовывоз */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Доставка / Самовывоз</h2>
            <div className={styles.section}>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    checked={deliveryType === 'delivery'}
                    onChange={() => setDeliveryType('delivery')}
                  />{' '}
                  Доставка
                </label>
                <label>
                  <input
                    type="radio"
                    checked={deliveryType === 'pickup'}
                    onChange={() => setDeliveryType('pickup')}
                  />{' '}
                  Самовывоз
                </label>
              </div>

              {deliveryType === 'delivery' && (
                <>
                  <div className={styles.section}>
                    <label>Адрес доставки</label>
                    <input
                      type="text"
                      placeholder="Введите адрес"
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                    />
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
                  </div>
                  <div className={styles.section}>
                    <label>Комментарий</label>
                    <textarea
                      placeholder="..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                  <div className={styles.section}>
                    <p className={styles.infoTitle}>Доставка из кафе работает:</p>
                    <ul className={styles.infoList}>
                      <li>с пн-сб 9:30-22:30</li>
                      <li>в вс 10:00-22:30</li>
                      <li>Время доставки от 60-90 минут</li>
                      <li>Доставка осуществляется до подъезда, а не до двери</li>
                    </ul>
                  </div>
                </>
              )}

              {deliveryType === 'pickup' && (
                <div className={styles.section}>
                  <p>
                    <strong>Адрес ресторана:</strong> г. Чита, ул. Курнатовского, 30
                  </p>
                  <p>Время заказа от 20 минут.</p>
                </div>
              )}
            </div>
          </div>

          {/* Время заказа */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Время заказа</h2>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  checked={timeOption === 'nearest'}
                  onChange={() => setTimeOption('nearest')}
                />{' '}
                Ближайшее
              </label>
              <label>
                <input
                  type="radio"
                  checked={timeOption === 'custom'}
                  onChange={() => setTimeOption('custom')}
                />{' '}
                Выбрать своё
              </label>
            </div>
            {timeOption === 'custom' && (
              <div className={styles.section}>
                <input
                  type="time"
                  value={orderTime}
                  onChange={(e) => setOrderTime(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Правая колонка */}
        <div className={styles.rightColumn}>
          <div className={styles.card}>
            <h3>Оплата</h3>
            <div className={styles.section}>
              <label>Способ оплаты</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="online">Картой онлайн</option>
                <option value="cash">Наличными</option>
              </select>
              {paymentMethod === 'cash' && (
                <div className={styles.section}>
                  <label>С какой суммы дать сдачу?</label>
                  <input
                    type="number"
                    value={changeAmount}
                    onChange={(e) => setChangeAmount(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
          {/* Блок согласия с политикой конфиденциальности */}
          <div className={styles.sectionCheckbox}>
            <input
              type="checkbox"
              id="agreePolicy"
              checked={agreePolicy}
              onChange={(e) => setAgreePolicy(e.target.checked)}
            />
            <label htmlFor="agreePolicy">
              Я согласен с <Link to="/offer">политикой конфиденциальности</Link>
            </label>
          </div>

          <div className={styles.card}>
            <h3>Итог заказа</h3>
            <div className={styles.cartSummary}>
              <h5>Цена доставки: {deliveryPrice} ₽</h5>
              <div className={styles.total}>Итого: {totalPrice} ₽</div>
            </div>
            <button className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <div className={styles.loader}></div> : 'Подтвердить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
