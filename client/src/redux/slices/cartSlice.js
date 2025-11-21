import { createSlice } from '@reduxjs/toolkit';

// ===================================================================
// 🔥 ДОБАВЛЕНО: загрузка данных корзины из localStorage
// ===================================================================
const loadCartFromLocalStorage = () => {
  try {
    const data = localStorage.getItem('cart');
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Ошибка загрузки корзины:', err);
  }

  // если localStorage пустой — вернуть стандартное состояние
  return {
    totalPrice: 0,
    items: [],
  };
};

// ===================================================================
// 🔥 ДОБАВЛЕНО: сохранение корзины в localStorage
// ===================================================================
const saveCartToLocalStorage = (state) => {
  try {
    localStorage.setItem('cart', JSON.stringify(state));
  } catch (err) {
    console.error('Ошибка сохранения корзины:', err);
  }
};

// ===================================================================
// ⚠️ ЗАМЕНЕНО initialState
// Было:
// const initialState = { totalPrice: 0, items: [] };
// Стало: загружаем корзину из localStorage
// ===================================================================
const initialState = loadCartFromLocalStorage();

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem(state, action) {
      const findItem = state.items.find((obj) => obj.id === action.payload.id);

      if (findItem) {
        findItem.count++;
      } else {
        state.items.push({
          ...action.payload,
          count: 1,
        });
      }

      state.totalPrice = state.items.reduce((sum, obj) => obj.price * obj.count + sum, 0);

      // 🔥 ДОБАВЛЕНО: сохраняем изменения
      saveCartToLocalStorage(state);
    },

    minusItem(state, action) {
      const findItem = state.items.find((obj) => obj.id == action.payload);

      if (findItem) {
        findItem.count--;
        if (findItem.count < 1) {
          state.items = state.items.filter((obj) => obj.id !== action.payload);
        }
      }

      state.totalPrice = state.items.reduce((sum, obj) => obj.price * obj.count + sum, 0);

      // 🔥 ДОБАВЛЕНО: сохраняем изменения
      saveCartToLocalStorage(state);
    },

    removeItem(state, action) {
      state.items = state.items.filter((obj) => obj.id !== action.payload);

      state.totalPrice = state.items.reduce((sum, obj) => obj.price * obj.count + sum, 0);

      // 🔥 ДОБАВЛЕНО: сохраняем изменения
      saveCartToLocalStorage(state);
    },

    clearItems(state) {
      state.items = [];
      state.totalPrice = 0;

      // 🔥 ДОБАВЛЕНО: сохраняем изменения
      saveCartToLocalStorage(state);
    },
  },
});

export const { addItem, removeItem, clearItems, minusItem } = cartSlice.actions;

export default cartSlice.reducer;
