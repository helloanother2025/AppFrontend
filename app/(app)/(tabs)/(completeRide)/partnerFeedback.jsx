import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { StyledNavigatorButton as NavButton } from '../../../../components/StyledNavigatorButton'
import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView'; 
import { useRouter } from 'expo-router';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import { StyledText as Text } from '../../../../components/StyledText';
import { StyledCard as Card } from '../../../../components/StyledCard';
import rides from '../../../../data/rideData.json'


const partnerFeedback = () => {
  const router = useRouter();

  const currentRide = rides[1];
  const [partners, setPartners] = useState(
    currentRide.partners.map(p => ({ ...p, rating: p.rating || '' }))
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
    
      <View style={styles.buttonRow}>
        <NavButton
            onPress={() => router.back()}
            style={{ width: '25%' }}
          />
          <NavButton
            onPress={() => router.push('/(dashboard)/dash')}
            title="Finish"
            back={false}
            style={{ width: '25%' }}
          />
      </View>
    </ScrollView>
  );
};

export default partnerFeedback;

const styles = StyleSheet.create({
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto', 
        marginTop: 10,
        width: '100%',
    },
    handle: {
        color: '#888',
        fontSize: 14,
        flex: 1,
      },
      tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
      },
      tagChip: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
      },
      tagChipActive: {
        backgroundColor: '#1f1f1f',
        borderColor: '#1f1f1f',
      },
      tagText: {
        color: '#333',
        fontSize: 12,
      },
      tagTextActive: {
        color: '#fff',
        fontWeight: '600',
      },
      notesInput: {
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
        fontFamily: 'Montserrat-Regular',
      }
});
