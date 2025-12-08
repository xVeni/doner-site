import { configureStore } from '@reduxjs/toolkit';
import filter from './slices/filterSlice';
import cart from './slices/cartSlice';
import dish from './slices/dishesSlice';
import checkout from './slices/checkoutSlice';

export const store = configureStore({
  reducer: {
    filter,
    cart,
    dish,
    checkout,
  },
});
