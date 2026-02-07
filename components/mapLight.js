export const mapLight = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#f5f5f5" }]
  },

  /* COUNTRY BORDERS */
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#9e9e9e" },  
      { "weight": 1 }
    ]
  },

  /* STATE / DIVISION BORDER LINES (thin, light grey) */
  {
    "featureType": "administrative.province",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#c6c6c6" },
      { "weight": 0.6 }
    ]
  },

  /* NATURAL AREAS (Google-style strong green) */
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [
      { "color": "#d6f5d6" }
    ]
  },

  /* PARKS (slightly darker than natural areas) */
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      { "color": "#a3cfa5" }   
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#6b9a76" }
    ]
  },

  /* POI grey blocks */
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#eaeaea" }]
  },

  /* ROADS */
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#d6d6d6" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#dadada" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#bfbfbf" }]
  },

  /* WATER */
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#a6d8ff" }] 
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#7a8691" }]
  }
];
