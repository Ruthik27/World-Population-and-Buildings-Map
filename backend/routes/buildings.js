// Building.js - Controller for fetching building data
// Backend: BuildingController.js (Node/Express)
const express = require('express');
const router = express.Router();
const axios = require('axios');

// Endpoint to fetch building data
router.get('/api/building/:countryCode', async (req, res) => {
  const { countryCode } = req.params;
  try {
    const response = await axios.get(`https://apps.itos.uga.edu/CODV2API/api/v1/themes/buildings/lookup/1/${countryCode}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching building data:', error);
    res.status(500).json({ error: 'Failed to fetch building data' });
  }
});

module.exports = router;

// Add these controllers in your server.js like this:
// const popController = require('./controllers/PopController');
// const buildingController = require('./controllers/BuildingController');
// app.use(popController);
// app.use(buildingController);

// This way, you can handle the various requests for population and building data dynamically.