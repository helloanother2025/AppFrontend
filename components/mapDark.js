export const mapDark = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#1d1d1d" }]   
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#cfcfcf" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#1d1d1d" }]
  },

  /* COUNTRY BORDERS */
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#000" },   
      { "weight": 1 }
    ]
  },

  /* PROVINCE / DIVISION BORDERS */
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#3b3b3b" },
      { "weight": 0.6 }
    ]
  },

  /* NATURAL AREAS */
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [
      { "color": "#384f44" } 
    ]
  },

  /* PARKS */
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      { "color": "#1f2f1f" }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#7cab7c" } 
    ]
  },

  /* POI BUILDINGS */
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#2a2a2a" }]
  },

  /* ROADS */
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#2e2e2e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#404040" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#3c3c3c" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#565656" }]
  },

  /* WATER */
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      { "color": "#1e334a" }   
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4a6475" }]
  }
];
