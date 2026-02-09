import React, { useState, useRef, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { StyledSearchBar as TextInput } from './StyledSearchBar'
import { StyledText as Text } from './StyledText'
import { searchPlaces, getPlaceDetails, reverseGeocode } from '../src/utils/mapServices'
 
import Octicons from '@expo/vector-icons/Octicons'
import Entypo from '@expo/vector-icons/Entypo'


const INITIAL_REGION = {
  latitude: 23.809741182039073,
  longitude: 90.41419583604615,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

export default function DualMapSearchWrapper({ 
  onStartSelected, 
  onDestinationSelected, 
  onPlaceSelected,
  startQuery, 
  destinationQuery,
  style, 
  placeholder,
  allowBoth = false 
}) {
  const mapRef = useRef(null)
  const [startQueryState, setStartQuery] = useState(startQuery || '')
  const [destinationQueryState, setDestinationQuery] = useState(destinationQuery || '')
  const [activeField, setActiveField] = useState('start')
  const [selectedStart, setSelectedStart] = useState(null)
  const [selectedDestination, setSelectedDestination] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (startQuery) {
      setStartQuery(startQuery)
    }
  }, [startQuery])

  useEffect(() => {
    if (destinationQuery) {
      setDestinationQuery(destinationQuery)
    }
  }, [destinationQuery])

  const currentQuery = activeField === 'start' ? startQueryState : destinationQueryState

  useEffect(() => {
    if (currentQuery.trim().length < 2) {
      setSuggestions([])
      return
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true)
      const results = await searchPlaces(currentQuery)
      setSuggestions(results || [])
      setIsLoading(false)
    }, 350)

    return () => clearTimeout(timeout)
  }, [currentQuery])

  const handleSelect = async (place) => {
    try {
      const details = await getPlaceDetails(place)
      const loc = details?.result?.geometry?.location

      if (!loc) {
        return
      }

      const placeData = {
        name: details?.result?.name,
        address: details?.result?.formatted_address,
        latitude: loc.lat,
        longitude: loc.lng,
      }

      const placeResult = {
        name: details?.result?.name,
        formatted_address: details?.result?.formatted_address,
        geometry: {
          location: {
            lat: loc.lat,
            lng: loc.lng
          }
        }
      }

      if (allowBoth) {
        if (activeField === 'start') {
          setSelectedStart(placeData)
          setStartQuery(placeData.name)
          onStartSelected?.(placeResult)
        } else {
          setSelectedDestination(placeData)
          setDestinationQuery(placeData.name)
          onDestinationSelected?.(placeResult)
        }
      } else {
        // For backward compatibility - single selection mode
        setSelectedStart(placeData)
        setStartQuery(placeData.name)
        onPlaceSelected?.(placeResult)
        onStartSelected?.(placeResult)
      }

      // Center map on selected location
      const region = {
        latitude: loc.lat,
        longitude: loc.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      mapRef.current?.animateToRegion(region, 500)
      
      setShowSuggestions(false)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <View style={[{backgroundColor: '#f7f7f7'}, style]}>
      <View style={styles.mapWrapper}>
        <MapView 
          ref={mapRef} 
          style={styles.map} 
          initialRegion={INITIAL_REGION}
        >
          {selectedStart && (
            <Marker
              coordinate={{
                latitude: selectedStart.latitude,
                longitude: selectedStart.longitude,
              }}
              title={selectedStart.name}
              description={selectedStart.address}
              pinColor="orange"
            />
          )}
          {selectedDestination && (
            <Marker
              coordinate={{
                latitude: selectedDestination.latitude,
                longitude: selectedDestination.longitude,
              }}
              title={selectedDestination.name}
              description={selectedDestination.address}
              pinColor="#e63e4c"
            />
          )}
        </MapView>
        
        {allowBoth ? (
          <>
            <View style={[styles.searchBar, {top: 20}]}>
              <Octicons name="dot-fill" size={20} color="#e63e4c" style={{marginRight: 5}} />
              <TextInput
                style={[{flex: 1}, styles.shadow]}
                placeholder="Starting point"
                value={startQueryState}
                onFocus={() => setActiveField('start')}
                onChangeText={(t) => {
                  setStartQuery(t)
                  setShowSuggestions(true)
                  setActiveField('start')
                }}
              />
            </View>
            

            <View style={[styles.searchBar, {top: 80}]}>
              <Entypo name="location-pin" size={20} color="#e63e4c" style={{marginRight: 5}}  />
              <TextInput
                style={[{flex: 1}, styles.shadow]}
                placeholder="Destination"
                value={destinationQueryState}
                onFocus={() => setActiveField('destination')}
                onChangeText={(t) => {
                  setDestinationQuery(t)
                  setShowSuggestions(true)
                  setActiveField('destination')
                }}
              />   
            </View>
          </>
                  ) : (
                    <View style={styles.searchBar}>
                      <TextInput
                        style={{flex: 1}}
                        placeholder={placeholder || "Starting point"}
                        value={startQueryState}
                        onChangeText={(t) => {
                          setStartQuery(t)
                          setShowSuggestions(true)
                        }}
                      />
                    </View>        )}
      </View>

      {showSuggestions && (
        <View style={[
          styles.suggestionOverlay, 
          allowBoth && { top: activeField === 'start' ? 73 : 133 }
        ]}>
          <View style={styles.suggestionList}>
            {isLoading && <Text>Loading...</Text>}
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.suggestionItem}
                onPress={() => handleSelect(item)}
              >
                <Text style={{ fontWeight: 'semibold' }}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0.5, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1,
  },
  mapWrapper: {
    width: '100%',
    aspectRatio: 0.55,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  suggestionOverlay: {
    position: 'absolute',
    top: 73, 
    left: 45,
    right: 20,
    zIndex: 1,
  },
  suggestionList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 0.8,
    borderColor: '#ddd',
    maxHeight: 250,
    overflow: 'hidden',
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
})
