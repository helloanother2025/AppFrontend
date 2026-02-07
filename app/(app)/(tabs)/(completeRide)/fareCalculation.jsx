import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'
import { StyledText as Text } from '../../../../components/StyledText'
import { StyledTitle as Title } from '../../../../components/StyledTitle' 
import { StyledCard as Card } from '../../../../components/StyledCard'
import { StyledNavigatorButton as NavButton } from '../../../../components/StyledNavigatorButton'
import rides from '../../../../data/rideData.json'
import { useRouter } from 'expo-router'; 
import * as polyline from '@mapbox/polyline';

const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Helpers to work along the ride route polyline
const toRad = (x) => (x * Math.PI) / 180;
function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function xyAt(refLat, p) {
  return { x: toRad(p.longitude) * Math.cos(toRad(refLat)), y: toRad(p.latitude) };
}
function projectPointToSegment(p, v, w) {
  const refLat = (v.latitude + w.latitude) / 2;
  const P = xyAt(refLat, p);
  const V = xyAt(refLat, v);
  const W = xyAt(refLat, w);
  const vx = W.x - V.x; const vy = W.y - V.y;
  const len2 = vx * vx + vy * vy;
  let t = 0; if (len2 > 0) { t = ((P.x - V.x) * vx + (P.y - V.y) * vy) / len2; t = Math.max(0, Math.min(1, t)); }
  const proj = { latitude: v.latitude + t * (w.latitude - v.latitude), longitude: v.longitude + t * (w.longitude - v.longitude) };
  const distKm = haversineKm(p, proj);
  const segLenKm = haversineKm(v, w);
  return { distKm, t, proj, segLenKm };
}
function projectPointToRoute(location, routeCoords, thresholdKm = 2) {
  if (!location || !routeCoords || routeCoords.length < 2) return { onRoute: false, posKm: -1, minDistKm: Infinity };
  let bestMinDist = Infinity; let bestPosKm = 0; let cumulative = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const v = routeCoords[i]; const w = routeCoords[i + 1];
    const { distKm, t, segLenKm } = projectPointToSegment(location, v, w);
    if (distKm < bestMinDist) { bestMinDist = distKm; bestPosKm = cumulative + t * segLenKm; }
    cumulative += segLenKm;
  }
  return { onRoute: bestMinDist <= thresholdKm, posKm: bestPosKm, minDistKm: bestMinDist };
}

