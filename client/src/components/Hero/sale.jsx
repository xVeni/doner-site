import React, { useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import styles from './sale.module.scss';

const slides = [
  { id: 1, image: '/hero/hero1.png' },
  { id: 2, image: '/hero/hero2.png' },
  { id: 3, image: '/hero/hero3.png' },
];

export default function Sale() {
  const [activeIndex, setActiveIndex] = React.useState(1);

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  // Автопрокрутка каждые 4 секунды
  useEffect(() => {
    const interval = setInterval(nextSlide, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.hero}>
      <button className={`${styles.heroBtn} ${styles.left}`} onClick={prevSlide}>
        <FaChevronLeft />
      </button>

      <div className={styles.heroSliderWrapper}>
        <div
          className={styles.heroSlider}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={styles.heroItem}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>
      </div>

      <button className={`${styles.heroBtn} ${styles.right}`} onClick={nextSlide}>
        <FaChevronRight />
      </button>
    </div>
  );
}
