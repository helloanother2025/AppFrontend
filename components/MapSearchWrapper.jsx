import React, { useState, useRef, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { StyledSearchBar as TextInput } from './StyledSearchBar'
import { StyledText as Text } from './StyledText'
import { searchPlaces, getPlaceDetails, reverseGeocode } from '../src/utils/mapServices'

const INITIAL_REGION = {
  latitude: 23.8103,
  longitude: 90.4125,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

export default function MapSearch({ onPlaceSelected, searchQuery, style, enableMapPick = true }) {
  const mapRef = useRef(null)
  const [query, setQuery] = useState(searchQuery || '')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (searchQuery) {
      setQuery(searchQuery)
    }
  }, [searchQuery])

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true)
      const results = await searchPlaces(query)
      setSuggestions(results || [])
      setIsLoading(false)
    }, 350)

    return () => clearTimeout(timeout)
  }, [query])

  const handleSelect = async (place) => {
    try {
      const details = await getPlaceDetails(place)
      const loc = details?.result?.geometry?.location

      if (!loc) {
        return
      }

      const region = {
        latitude: loc.lat,
        longitude: loc.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }

      setSelectedPlace({
        name: details?.result?.name,
        address: details?.result?.formatted_address,
        latitude: loc.lat,
        longitude: loc.lng,
      })

      mapRef.current?.animateToRegion(region, 500)
      onPlaceSelected?.(details?.result)
      setShowSuggestions(false)
      setQuery(place.description)
    } catch (err) {
      console.error(err)
    }
  }

  const handleMapPress = async (event) => {
    if (!enableMapPick) return

    try {
      const { latitude, longitude } = event.nativeEvent.coordinate
      const result = await reverseGeocode(latitude, longitude)

      const name = result?.name || 'Selected location'
      const address = result?.address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`

      setSelectedPlace({
        name,
        address,
        latitude,
        longitude,
      })

      const region = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }

      mapRef.current?.animateToRegion(region, 500)
      setQuery(address)
      setShowSuggestions(false)

      onPlaceSelected?.({
        name,
        formatted_address: address,
        geometry: { location: { lat: latitude, lng: longitude } },
      })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <View style={style}>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search location..."
          value={query}
          onChangeText={(t) => {
            setQuery(t)
            setShowSuggestions(true)
          }}
        />

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionList} onStartShouldSetResponder={() => true}>
            <ScrollView
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              {isLoading && <Text>Loading...</Text>}
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.suggestionText}>{item.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          onPress={handleMapPress}
        >
          {selectedPlace && (
            <Marker
              coordinate={{
                latitude: selectedPlace.latitude,
                longitude: selectedPlace.longitude,
              }}
              title={selectedPlace.name}
              description={selectedPlace.address}
            />
          )}
        </MapView>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  searchContainer: {
    position: 'relative',
    zIndex: 10,
  },
  mapWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#e6e6e6',
    marginTop: 10,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  suggestionList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 250,
    overflow: 'hidden',
    marginTop: -8,
    elevation: 5, 
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontWeight: 'semibold',
  },
})