export default function FareCalculation() {
  const currentRide = rides[0];
  const router = useRouter();
  const [fareBreakdown, setFareBreakdown] = useState([]);
  const [summary, setSummary] = useState({ totalFare: 0, totalDistanceKm: 0, participants: 0 });

  const getDistances = async () => {
    const rideStart = currentRide.start.coords;
    const rideEnd   = currentRide.destination.coords;
    const totalFare = parseFloat(currentRide.fare);

    // Decode route polyline and compute total route length
    const routeCoords = currentRide.routePolyline
      ? polyline.decode(currentRide.routePolyline).map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
      : [
          { latitude: rideStart.lat, longitude: rideStart.lng },
          { latitude: rideEnd.lat, longitude: rideEnd.lng },
        ];

    let totalDistanceKm = 0;
    for (let i = 0; i < routeCoords.length - 1; i++) {
      totalDistanceKm += haversineKm(routeCoords[i], routeCoords[i + 1]);
    }

    const participants = [];
    // Creator travels the full ride distance
    participants.push({
      name: currentRide.creator.name,
      handle: currentRide.creator.handle,
      distance: totalDistanceKm,
      isCreator: true,
      startName: currentRide.start?.name || 'Start',
      endName: currentRide.destination?.name || 'Destination',
    });

    // Partners: project onto route and cap within ride bounds
    for (const partner of currentRide.partners) {
      const start = { latitude: partner.start.coords.lat, longitude: partner.start.coords.lng };
      const end   = { latitude: partner.destination.coords.lat, longitude: partner.destination.coords.lng };

      const startProj = projectPointToRoute(start, routeCoords, 2);
      const endProj   = projectPointToRoute(end, routeCoords, 2);

      const clampedStartPos = Math.min(Math.max(startProj.posKm, 0), totalDistanceKm);
      const clampedEndPos   = Math.min(Math.max(endProj.posKm, 0), totalDistanceKm);
      const effectiveKm     = Math.max(0, clampedEndPos - clampedStartPos);

      participants.push({
        name: partner.name,
        handle: partner.handle,
        distance: effectiveKm,
        isCreator: false,
        startName: partner.start?.name || 'Pickup',
        endName: partner.destination?.name || 'Drop-off',
      });
    }

    const sumDistances = participants.reduce((sum, p) => sum + p.distance, 0) || 1;

    const breakdown = participants.map((p) => ({
      name: p.name,
      handle: p.handle,
      distance: p.distance,
      fare: ((p.distance / sumDistances) * totalFare).toFixed(2),
      isCreator: p.isCreator,
      startName: p.startName,
      endName: p.endName,
    }));

    setFareBreakdown(breakdown);
    setSummary({ totalFare, totalDistanceKm, participants: participants.length });
  };

  useEffect(() => {
    getDistances();
  }, []);

  return (
    <ScrollView>
      <Title style={{marginTop: 10}}>Fare breakdown</Title>

      <Card>
        <View style={{width: '100%'}}>
          <View style={styles.listHeader}>
            <Text style={[styles.listHeaderText, {flex: 1.5}]}>Participant</Text>
            <Text style={[styles.listHeaderText, {flex: 1, textAlign: 'right'}]}>Distance</Text>
            <Text style={[styles.listHeaderText, {flex: 1, textAlign: 'right'}]}>Share</Text>
          </View>

          {fareBreakdown.map((p, i) => (
            <View key={i} style={styles.listRow}>
              <View style={{flex: 1.5}}>
                <Text style={styles.nameText}>{p.name}</Text>
                <Text style={styles.handle}>{p.handle}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  {p.isCreator ? (
                    <View style={styles.chip}>
                      <Text numberOfLines={1} style={[styles.chipText]}>Full route</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.chip}>
                        <Text numberOfLines={1} style={styles.chipText}>{p.startName}</Text>
                      </View>
                      <Text style={{ marginHorizontal: 6, color: '#999' }}>→</Text>
                      <View style={[styles.chip, { borderColor: '#e63e4c' }]}>
                        <Text numberOfLines={1} style={[styles.chipText, { color: '#e63e4c' }]}>{p.endName}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
              <Text style={[styles.cellText, {flex: 1, textAlign: 'right'}]}>{p.distance.toFixed(2)} km</Text>
              <Text style={[styles.fareValue, {flex: 1, textAlign: 'right'}]}>৳ {p.fare}</Text>
            </View>
          ))}
        </View>

        <View style={styles.itemDivider}></View>

        <View style={styles.summaryRow}> 
          <Text style={styles.summaryLabel}>Total fare</Text>
          <Text style={styles.summaryValue}>৳ {currentRide.fare}</Text>
        </View>
      </Card>

      <View style={styles.buttonRow}>
        <NavButton
            onPress={() => router.back()}
            style={{ width: '25%' }}
          />
          <NavButton
            onPress={() => router.push('/partnerFeedback')}
            back={false}
            style={{ width: '25%' }}
          />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  summaryRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    justifyContent: 'space-between',
  },
  itemDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eee',
  },
  summaryLabel: {
    fontWeight: 'semibold',
    fontSize: 18,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'semibold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    width: '100%',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listHeaderText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: 160,
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  participantRole: { 
    fontSize: 12, 
    color: '#000',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  handle: {
    color: '#888',
    fontSize: 13,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'semibold',
    color: '#000',
    paddingRight: 2,
  },
  cellText: {
    fontSize: 15,
    color: '#000',
  },
  fareRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 8
  },
  fareLabel: { 
    fontSize: 16, 
    color: '#333' 
  },
  fareValue: { 
    fontSize: 16, 
    fontWeight: 'semibold',
  },
})
