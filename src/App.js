import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Map from './components/Map/Map';
import { ProgressBar } from 'react-bootstrap';
import * as turf from '@turf/turf';

const isoCodesPrimary = [
  "afg", "aze", "arm", "are", "ago", "bgr", "bfa", "ben", "bdi", "bgd", "caf", "btn", "bol", "blz", "blr",
  "com", "cod", "cmr", "cog", "civ", "col", "cpv", "egy", "dza", "esh", "ecu", "dom", "eri", "eth", "gin",
  "gnb", "gmb", "gha", "geo", "gnq", "hnd", "hti", "gtm", "grd", "hun", "irq", "ken", "kgz", "irn", "jam",
  "khm", "lao", "MAF", "lbn", "lby", "lbr", "lka", "kwt", "mex", "mar", "mda", "mng", "mli", "mdv", "moz",
  "mys", "mwi", "ner", "nga", "mrt", "nam", "npl", "omn", "pan", "nic", "pak", "pol", "per", "png", "prk",
  "pse", "sau", "qat", "sdn", "rou", "sen", "slv", "svk", "sle", "swz", "SXM", "som", "ssd", "tgo", "syr",
  "tcd", "TLS", "tha", "uga", "ven", "tun", "ukr", "tur", "vct", "zwe", "zmb", "yem", "vnm", "vut", "zaf"
];

const isoCodesFallback = [
  "abw", "atg", "aia", "alb", "arg", "bhr", "bes", "BLM", "bhs", "bra", "bmu", "bwa", "brb", "chn", "cri",
  "cub", "dji", "cym", "dma", "CUW", "fji", "glp", "fsm", "gab", "grc", "guf", "guy", "kir", "kaz", "lca",
  "lso", "kna", "mhl", "mdg", "mkd", "mmr", "mus", "msr", "mtq", "pri", "pry", "rwa", "rus", "sur", "stp",
  "slb", "tca", "tto", "syc", "ury", "vgb", "tza", "uzb", "vir"
];

