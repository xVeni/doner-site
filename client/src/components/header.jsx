import { Link, useNavigate } from 'react-router-dom';
import Search from './search';

function Header() {
  return (
    <div className="header">
      <div className="logo">
        <Link to="/" className="logo">
          <img src="/images/logo.png" alt="Логотип" className="logo-circle" />
        </Link>

        <div className="logo-text">
          <h1>DONER KEBAB</h1>
          <p>КАФЕ БЫСТРОГО ПИТАНИЯ</p>
          <a href="tel:+79144871717" className="phone">
            +7(914)-487-17-17
          </a>
        </div>
      </div>

      <div className="search-cart">
        <Search />
      </div>
    </div>
  );
}

export default Header;
