import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const fetchPopulationData = createAsyncThunk(
  'population/fetchPopulationData',
  async () => {
    const response = await axios.get('http://localhost:5001/api/population');
    return response.data;
  }
);

const populationSlice = createSlice({
  name: 'population',
  initialState: {
    data: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPopulationData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPopulationData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchPopulationData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default populationSlice.reducer;