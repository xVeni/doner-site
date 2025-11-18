import { configureStore } from '@reduxjs/toolkit';
import filter from './slices/filterSlice';
import cart from './slices/cartSlice';
import dish from './slices/dishesSlice';

export const store = configureStore({
  reducer: {
    filter,
    cart,
    dish,
  },
});