const App = () => {
  const [boundaries, setBoundaries] = useState([]);
  const [currentISO, setCurrentISO] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const fetchNextBoundary = useCallback(() => {
    if (isoCodesPrimary.length > 0) {
      const nextISO = isoCodesPrimary.shift(); // Take the first ISO code from the list
      setCurrentISO(nextISO);
      fetchBoundaryAndData(nextISO, 'primary');
    } else if (isoCodesFallback.length > 0) {
      const nextISO = isoCodesFallback.shift(); // Take the first ISO code from the fallback list
      setCurrentISO(nextISO);
      fetchBoundaryAndData(nextISO, 'fallback');
    } else {
      console.log('All boundaries have been processed');
    }
  }, [isoCodesPrimary, isoCodesFallback]);

  useEffect(() => {
    if (!isFetching && currentISO === '') {
      fetchNextBoundary();
    }
  }, [isFetching, currentISO, fetchNextBoundary]);

  const fetchBoundaryAndData = async (isoCode, source) => {
    setIsFetching(true);

    try {
      // Fetch boundary data
      const boundaryUrl =
        source === 'primary'
          ? `http://localhost:5001/api/boundary/primary/${isoCode}`
          : `http://localhost:5001/api/boundary/fallback/${isoCode}`;
      console.debug(`Fetching boundary data from ${boundaryUrl}`);
      const boundaryResponse = await axios.get(boundaryUrl);
      if (boundaryResponse.status === 200 && boundaryResponse.data) {
        const boundaryData = boundaryResponse.data;
        boundaryData.properties = boundaryData.properties || {};

        // Calculate area using turf.js
        const areaInSqKmFromTurf = turf.area(boundaryData) / 1e6; // Convert square meters to square kilometers
        console.debug(`Calculated area in sq km using turf.js for ISO ${isoCode}:`, areaInSqKmFromTurf);

        // Fetch population data
        const populationUrl = `http://localhost:5001/api/population/${isoCode}`;
        console.debug(`Fetching population data from ${populationUrl}`);
        const populationResponse = await axios.get(populationUrl);
        console.debug(`Raw population data for ISO ${isoCode}:`, populationResponse.data);
        const populationData = populationResponse.status === 200 ? populationResponse.data : null;

        // Fetch AREA_SQKM data
        const areaSqKmUrl = `http://localhost:5001/api/area-sqkm/${isoCode}`;
        console.debug(`Fetching AREA_SQKM data from ${areaSqKmUrl}`);
        const areaSqKmResponse = await axios.get(areaSqKmUrl);
        console.debug(`Raw AREA_SQKM data for ISO ${isoCode}:`, areaSqKmResponse.data);
        const areaSqKmData = areaSqKmResponse.status === 200 ? areaSqKmResponse.data : null;

        let areaInSqKm = null;
        if (areaSqKmData && areaSqKmData.features && areaSqKmData.features.length > 0) {
          areaInSqKm = areaSqKmData.features.reduce((acc, feature) => {
            if (feature.attributes.AREA_SQKM !== undefined && feature.attributes.AREA_SQKM !== null) {
              console.debug(`Feature AREA_SQKM for ISO ${isoCode}:`, feature.attributes.AREA_SQKM);
              return acc + feature.attributes.AREA_SQKM;
            }
            return acc;
          }, 0);
          console.debug(`Total Area (sq km) for ISO ${isoCode}:`, areaInSqKm);
        }

        if (areaInSqKm > 0) {
          boundaryData.properties.area = areaInSqKm;
        } else {
          boundaryData.properties.area = areaInSqKmFromTurf;
        }
        console.debug(`Final area for ISO ${isoCode}:`, boundaryData.properties.area);

        let populationDensity = null;
        if (populationData && populationData.data && populationData.data.length > 0 && boundaryData.properties.area > 0) {
          const totalPopulation = populationData.data.reduce((acc, entry) => acc + (entry.T_TL || 0), 0);
          console.debug(`Total Population for ISO ${isoCode}:`, totalPopulation);
          populationDensity = totalPopulation / boundaryData.properties.area; // Population per sq km
          console.debug(`Calculated Population Density for ISO ${isoCode}:`, populationDensity);
        }

        // Ensure properties are properly initialized
        boundaryData.properties.area = boundaryData.properties.area || 0;
        boundaryData.properties.populationDensity = populationDensity || 0;

        console.debug(`Adding feature for ISO ${isoCode}:`, boundaryData.properties);
        if (!boundaryData.properties.area || !boundaryData.properties.populationDensity) {
          console.warn(`Missing area or population density for ISO ${isoCode}. Area: ${boundaryData.properties.area}, Population Density: ${boundaryData.properties.populationDensity}`);
        }

        setBoundaries((prevBoundaries) => [
          ...prevBoundaries,
          {
            isoCode,
            data: {
              ...boundaryData,
              properties: {
                ...boundaryData.properties,
                populationDensity,
                populationData,
              },
            },
          },
        ]);
      } else {
        console.warn(`Failed to load boundary for ISO code: ${isoCode}`);
      }
    } catch (error) {
      console.error(`Failed to load data for ISO code: ${isoCode} - ${error.message}`);
    } finally {
      setIsFetching(false);
      setTimeout(fetchNextBoundary, 1000); // Wait a second before fetching the next boundary
    }
  };

  const isValidBoundaryData = (data) => {
    if (!data || !data.features || data.features.length === 0) {
      console.warn(`Boundary data validation failed: ${JSON.stringify(data)}`);
      return false;
    }
    return true;
  };

  return (
    <div className="App">
      <h1>World Population and Buildings Map</h1>
      {boundaries.length > 0 ? (
        <Map boundaries={boundaries} />
      ) : (
        <p>Loading boundary, population, and building data for countries...</p>
      )}
    </div>
  );
};

export default App;
