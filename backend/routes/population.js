
const axios = require('axios');

const getPopulationGeoJSON = async (pCode, level) => {
  const url = `https://apps.itos.uga.edu/CODV2API/api/v1/themes/cod-ps/lookup/${level}/${pCode}`;

  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching population GeoJSON:', error.message);
    throw new Error('Error fetching population data');
  }
};

module.exports = { getPopulationGeoJSON };


