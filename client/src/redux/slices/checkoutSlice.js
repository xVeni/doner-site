import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  customerName: '',
  phone: '',
  email: '',
  comment: '',
  deliveryType: 'delivery',
  paymentMethod: 'online',
  changeAmount: '',
  callBack: false,
  timeOption: 'nearest',
  orderTime: '',
  agreePolicy: false,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setField(state, action) {
      const { field, value } = action.payload;
      state[field] = value;
    },

    resetCheckoutForm(state) {
      Object.assign(state, initialState);
    },
  },
});

export const { setField, resetCheckoutForm } = checkoutSlice.actions;
export default checkoutSlice.reducer;
