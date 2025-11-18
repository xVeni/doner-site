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

  // Определяем, какие товары показывать
  const displayedItems = React.useMemo(() => {
    if (categoryId === 0) {
      return items.filter((item) => item.best_sell === 1); // Хиты продаж
    } else if (categoryId === 1) {
      return items; // Все товары
    } else {
      return items.filter((item) => item.category === categoryId); // Остальные категории
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
    dispatch(fetchDish({ categoryId, searchValue }));
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
      </div>

      {selectedItem && <ProductModal item={selectedItem} onClose={closeModal} />}

      <FloatingCartButton />
    </>
  );
};

export default Home;
