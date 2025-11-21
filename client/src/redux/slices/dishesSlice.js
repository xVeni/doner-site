import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchDish = createAsyncThunk(
  'dish/fetchDishStatus',
  async ({ categoryId, search }, { rejectWithValue }) => {
    try {
      // Категория 0 и 1 — не добавляем параметр category (0 = хиты, 1 = все)
      const categoryParam = categoryId > 1 ? `category=${categoryId}&` : '';
      // const url = `http://192.168.0.14:5000/dishes?${categoryParam}${search}`;
      const url = `https://6909ebe21a446bb9cc209955.mockapi.io/Items?${categoryParam}${search}`;
      const { data } = await axios.get(url);
      return data;
    } catch (err) {
      console.error('Ошибка при загрузке блюд:', err);
      return rejectWithValue('Ошибка при получении данных');
    }
  },
);

const initialState = {
  items: [],
  status: 'loading', // loading | success | error
};

const dishSlice = createSlice({
  name: 'dish',
  initialState,
  reducers: {
    setItems(state, action) {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDish.pending, (state) => {
        state.status = 'loading';
        state.items = [];
      })
      .addCase(fetchDish.fulfilled, (state, action) => {
        // Если выбрана категория 0 — показываем только best_sell
        if (action.meta.arg.categoryId === 0) {
          state.items = action.payload.filter((item) => item.best_sell === 1);
        } else {
          state.items = action.payload;
        }
        state.status = 'success';
      })
      .addCase(fetchDish.rejected, (state) => {
        state.status = 'error';
        state.items = [];
      });
  },
});

export const { setItems } = dishSlice.actions;
export default dishSlice.reducer;
