// Quick test for Nominatim API
// Run this in the browser console or as a Node script to verify Nominatim is working

const testNominatim = async () => {
  try {
    const query = 'dhaka';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&countrycodes=bd`;
    
    console.log('Testing Nominatim with URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RideShare-App'
      }
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data && data.length > 0) {
      console.log('✓ Nominatim is working!');
      console.log('First result:', data[0]);
    } else {
      console.log('✗ No results returned');
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
};

// Test with different queries
const testQueries = async () => {
  const queries = ['dhaka', 'road', 'restaurant'];
  
  for (const q of queries) {
    console.log(`\n--- Testing: ${q} ---`);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=bd`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'RideShare-App' }
      });
      const data = await response.json();
      console.log(`"${q}": ${data.length} results`);
      if (data.length > 0) {
        console.log('Sample:', data[0].display_name);
      }
    } catch (error) {
      console.error(`Error with "${q}":`, error.message);
    }
  }
};

// Run tests
testNominatim();
// testQueries();
