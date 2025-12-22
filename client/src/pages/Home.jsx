import React from 'react';
import Bestsellers from '../components/itemBlockall';
import Skeleton from '../components/itemBlockall/Skeleton';
import Sale from '../components/Hero/sale';
import Categories from '../components/categories';
import { SearchContext } from '../App';
import { useSelector, useDispatch } from 'react-redux';
import { setCategoryId } from '../redux/slices/filterSlice';
import { fetchDish } from '../redux/slices/dishesSlice';
import ProductModal from '../components/ProductModal/ProductModal';
import FloatingCartButton from '../components/FloatingCartButton/FloatingCartButton';

export const Home = () => {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.dish);
  const categoryId = useSelector((state) => state.filter.categoryId);
  const { searchValue } = React.useContext(SearchContext);

  // ---------- ШАУРМА ----------
  const sortShaurma = (items) => {
    return [...items].sort((a, b) => {
      const isKebabA = a.title.toLowerCase().includes('кебаб');
      const isKebabB = b.title.toLowerCase().includes('кебаб');

      if (isKebabA && !isKebabB) return -1;
      if (!isKebabA && isKebabB) return 1;
      return 0;
    });
  };

  // ---------- БРТУЧ / БУРГЕРЫ ----------
  const sortBruchBurger = (items) => {
    const getPriority = (item) => {
      const title = item.title.toLowerCase();

      if (title.includes('бртуч')) return 1;
      if (title.includes('бургер')) return 2;
      if (title.includes('твистер')) return 3;

      return 99;
    };

    return [...items].sort((a, b) => getPriority(a) - getPriority(b));
  };

  // ---------- НАПИТКИ ----------
  const drinkOrder = [250, 330, 450, 500, 900, 1000];

  const sortDrinks = (items) => {
    return [...items].sort((a, b) => {
      const aIndex = drinkOrder.indexOf(a.weight);
      const bIndex = drinkOrder.indexOf(b.weight);

      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  };

  // ---------- СТРИТ ----------
  const sortStreet = (items) => {
    return [...items].sort((a, b) => {
      if (a.title.includes('Сырные') && b.title.includes('Сырные')) {
        return a.weight - b.weight; // 3 → 6 → 9
      }
      if (a.title.includes('Сырные')) return -1;
      if (b.title.includes('Сырные')) return 1;
      return 0;
    });
  };

  // Определяем, какие товары показывать
  const displayedItems = React.useMemo(() => {
    let filtered = [];

    if (categoryId === 0) {
      filtered = items.filter((item) => item.best_sell === 1);
    } else {
      filtered = items.filter((item) => item.category === categoryId);
    }

    // 🔥 ХАРДКОД СОРТИРОВОК
    switch (categoryId) {
      case 2: // Шаурма
        return sortShaurma(filtered);

      case 3: // Бртуч / Бургеры
        return sortBruchBurger(filtered);

      case 4: // Напитки
        return sortDrinks(filtered);

      case 5: // Стрит
        return sortStreet(filtered);

      default:
        return filtered;
    }
  }, [items, categoryId]);

  const onClickCategory = (id) => {
    dispatch(setCategoryId(id));
  };

  React.useEffect(() => {
    // Если есть поиск, автоматически выбираем "Все товары"
    if (searchValue && categoryId !== 1) {
      dispatch(setCategoryId(1));
    }
  }, [searchValue, categoryId, dispatch]);

  React.useEffect(() => {
    const effectiveCategory = searchValue ? 1 : categoryId;
    dispatch(fetchDish({ categoryId: effectiveCategory, search: searchValue }));
  }, [categoryId, searchValue, dispatch]);

  const [selectedItem, setSelectedItem] = React.useState(null);

  const closeModal = () => setSelectedItem(null);

  return (
    <>
      <Sale />
      <Categories value={categoryId} onClickCategory={onClickCategory} />

      <div className="bestsellers">
        <div className="product-grid">
          {status === 'loading' ? (
            [...new Array(8)].map((_, index) => <Skeleton key={index} />)
          ) : status === 'error' ? (
            <p className="error">Произошла ошибка, попробуйте позже</p>
          ) : displayedItems.length > 0 ? (
            displayedItems.map((obj) => (
              <Bestsellers key={obj.id} {...obj} onClick={() => setSelectedItem(obj)} />
            ))
          ) : (
            <p>Ничего не найдено</p>
          )}
        </div>
        <p>Фото на сайте могут отличаться от действительности</p>
      </div>

      {selectedItem && <ProductModal item={selectedItem} onClose={closeModal} />}

      <FloatingCartButton />
    </>
  );
};

export default Home;
