import React from 'react';

function Categories({ value, onClickCategory }) {
  const categories = [
    'Хиты продаж',
    'Все',
    'Шаурма/Кебаб',
    'Бртуч/Бургер/Ролл',
    'Напитки',
    'Стрит',
  ];

  return (
    <div className="categories">
      {categories.map((categoryName, i) => (
        <div
          key={i}
          onClick={() => onClickCategory(i)}
          className={value == i ? 'category active' : 'category'}>
          {categoryName}
        </div>
      ))}
    </div>
  );
}

export default Categories;
