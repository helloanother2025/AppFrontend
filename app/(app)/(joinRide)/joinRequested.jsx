import { View } from 'react-native';
import { StyledText as Text } from '../../../components/StyledText';
import { StyledTitle as Title } from '../../../components/StyledTitle';
import { StyledButton } from '../../../components/StyledButton';
import { StyledScrollView as ScrollView } from '../../../components/StyledScrollView'; 
import { useRouter } from 'expo-router';

const JoinRequested = () => {
    const router = useRouter();

    return (
        <ScrollView>
            <Title>Request Sent!</Title>
            <Text>Your request to join the ride has been sent!.</Text>
            <StyledButton title="Done" onPress={() => router.back()}></StyledButton>
        </ScrollView>
    );
};

export default JoinRequested;