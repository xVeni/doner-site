import React from 'react';

import './scss/app.scss';
import Header from './components/header';
import Footer from './components/footer/footer';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Cart from './pages/Cart';
import About from './pages/About';
import Offer from './pages/Offer';
import Zone from './pages/Zone';
import { Routes, Route } from 'react-router-dom';

export const SearchContext = React.createContext();

function App() {
  const [searchValue, setSearchValue] = React.useState('');

  return (
    <div className="page">
      <SearchContext.Provider value={{ searchValue, setSearchValue }}>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/about" element={<About />} />
          <Route path="/offer" element={<Offer />} />
          <Route path="/zone" element={<Zone />} />
        </Routes>
        <Footer />
      </SearchContext.Provider>
    </div>
  );
}

export default App;
