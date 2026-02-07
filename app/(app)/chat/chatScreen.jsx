import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Keyboard, Modal, PanResponder, Animated, Alert, Platform, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { GiftedChat, Bubble, InputToolbar, Send, Composer } from 'react-native-gifted-chat';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Animatable from 'react-native-animatable';
import { Audio } from 'expo-audio';
import { Video } from 'expo-video';
import users from '../../../data/userData.json';
import * as Linking from 'expo-linking';
import { StyledText as Text } from '../../../components/StyledText';


const SwipeableBubble = ({ children, message, onReply, position }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (position === 'left' && gestureState.dx > 0) { 
          translateX.setValue(gestureState.dx);
        } else if (position === 'right' && gestureState.dx < 0) { 
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (position === 'left' && gestureState.dx > 80) { 
          onReply(message);
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        } else if (position === 'right' && gestureState.dx < -80) { 
          onReply(message);
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={{ transform: [{ translateX }] }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const { handle } = useLocalSearchParams();
  const user = users.find(u => u.handle === handle);
  const flatListRef = useRef(null);
  const chatRef = useRef(null);
  const animRefs = useRef({});

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);


  const [messages, setMessages] = useState([
    {
      _id: 3,
      text: 'Hi there!',
      createdAt: new Date('2025-10-15T10:00:00'),
      user: { _id: 2, name: user.name, avatar: user.profilePicture },
    },
  ]);

  // Keyboard listener
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Send message
  const onSend = useCallback(
    (newMsgs = []) => {
        if (replyingTo) {
          newMsgs[0].replyTo = replyingTo;
          setReplyingTo(null);
        }

      setMessages(previous => GiftedChat.append(previous, newMsgs));

      if (!newMsgs[0].image && !newMsgs[0].document) {
        // Simulated replies
        /*setTimeout(() => {
          const replyMessage = {
            _id: Date.now() + 1,
            text: "Hello! Ami saba.",
            createdAt: new Date(),
            user: { _id: 2, name: user.name, avatar: user.profilePicture },
          };
          setMessages(prev => GiftedChat.append(prev, [replyMessage]));
        }, 1500);

        setTimeout(() => {
          const replyMessage2 = {
            _id: Date.now() + 2,
            text: 'Hello! Ami mounotaa.',
            createdAt: new Date(),
            user: { _id: 2, name: user.name, avatar: user.profilePicture },
          };
          setMessages(prev => GiftedChat.append(prev, [replyMessage2]));
        }, 3000);*/
      }
    },
    [replyingTo, user.name, user.profilePicture]
  );


  const requestLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access media library is required!');
      return false;
    }
    return true;
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access camera is required!');
      return false;
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      onSend([{
        _id: Date.now().toString(),
        createdAt: new Date(),
        user: { _id: 1 },
        image: asset.type === 'image' ? asset.uri : undefined,
        video: asset.type === 'video' ? asset.uri : undefined,
      }]);
    }
  };

  const pickDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({copyToCacheDirectory: false});
    if (!result.canceled) {
      const asset = result.assets[0];
      const newMessage = {
        _id: Date.now().toString(),
        createdAt: new Date(),
        user: { _id: 1 },
        document: {
          name: asset.name,
          uri: asset.uri,
          size: asset.size,
        },
      };
      onSend([newMessage]); 
    }
  } catch (err) {
    console.log('Error picking document:', err);
  }
};

  // Image picker
  const pickImageFromLibrary = async () => {
    const hasPermission = await requestLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,  
      quality: 1,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const messagesToSend = result.assets.map(asset => ({
        _id: Date.now().toString() + Math.random(), 
        createdAt: new Date(),
        user: { _id: 1 },
        image: asset.type === 'image' ? asset.uri : undefined,
        video: asset.type === 'video' ? asset.uri : undefined,
      }));
      onSend(messagesToSend);
    }
  };

  const handleReplyPress = (message) => {
    const index = messages.findIndex(m => m._id === message._id);
    if (index !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });


      const animRef = animRefs.current[message._id];
        if (animRef && animRef.pulse) {
          animRef.pulse(800);
        }
    }
  };

  // Get initials
  const getInitials = (name) => {
    if (!name) return '';
    const names = name.split(' ');
    return names.map(n => n[0]).join('').toUpperCase();
  };

  // Avatar rendering (no avatar for sender)
  const renderAvatar = (props) => {
    const { user } = props.currentMessage;
    if (user._id === 1) return null; 
    if (user.avatar) return <Image source={{ uri: user.avatar }} style={styles.avatar} />;
    return (
      <View style={[styles.avatar, styles.initialsAvatar]}>
        <Text style={styles.initialsText}>{getInitials(user.name)}</Text>
      </View>
    );
  };

  // Bubble styling
  const renderBubble = (props) => {
  const { currentMessage, position } = props;

    return (
      <SwipeableBubble
        message={props.currentMessage}
        onReply={setReplyingTo}
        position={props.position}
      >
        {/* Reply preview */}
        {currentMessage.replyTo && (
          <TouchableOpacity onPress={() => handleReplyPress(currentMessage.replyTo)}>
            <View style={styles.replyBubble}>
              <Text style={styles.replyName}>Replied to:</Text>
              <Text style={styles.replySnippet}>
                {props.currentMessage.replyTo.text || 'Media message'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <Animatable.View
          ref={(ref) => {
            if (ref) animRefs.current[props.currentMessage._id] = ref;
          }}
        >
          <Bubble
            {...props}
            wrapperStyle={{
              left: styles.receivedBubble,
              right: styles.sentBubble,
            }}
            textStyle={{
              left: styles.receivedText,
              right: styles.sentText,
            }}
            timeTextStyle={{
              right: {
                fontFamily: 'Montserrat-Regular',
                color: '#fff',
                fontSize: 11,
                flexDirection: 'row',
                textAlign: 'right',
                marginTop: 2,
                marginRight: 4,
              },
              left: {
                fontFamily: 'Montserrat-Regular',
                color: '#777',
                fontSize: 11,
                textAlign: 'right',
                flexDirection: "row",
                marginTop: 2,
                marginRight: 4,
              },
            }}
          />
        </Animatable.View>
      </SwipeableBubble>
    );
  };

  // Day label
  const renderDay = (props) => {
    const messageDate = new Date(props.currentMessage.createdAt);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    let label = messageDate.toLocaleDateString();
    if (messageDate.toDateString() === today.toDateString()) label = 'Today';
    else if (messageDate.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    return (
      <View style={styles.dateSeparator}>
        <Text style={styles.dateText}>{label}</Text>
      </View>
    );
  };

  // Actions
  const renderActions = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 }}>
      <TouchableOpacity style={{ marginRight: 5 }} onPress={pickDocument}>
        <Ionicons name="attach" size={28} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity style={{ marginRight: 5 }} onPress={pickImageFromCamera}>
        <Ionicons name="camera" size={28} color="#000" />
      </TouchableOpacity>
      <TouchableOpacity style={{ marginHorizontal: 5 }} onPress={pickImageFromLibrary}>
        <Ionicons name="image" size={28} color="#000" />
      </TouchableOpacity>
    </View>
  );

  const getMimeType = (fileName) => {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) 
      return 'application/msword';
    if (fileName.endsWith('.txt')) return 'text/plain';
    if (fileName.match(/\.(jpg|jpeg|png|gif)$/)) return 'image/*';
    if (fileName.match(/\.(mp4|mov|avi|mkv)$/)) return 'video/*';
    if (fileName.match(/\.(mp3|wav|ogg)$/)) return 'audio/*';
    return '*/*';
  };

  const openDocument = async (document) => {
    try {
      const mimeType = getMimeType(document.name);

      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: document.uri,
          type: mimeType,
          flags: 1, 
        });
      } else {
        if (mimeType.startsWith('image') || mimeType.startsWith('video') || mimeType.startsWith('audio')) {
          
          const supported = await Linking.canOpenURL(document.uri);
          if (supported) await Linking.openURL(document.uri);
          else Alert.alert('Cannot open file', 'No app can open this media file.');
        } else {
          // Documents 
          const supported = await Linking.canOpenURL(document.uri);
          if (supported) await Linking.openURL(document.uri);
          else Alert.alert('Cannot open document', 'No app can open this file.');
        }
      }
    } catch (err) {
      console.log('Error opening document:', err);
      Alert.alert('Error', 'Cannot open this file.');
    }
  };

  const renderCustomView = (props) => {
    const { currentMessage } = props;

    if (currentMessage.document) {
      return (
        <TouchableOpacity
          style={styles.fileContainer}
          onPress={() => openDocument(currentMessage.document)}
        >
          <Ionicons name="document-text-outline" size={30} color="#000" />
          <Text style={styles.fileName}  ellipsizeMode="clip">
            {currentMessage.document.name}
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  // Input toolbar
  const renderComposer = (props) => {
    return (
      <Composer
        {...props}
        textInputStyle={{
          flex: 1,
          fontFamily: 'Montserrat-Regular',
          backgroundColor: '#fff',
          borderWidth: 1,       
          borderColor: '#888',  
          borderRadius: 20,     
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 16,
          color: '#000',
          marginRight: 10,
        }}
        placeholder="Type a message..."
        placeholderTextColor="#888"
      />
    );
  };

  const renderInputToolbar = (props) => (
    <View>
      {replyingTo && (
        <View style={styles.replyContainer}>
          <Text style={styles.replyLabel}>Replying to:</Text>
          <Text numberOfLines={1} style={styles.replyText}>
            {replyingTo.text || 'Media message'}
          </Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      )}
      <InputToolbar
        {...props}
        containerStyle={{
          backgroundColor: '#fff',
          paddingVertical: 16,
          paddingHorizontal: 2,
          borderTopWidth: 1,
          borderTopColor: '#ddd',
          marginBottom: keyboardVisible ? 0 : 30,
        }}
        primaryStyle={{ alignItems: 'center' }}
        renderComposer={renderComposer} 
      />
    </View>
  );

  // Send button
  const renderSend = (props) => (
    <Send {...props} containerStyle={{ justifyContent: 'center', marginRight: 5 }}>
      <Ionicons name="send" size={28} color="#e63e4c" />
    </Send>
  );

  const openLightbox = (uri) => {
    setLightboxImage(uri);
    setLightboxVisible(true);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxVisible(false);
  };

  // Message image
  const renderMessageImage = (props) => {
    return (
      <TouchableOpacity onPress={() => openLightbox(props.currentMessage.image)}>
        <Image
          source={{ uri: props.currentMessage.image }}
          style={{ width: 200, height: 150, borderRadius: 13, margin: 3 }}
        />
      </TouchableOpacity>
    );
  };

  const renderMessageVideo = (props) => {
    const { currentMessage } = props;
    if (currentMessage.video) {
      return (
        <Video
          source={{ uri: currentMessage.video }}
          style={{ width: 250, height: 150, borderRadius: 13 }}
          useNativeControls
          resizeMode="contain"
        />
      );
    }
    return null;
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        {/* Avatar or initials */}
        {user.profilePicture ? (
          <Image
            source={{ uri: user.profilePicture }}
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#E5E5E5',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}
          >
            <Text style={{ color: '#000', fontWeight: 'bold' }}>{getInitials(user.name)}</Text>
          </View>
        )}

        <View style={{ width: '80%' }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.handle}>{user.handle}</Text>
        </View>

        <View style={styles.rightIcons}>
          <FontAwesome name="phone" size={22} color="#000" style={styles.icon} />
          <Ionicons name="ellipsis-vertical" size={22} color="#000" style={styles.icon} />
        </View>
      </View>

      {/* Gifted Chat */}
      <GiftedChat
        ref = {chatRef}
        messages={messages}
        onSend={msgs => onSend(msgs)}
        user={{ _id: 1 }}
        inverted={true}
        renderBubble={renderBubble}
        renderDay={renderDay}
        renderAvatar={renderAvatar}
        showUserAvatar={false} 
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        renderActions={renderActions}
        renderMessageImage={renderMessageImage}
        renderMessageVideo={renderMessageVideo}
        renderCustomView={renderCustomView}
        listViewProps={{
          ref: flatListRef,
        }}
      />

      {lightboxVisible && (
        <Modal visible={lightboxVisible} transparent={true} onRequestClose={closeLightbox}>
          <View style={styles.lightboxContainer}>
            <TouchableOpacity style={styles.lightboxCloseButton} onPress={closeLightbox}>
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
            <Image source={{ uri: lightboxImage }} style={styles.lightboxImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 15,
    paddingTop: 40,
  },
  handle: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  backButton: {
    marginRight: 10,
  },
  icon: {
    marginLeft: 15,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  sentBubble: {
    backgroundColor: '#1f1f1f',
    borderRadius: 22,
    padding: 8,
    marginBottom: 2,
    maxWidth: '80%',
  },
  receivedBubble: {
    backgroundColor: '#E5E5E5',
    borderRadius: 22,
    padding: 8,
    marginBottom: 2,
    maxWidth: '80%',
  },
  sentText: {
    fontFamily: 'Montserrat-Regular',
    color: 'white',
    fontSize: 16,
  },
  receivedText: {
    fontFamily: 'Montserrat-Regular',
    color: '#000',
    fontSize: 16,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 12,
    color: '#888',
    backgroundColor: '#eee',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  initialsAvatar: {
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 10,
    color: 'white',
    marginTop: 2,
    marginHorizontal: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 3,
  },
  actionButton: {
    marginHorizontal: 2,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  replyBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 22,
    padding: 10,
    marginBottom: 5,
  },
  replyName: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  replySnippet: {
    color: '#555',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginTop: 10,
  },
  replyLabel: {
    fontWeight: 'bold',
    marginRight: 10,
  },
  replyText: {
    flex: 1,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    borderWidth: 1,         
    borderColor: '#888',
    padding: 10,
    margin: 5,
  },
  fileName: {
    marginLeft: 8,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
}); 