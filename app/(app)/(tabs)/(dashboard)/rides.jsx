import { StyledScrollView as ScrollView } from '../../../../components/StyledScrollView';
import { StyledTitle as Title } from '../../../../components/StyledTitle';
import RideCard from '../../../../components/RideDisplayCard';
import { useRouter } from 'expo-router';
import rides from '../../../../data/rideData.json';


const UserRides = () => {
  const activeRides = [rides[0], rides[1]];
  const previousRides = [rides[2], rides[3], rides[4], rides[5], rides[6], rides[7]]
  const router = useRouter();

  return (
    <ScrollView>
      <Title>Ongoing rides</Title>
      
      {activeRides.map((ride, index=2) => (
        <RideCard key={index} ride={ride} ongoing={true} onPress={() => router.push(`/ride/${ride.id}`)} />
      ))}

      <Title style={{marginTop: 10}}>Previous rides</Title>
      
      {previousRides.map((ride, index=2) => (
        <RideCard key={index} ride={ride} previous={true} onPress={() => router.push(`/ride/${ride.id}`)} />
      ))}
    </ScrollView>
  )
}

export default UserRides
