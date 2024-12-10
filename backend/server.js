// Import required libraries
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 5001;

// Enable CORS for all requests
app.use(cors());

// Define API base URLs
const COD_API_BASE = 'https://apps.itos.uga.edu/CODV2API/api/v1';
const ARCGIS_PRIMARY_BASE = 'https://codgis.itos.uga.edu/arcgis/rest/services/COD_External';
const ARCGIS_FALLBACK_BASE = 'https://codgis.itos.uga.edu/arcgis/rest/services/COD_NO_GEOM_CHECK';
const POPULATION_API_BASE = 'https://apps.itos.uga.edu/CODV2API/api/v1/themes/cod-ps';

// Function to retry failed requests with exponential backoff
const fetchWithRetry = async (url, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay * Math.pow(2, i))); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
};

// Endpoint to fetch primary boundary data
app.get('/api/boundary/primary/:iso', async (req, res) => {
  const { iso } = req.params;
  const url = `${ARCGIS_PRIMARY_BASE}/${iso.toUpperCase()}_pcode/FeatureServer/0/query?where=0=0&outFields=*&returnGeometry=true&f=geojson`;

  try {
    console.log(`Fetching primary boundary data from ${url}`);
    const response = await axios.get(url);
    if (response.status === 200 && response.data) {
      res.json(response.data);
    } else {
      res.status(404).json({ error: 'Primary boundary data not found' });
    }
  } catch (error) {
    console.error(`Error fetching primary boundary data for ISO ${iso}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch primary boundary data' });
  }
});

// Endpoint to fetch fallback boundary data
app.get('/api/boundary/fallback/:iso', async (req, res) => {
  const { iso } = req.params;
  const url = `${ARCGIS_FALLBACK_BASE}/${iso.toUpperCase()}_pcode/FeatureServer/0/query?where=0=0&outFields=*&returnGeometry=true&f=geojson`;

  try {
    console.log(`Fetching fallback boundary data from ${url}`);
    const response = await axios.get(url);
    if (response.status === 200 && response.data) {
      res.json(response.data);
    } else {
      res.status(404).json({ error: 'Fallback boundary data not found' });
    }
  } catch (error) {
    console.error(`Error fetching fallback boundary data for ISO ${iso}: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch fallback boundary data' });
  }
});

// Endpoint to fetch population data
app.get('/api/population/:iso', async (req, res) => {
  const { iso } = req.params;
  const url = `${POPULATION_API_BASE}/lookup/Get/1/dma/${iso.toLowerCase()}`;

  try {
    console.log(`Fetching population data from ${url}`);
    const response = await fetchWithRetry(url);
    if (response.status === 200 && response.data) {
      if (response.data && response.data.data && response.data.data.length > 0) {
        const formattedData = {
          ADM0_PCODE: response.data.ADM0_PCODE,
          ADM0_NAME: response.data.ADM0_NAME,
          Year: response.data.Year,
          data: response.data.data.map((entry) => {
            return {
              ADM1_PCODE: entry.ADM1_PCODE,
              ADM1_NAME: entry.ADM1_NAME,
              T_TL: entry.T_TL,
              populationDensity: entry.T_TL, // Adding total population as populationDensity placeholder
              ...entry
            };
          })
        };
        res.json(formattedData);
      } else {
        res.status(404).json({ error: 'Population data not found or is empty' });
      }
    } else {
      res.status(404).json({ error: 'Population data not found' });
    }
  } catch (error) {
    console.error(`Error fetching population data for ISO ${iso}: ${error.message}`);
    res.status(500).json({ error: `Failed to fetch population data for ISO ${iso}` });
  }
});

// Endpoint to fetch building data by bounding box
app.get('/api/buildings/:bbox', async (req, res) => {
  const { bbox } = req.params; // Bounding box should be passed as a parameter
  const apiKey = process.env.REACT_APP_OPEN_BUILDINGS_API_KEY;
  const openBuildingsUrl = `https://openbuildings.googleapis.com/v3/polygons?bbox=${bbox}&key=${apiKey}`;

  try {
    const response = await fetchWithRetry(openBuildingsUrl);
    if (response.status === 200 && response.data) {
      res.json(response.data);
    } else {
      res.status(404).json({ error: 'Building data not found' });
    }
  } catch (error) {
    console.error(`Error fetching building data: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch building data' });
  }
});

// Endpoint to fetch AREA_SQKM data with fallback
app.get('/api/area-sqkm/:iso', async (req, res) => {
  const { iso } = req.params;
  const primaryUrl = `${ARCGIS_PRIMARY_BASE}/${iso.toUpperCase()}_pcode/FeatureServer/0/query?where=0=0&outFields=*&returnGeometry=false&f=json`;
  const fallbackUrl = `${ARCGIS_FALLBACK_BASE}/${iso.toUpperCase()}_pcode/FeatureServer/0/query?where=0=0&outFields=*&returnGeometry=false&f=json`;

  try {
    console.log(`Fetching AREA_SQKM data from primary URL: ${primaryUrl}`);
    let response = await axios.get(primaryUrl);
    if (response.status !== 200 || !response.data) {
      console.log(`Primary request failed. Fetching AREA_SQKM data from fallback URL: ${fallbackUrl}`);
      response = await axios.get(fallbackUrl);
    }
    if (response.status === 200 && response.data) {
      res.json(response.data);
    } else {
      res.status(404).json({ error: 'AREA_SQKM data not found' });
    }
  } catch (error) {
    console.error(`Error fetching AREA_SQKM data for ISO ${iso}: ${error.message}`);
    res.status(500).json({ error: `Failed to fetch AREA_SQKM data for ISO ${iso}` });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
