import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView';
import { useRouter } from 'expo-router';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledCard as Card } from '../../../components/StyledCard';
import { useRide } from '../../../context/RideContext';

const PartnerFeedback = () => {
  const router = useRouter();
  const { selectedRide, myRides, rides: availableRides } = useRide();
  const currentRide = selectedRide || myRides[0] || availableRides[0];

  const [partners, setPartners] = useState(
    (currentRide?.partners || []).map(p => ({ ...p, rating: p.rating || 0 }))
  );

  const handleRating = (partnerHandle, rating) => {
    setPartners(
      partners.map((p) => (p.handle === partnerHandle ? { ...p, rating } : p))
    );
  };

  const Star = ({ filled, onClick }) => (
    <TouchableOpacity onPress={onClick}>
      <Text style={{ fontSize: 42, marginHorizontal: 2, color: filled ? "gold" : "#ababab" }}>★</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView>
      <Title>Buddy feedback</Title>
      {partners.map((partner) => (
        <Card key={partner.handle} style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 34 }}>👤 </Text>
            <View style={{ flexDirection: 'column', flex: 1 }}>
              <Text style={{fontWeight: 'semibold', fontSize: 18}}>{partner.name}</Text>
              <Text style={styles.handle}>{partner.handle}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                filled={i <= partner.rating}
                onClick={() => handleRating(partner.handle, i)}
              />
            ))}
          </View>
        </Card>
      ))}
      <TouchableOpacity style={{alignSelf: 'flex-end', marginTop: 8}} onPress={() => router.push("/(dashboard)/dash")}> 
        <Text style={{fontSize: 14, fontWeight: 'semibold', paddingRight: 10}}>Skip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  handle: {
    fontSize: 14,
    color: '#888',
  },
});

export default PartnerFeedback;
