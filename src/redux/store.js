// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import populationReducer from './slices/populationSlice';
import buildingsReducer from './slices/buildingsSlice';

const store = configureStore({
  reducer: {
    population: populationReducer,
    buildings: buildingsReducer,
    // Add other reducers here
  },
});

export default store;
