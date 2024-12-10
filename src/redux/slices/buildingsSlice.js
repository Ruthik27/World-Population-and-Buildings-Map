import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchBuildingData = createAsyncThunk(
  'buildings/fetchBuildingData',
  async () => {
    const response = await axios.get('http://localhost:5001/api/buildings');
    return response.data;
  }
);

const buildingsSlice = createSlice({
  name: 'buildings',
  initialState: {
    data: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBuildingData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchBuildingData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchBuildingData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default buildingsSlice.reducer;