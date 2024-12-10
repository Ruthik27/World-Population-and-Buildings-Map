// Pop.js - Controller for fetching population data
// Backend: PopController.js (Node/Express)
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Endpoint to fetch population data
router.get('/api/population/:countryCode', async (req, res) => {
  const { countryCode } = req.params;
  try {
    const response = await axios.get(`https://apps.itos.uga.edu/CODV2API/api/v1/themes/cod-ps/lookup/1/${countryCode}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching population data:', error);
    res.status(500).json({ error: 'Failed to fetch population data' });
  }
});

module.exports = router;

