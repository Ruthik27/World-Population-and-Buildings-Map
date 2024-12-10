
const { getBuildingGeoJSON } = require('../building');

const fetchBuildingData = async (req, res) => {
  const { pCode, level } = req.params;

  try {
    const buildingData = await getBuildingGeoJSON(pCode, level);
    res.json(buildingData);
  } catch (error) {
    res.status(500).send('Error fetching building data');
  }
};

module.exports = { fetchBuildingData };
