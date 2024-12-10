import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';

// Define the mapbox access token from the environment variable
const mapboxAccessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

if (!mapboxAccessToken) {
  console.error('Mapbox access token is not defined in environment variables. Make sure REACT_APP_MAPBOX_ACCESS_TOKEN is set.');
}

mapboxgl.accessToken = mapboxAccessToken;

// Generate a random color
const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const Map = ({ boundaries }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Initialize the map if it hasn't been initialized yet
    if (mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0, 0],
      zoom: 2,
    });

    mapRef.current.on('load', () => {
      console.log('Map style has loaded');
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const addBoundaryData = () => {
      boundaries.forEach((boundary) => {
        const { isoCode, data } = boundary;
        const sourceId = `${isoCode}-boundary`;
        const populationDensity = data.properties?.populationDensity || 0;
        const area = data.properties?.area || 0;

        if (mapRef.current.getSource(sourceId)) {
          console.log(`Source for ISO ${isoCode} already exists. Skipping...`);
          return; // Skip if source already exists to avoid duplicates
        }

        // Debug: Log boundary data to check the properties
        console.debug(`Adding boundary data for ISO: ${isoCode}`, data);
        console.debug(`Population Density for ISO ${isoCode}:`, populationDensity);
        console.debug(`Area (sq km) for ISO ${isoCode}:`, area);

        if (!data || !data.features || data.features.length === 0) {
          console.warn(`Invalid boundary data for ISO code ${isoCode}`);
          return; // Skip this iteration if data is invalid
        }

        // Add the GeoJSON source to the map
        mapRef.current.addSource(sourceId, {
          type: 'geojson',
          data,
        });

        // Add a random fill color for countries without heatmap visualization
        const randomColor = getRandomColor();

        // Add a fill layer for the country area
        mapRef.current.addLayer({
          id: `layer-${isoCode}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': randomColor,
            'fill-opacity': 0.5,
          },
        });

        // Generate points within the boundary polygon
        const countryPolygon = data.features[0]; // Assuming the first feature is the country polygon
        if (countryPolygon && (countryPolygon.geometry.type === 'Polygon' || countryPolygon.geometry.type === 'MultiPolygon')) {
          // Calculate number of points based on population size
          const scalingFactor = 0.00001; // Adjust this factor as needed to keep performance balanced
          const population = data.properties?.populationDensity * area; // Estimated total population
          const numberOfPoints = Math.ceil(population * scalingFactor);

          if (numberOfPoints <= 0) {
            console.warn(`No points to generate for ISO code ${isoCode}, skipping heatmap creation.`);
            return;
          }

          const pointsWithinCountry = turf.randomPoint(numberOfPoints, { bbox: turf.bbox(countryPolygon) });
          const pointsFiltered = pointsWithinCountry.features.filter((point) =>
            turf.booleanPointInPolygon(point, countryPolygon)
          );

          const pointFeatures = pointsFiltered.map((point) => ({
            type: 'Feature',
            geometry: point.geometry,
            properties: {
              populationDensity,
            },
          }));

          const pointCollection = {
            type: 'FeatureCollection',
            features: pointFeatures,
          };

          const pointSourceId = `${isoCode}-points`;
          mapRef.current.addSource(pointSourceId, {
            type: 'geojson',
            data: pointCollection,
          });

          // Add heatmap layer using the generated points
          mapRef.current.addLayer({
            id: `layer-${isoCode}-population-heatmap`,
            type: 'heatmap',
            source: pointSourceId,
            paint: {
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'populationDensity'],
                0, 0,
                500, 1,
              ],
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.5,
                9, 1,
              ],
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 10,
                9, 20,
              ],
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 0.6,
                9, 0.4,
              ],
            },
          });

          console.log(`Boundary and heatmap successfully displayed on the map for ISO code: ${isoCode}`);
        } else {
          console.warn(`Country polygon is invalid or not a Polygon for ISO code ${isoCode}`);
        }
      });
    };

    if (mapRef.current.isStyleLoaded()) {
      addBoundaryData();
    } else {
      mapRef.current.once('load', () => {
        addBoundaryData();
      });
    }
  }, [boundaries]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '500px' }} />;
};

export default Map;
