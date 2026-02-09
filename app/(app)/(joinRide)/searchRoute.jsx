import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import DualMapSearchWrapper from '../../../components/DualMapSearchWrapper';
import { StyledNavigatorButton as NavButton } from '../../../components/StyledNavigatorButton';
import { useRouter } from 'expo-router';
import { useSearch } from '../../../context/SearchContext';

export default function SearchRoute() {
  const router = useRouter();
  const { searchData, setSearchData } = useSearch();

  const [start, setStart] = useState(searchData.start || null);
  const [dest, setDest] = useState(searchData.destination || null);

  const save = () => {
    setSearchData({ start, destination: dest });
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <DualMapSearchWrapper
        allowBoth
        startValue={start}
        destinationValue={dest}
        onStartSelected={setStart}
        onDestinationSelected={setDest}
      />

      <View style={styles.row}>
        <NavButton title="Back" onPress={() => router.back()} />
        {(start || dest) && <NavButton back={false} title="Confirm" onPress={save} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    top: 570,
    left: 20,
    right: 20,
    zIndex: 1,
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto', 
    marginTop: 15,
  }
});