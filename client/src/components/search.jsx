import React from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IoClose } from 'react-icons/io5';
import { SearchContext } from '../App';
import debounce from 'lodash.debounce';
import { useSelector } from 'react-redux';

const Search = () => {
  const { items, totalPrice } = useSelector((state) => state.cart);

  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  const [value, setValue] = React.useState('');
  const { setSearchValue } = React.useContext(SearchContext);
  const inputRef = React.useRef();

  const onClickClear = () => {
    setSearchValue('');
    setValue('');
    inputRef.current.focus();
  };

  const updateSearchValue = React.useCallback(
    debounce((str) => {
      setSearchValue(str);
    }, 250),
    [],
  );

  const onChangeInput = (event) => {
    setValue(event.target.value);
    updateSearchValue(event.target.value);
  };

  const location = useLocation();
  const isCartPage = location.pathname === '/cart';

  return (
    <div className="search-cart">
      {!isCartPage && (
        <>
          <div className="input-wrapper">
            <input
              ref={inputRef}
              value={value}
              onChange={onChangeInput}
              placeholder="Искать блюдо..."
            />
            {value && <IoClose className="clear-btn" onClick={onClickClear} />}
          </div>

          <Link to="/cart" className="cart-link">
            <div className="cart-info">
              <span className="cart-sum">{totalPrice} ₽</span>
              <span className="divider">|</span>
              <FaShoppingCart className="cart-icon" />
              <span className="cart-count">{totalCount}</span>
            </div>
          </Link>
        </>
      )}
    </div>
  );
};

export default Search;
