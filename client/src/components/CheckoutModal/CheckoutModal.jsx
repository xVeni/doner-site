// CheckoutPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './CheckoutModal.module.scss'; // сохраняем стили
import axios from 'axios';
import { booleanPointInPolygon } from '@turf/turf';
import zones from '../ZoneBlock/zones.json';
import * as turf from '@turf/turf';
import { useDispatch, useSelector } from 'react-redux';
import { setField, resetCheckoutForm } from '../../redux/slices/checkoutSlice';

const OUT_OF_ZONE_PRICE = 600;
const DEFAULT_PRICE = 200;
const FREE_DELIVERY_THRESHOLD = 1500;
const DADATA_TOKEN = '728949fbd9504dea0d285c475d65396381f7f7b2';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items: cartItems, totalPrice: initialTotalPrice } = useSelector((state) => state.cart);

  const {
    deliveryType,
    comment,
    paymentMethod,
    customerName,
    phone,
    callBack,
    changeAmount,
    timeOption,
    orderTime,
    agreePolicy,
    email,
  } = useSelector((state) => state.checkout);

  const dispatch = useDispatch();
  // В начале компонента
  const [errors, setErrors] = useState({});

  const fieldRefs = {
    customerName: useRef(null),
    phone: useRef(null),
    email: useRef(null),
    address: useRef(null),
    comment: useRef(null),
    changeAmount: useRef(null),
    orderTime: useRef(null),
    agreePolicy: useRef(null),
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localAddress, setLocalAddress] = useState('');
  const initialDeliveryPrice = initialTotalPrice >= FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_PRICE;
  const [deliveryPrice, setDeliveryPrice] = useState(initialDeliveryPrice);

  // добавлено: сброс адреса при смене способа доставки
  useEffect(() => {
    setLocalAddress('');
    setSuggestions([]);
    if (deliveryType === 'pickup') {
      setDeliveryPrice(0);
    } else {
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
    price: item.price,
  }));

  // Функция проверки полей
  const validateFields = () => {
    const newErrors = {};

    if (!customerName.trim()) newErrors.customerName = 'Введите имя';
    if (!phone.trim()) newErrors.phone = 'Введите телефон';
    if (!email.trim()) newErrors.email = 'Введите email';
    if (deliveryType === 'delivery' && !localAddress.trim()) newErrors.address = 'Введите адрес';
    if (deliveryType === 'delivery' && !comment.trim()) newErrors.comment = 'Введите комментарий';
    if (paymentMethod === 'cash' && !changeAmount.trim()) newErrors.changeAmount = 'Введите сумму';
    if (timeOption === 'custom' && !orderTime.trim()) newErrors.orderTime = 'Выберите время';
    if (!agreePolicy) newErrors.agreePolicy = 'Необходимо согласие с политикой';

    setErrors(newErrors);
    return newErrors;
  };

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
    setLocalAddress(value); // добавлено
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
    setLocalAddress(item.value); // добавлено
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

    const validationErrors = validateFields();
    const firstErrorField = Object.keys(validationErrors)[0];
    if (firstErrorField) {
      fieldRefs[firstErrorField]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldRefs[firstErrorField]?.current?.focus();
      return;
    }

    setIsSubmitting(true);

    const timeToSend = timeOption === 'nearest' ? getNearestTime() : orderTime;

    const orderData = {
      type: deliveryType,
      address: deliveryType === 'delivery' ? localAddress : 'Самовывоз',
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

      // Если есть ссылка на оплату онлайн
      if (response.data.paymentUrl && paymentMethod === 'online') {
        window.location.href = response.data.paymentUrl;
        return;
      }

      // Для всех остальных способов оплаты просто показываем страницу успеха с orderId
      if (response.data.orderId) {
        navigate(`/success/${response.data.orderId}`);
        return;
      }

      // На всякий случай — если сервер не вернул orderId
      alert('Заказ создан, но номер не получен. Свяжитесь с поддержкой.');
    } catch (error) {
      console.error(error);
      alert('Ошибка при оформлении заказа. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Оформление заказа</h1>

      <Link to="/cart" className={styles.backBtn}>
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
                  ref={fieldRefs.customerName}
                  className={errors.customerName ? styles.errorInput : ''}
                  onChange={(e) =>
                    dispatch(setField({ field: 'customerName', value: e.target.value }))
                  }
                />
                {errors.customerName && (
                  <div className={styles.errorMessage}>{errors.customerName}</div>
                )}
              </div>

              <div className={styles.section}>
                <label>Телефон</label>
                <input
                  type="tel"
                  placeholder="+7 (999) 999-99-99"
                  value={phone}
                  ref={fieldRefs.phone}
                  className={errors.phone ? styles.errorInput : ''}
                  onChange={(e) =>
                    dispatch(setField({ field: 'phone', value: formatPhone(e.target.value) }))
                  }
                />
                {errors.phone && <div className={styles.errorMessage}>{errors.phone}</div>}
              </div>
            </div>

            <div className={styles.section}>
              <label>Email для отправки чека</label>
              <input
                type="email"
                placeholder="example@mail.ru"
                value={email}
                ref={fieldRefs.email}
                className={errors.email ? styles.errorInput : ''}
                onChange={(e) => dispatch(setField({ field: 'email', value: e.target.value }))}
              />
              {errors.email && <div className={styles.errorMessage}>{errors.email}</div>}
            </div>
          </div>

          {/* Доставка / Самовывоз */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Доставка / Самовывоз</h2>

            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  checked={deliveryType === 'delivery'}
                  onChange={() => dispatch(setField({ field: 'deliveryType', value: 'delivery' }))}
                />{' '}
                Доставка
              </label>

              <label>
                <input
                  type="radio"
                  checked={deliveryType === 'pickup'}
                  onChange={() => dispatch(setField({ field: 'deliveryType', value: 'pickup' }))}
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
                    value={localAddress}
                    placeholder="Введите адрес"
                    ref={fieldRefs.address}
                    className={errors.address ? styles.errorInput : ''}
                    onChange={(e) => handleAddressChange(e.target.value)}
                  />
                  {errors.address && <div className={styles.errorMessage}>{errors.address}</div>}

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
                    placeholder="Введите номер подъезда и дополнительную информацию при необходимости"
                    value={comment}
                    ref={fieldRefs.comment}
                    className={errors.comment ? styles.errorInput : ''}
                    onChange={(e) =>
                      dispatch(setField({ field: 'comment', value: e.target.value }))
                    }
                  />
                  {errors.comment && <div className={styles.errorMessage}>{errors.comment}</div>}
                </div>

                <div className={styles.sectionCheckbox}>
                  <input
                    type="checkbox"
                    id="needCallback"
                    checked={callBack}
                    onChange={(e) =>
                      dispatch(setField({ field: 'callBack', value: e.target.checked }))
                    }
                  />
                  <label htmlFor="needCallback">Нужно перезвонить?</label>
                </div>

                <div className={styles.section}>
                  <p className={styles.infoTitle}>Доставка из кафе работает:</p>
                  <ul className={styles.infoList}>
                    <li>с пн-сб 9:30-22:30</li>
                    <li>в вс 10:00-22:30</li>
                    <li>Время доставки от 60-90 минут</li>
                    <li>Доставка осуществляется до подъезда</li>
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

          {/* Время */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Время заказа</h2>

            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  checked={timeOption === 'nearest'}
                  onChange={() => dispatch(setField({ field: 'timeOption', value: 'nearest' }))}
                />{' '}
                Ближайшее
              </label>

              <label>
                <input
                  type="radio"
                  checked={timeOption === 'custom'}
                  onChange={() => dispatch(setField({ field: 'timeOption', value: 'custom' }))}
                />{' '}
                Выбрать своё
              </label>
            </div>

            {timeOption === 'custom' && (
              <div className={styles.section}>
                <input
                  type="time"
                  value={orderTime}
                  ref={fieldRefs.orderTime}
                  className={errors.orderTime ? styles.errorInput : ''}
                  onChange={(e) =>
                    dispatch(setField({ field: 'orderTime', value: e.target.value }))
                  }
                />
                {errors.orderTime && <div className={styles.errorMessage}>{errors.orderTime}</div>}
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
              <select
                value={paymentMethod}
                ref={fieldRefs.paymentMethod}
                className={errors.paymentMethod ? styles.errorInput : ''}
                onChange={(e) =>
                  dispatch(setField({ field: 'paymentMethod', value: e.target.value }))
                }>
                <option value="online">Картой онлайн</option>
                {deliveryType === 'delivery' ? (
                  <>
                    <option value="cash">Наличными</option>
                    <option value="courier-card">Картой курьеру</option>
                  </>
                ) : (
                  <option value="restaurant">Оплата в заведении</option>
                )}
              </select>
              {errors.paymentMethod && (
                <div className={styles.errorMessage}>{errors.paymentMethod}</div>
              )}

              {paymentMethod === 'cash' && (
                <div className={styles.section}>
                  <label>С какой суммы дать сдачу?</label>
                  <input
                    type="number"
                    value={changeAmount}
                    ref={fieldRefs.changeAmount}
                    className={errors.changeAmount ? styles.errorInput : ''}
                    onChange={(e) =>
                      dispatch(setField({ field: 'changeAmount', value: e.target.value }))
                    }
                  />
                  {errors.changeAmount && (
                    <div className={styles.errorMessage}>{errors.changeAmount}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Политика */}
          <div className={styles.sectionCheckbox}>
            <input
              type="checkbox"
              id="agreePolicy"
              checked={agreePolicy}
              ref={fieldRefs.agreePolicy}
              className={errors.agreePolicy ? styles.errorInput : ''}
              onChange={(e) =>
                dispatch(setField({ field: 'agreePolicy', value: e.target.checked }))
              }
            />
            <label htmlFor="agreePolicy">
              Я согласен с <Link to="/offer">политикой конфиденциальности</Link>
            </label>
            {errors.agreePolicy && <div className={styles.errorMessage}>{errors.agreePolicy}</div>}
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
