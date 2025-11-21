import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchDish = createAsyncThunk(
  'dish/fetchDishStatus',
  async ({ categoryId, searchValue }, { rejectWithValue }) => {
    try {
      const categoryParam = categoryId > 1 ? `category=${categoryId}&` : '';
      const searchParam = searchValue ? `search=${encodeURIComponent(searchValue)}` : '';

      const url = `/api/dishes?`;
      // ${categoryParam}${searchValue}
      const { data } = await axios.get(url);

      return Array.isArray(data) ? data : [];
    } catch (err) {
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
