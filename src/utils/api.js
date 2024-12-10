import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

export const getPopulationData = async (isoCode) => {
  try {
    const response = await axios.get(`http://localhost:5001/api/population/${isoCode}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching population data:', error.message);
    throw error;
  }
};

export const getBuildingData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/buildings`);
    return response.data;
  } catch (error) {
    console.error('Error fetching building data:', error.message);
    throw error;
  }
};
