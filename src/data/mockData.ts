export interface User {
  id: string;
  name: string;


  username: string;
  gender: 'Male' | 'Female';
  university?: string;
  department?: string;
  rating: number;
  ridesCreated: number;
  ridesJoined: number;
  bio?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  address?: string;
  avatar?: string;
  studentId?: string;
}

export type TransportMode = 'Car' | 'CNG' | 'Bus' | 'Bike' | 'Microbus' | 'Rickshaw' | 'Other';
export type RideStatus = 'unactive' | 'started' | 'completed' | 'cancelled' | 'expired';
export type GenderPreference = 'Any' | 'Male' | 'Female';
export type JoinStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'removed';

export interface RideLocation {
  name: string;
  shortName: string;
  lat: number;
  lng: number;
}

export interface Ride {
  id: string;
  creator: User;
  from: RideLocation;
  to: RideLocation;
  departureTime: string;
  transport: TransportMode;
  transportDetail?: string;
  seats: number;
  currentPassengers: number;
  fare: number | null;
  currency: string;
  genderPreference: GenderPreference;
  status: RideStatus;
  notes?: string;
  provider?: string;
  isOpenForJoining?: boolean; // default true; creator can close
}

export interface JoinRequest {
  id: string;
  rideId: string;

  ride: Ride;
  requester: User;
  status: JoinStatus;
  requestedAt: string;
  paymentStatus: 'pending' | 'paid';
  removalReason?: string;
  joinerFrom?: RideLocation;
  joinerTo?: RideLocation;
}

export interface NotificationItem {
  id: string;
  type: 'join_request' | 'friend_request' | 'ride_update' | 'message' | 'ride_cancelled' | 'passenger_removed' | 'payment_request' | 'ride_edited';
  title: string;
  body: string;
  time: string;
  read: boolean;
  fromUser?: User;
  rideId?: string;
}

export interface Review {
  id: string;
  rideId: string;
  reviewer: User;
  reviewee: User;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  time: string;
  read: boolean;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  text: string;
  time: string;
  read: boolean;
  reported?: boolean;
  flaggedAsSpam?: boolean;
}

export interface GroupChat {
  id: string;
  rideId: string;
  rideName: string;
  participants: User[];
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: GroupMessage[];
}

export interface Chat {
  id: string;
  participant: User;
  lastMessage: string;
  lastTime: string;
  unreadCount: number;
  messages: Message[];
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const currentUser: User = {
  id: 'u1',
  name: 'Rahatut Tahrim',
  username: 'tahrim2964',
  gender: 'Male',
  university: 'Islamic University of Technology',
  department: 'Computer Science & Engineering',
  rating: 4.7,
  ridesCreated: 12,
  ridesJoined: 28,
  bio: 'CSE student at IUT. Regular commuter. Love sharing rides!',
  phone: '+880 1712 345678',
  email: 'tahrim@iut-dhaka.edu',
  facebook: 'fb.com/tahrim2964',
  address: 'Sector 12, Uttara, Dhaka',
  studentId: '200021019',
};

export const user2: User = {
  id: 'u2',
  name: 'A B Siddique',
  username: 'absiddique',
  gender: 'Male',
  university: 'IUT',
  department: 'Mechanical Engineering',
  rating: 4.2,
  ridesCreated: 5,
  ridesJoined: 10,
  bio: 'Mech Engineering student. Daily commuter from Gazipur.',
  phone: '+880 1812 111222',
};

export const user3: User = {
  id: 'u3',
  name: 'Nadia Islam',
  username: 'nadia_islam',
  gender: 'Female',
  university: 'BUET',
  department: 'EEE',
  rating: 4.9,
  ridesCreated: 8,
  ridesJoined: 22,
  bio: 'BUET EEE student. Female-only rides preferred.',
  phone: '+880 1711 333444',
};

export const user4: User = {
  id: 'u4',
  name: 'Karim Uddin',
  username: 'karim_u',
  gender: 'Male',
  university: 'DU',
  department: 'MBA',
  rating: 3.8,
  ridesCreated: 3,
  ridesJoined: 15,
  bio: 'MBA student at DU. Looking for reliable ride buddies.',
  phone: '+880 1914 555666',
};

export const user5: User = {
  id: 'u5',
  name: 'Fatema Khatun',
  username: 'fatema_k',
  gender: 'Female',
  university: 'NSU',
  department: 'BBA',
  rating: 4.5,
  ridesCreated: 7,
  ridesJoined: 19,
  bio: 'BBA student at NSU. Punctual and friendly!',
  phone: '+880 1612 777888',
};

export const user6: User = {
  id: 'u6',
  name: 'Rafiq Hassan',
  username: 'rafiq_h',
  gender: 'Male',
  university: 'IUT',
  department: 'Civil Engineering',
  rating: 4.3,
  ridesCreated: 6,
  ridesJoined: 12,
  bio: 'Civil Engg student at IUT. Love meeting new people!',
  phone: '+880 1513 999000',
};

export const allUsers: User[] = [currentUser, user2, user3, user4, user5, user6];

export function getUserById(id: string): User | undefined {
  return allUsers.find((u) => u.id === id);
}

// ─── Locations ────────────────────────────────────────────────────────────────

export const iutCafeteria: RideLocation = {
  name: 'IUT Cafeteria, Board Bazar, Gazipur, Bangladesh',
  shortName: 'IUT, Gazipur',
  lat: 23.953,
  lng: 90.414,
};

export const uttara: RideLocation = {
  name: 'Uttara, Dhaka Metropolitan, Dhaka District',
  shortName: 'Uttara, Dhaka',
  lat: 23.875,
  lng: 90.389,
};

export const dhanmondi: RideLocation = {
  name: 'Dhanmondi, Dhaka Metropolitan, Dhaka District',
  shortName: 'Dhanmondi, Dhaka',
  lat: 23.746,
  lng: 90.374,
};

export const sector12: RideLocation = {
  name: 'Sector 12, Uttara, Dhaka Metropolitan',
  shortName: 'Sector 12, Uttara',
  lat: 23.868,
  lng: 90.394,
};

export const motijheel: RideLocation = {
  name: 'Motijheel, Dhaka Metropolitan, Dhaka District',
  shortName: 'Motijheel, Dhaka',
  lat: 23.729,
  lng: 90.419,
};

export const mirpur: RideLocation = {
  name: 'Mirpur, Dhaka Metropolitan, Dhaka District',
  shortName: 'Mirpur, Dhaka',
  lat: 23.806,
  lng: 90.366,
};

export const farmgate: RideLocation = {
  name: 'Farmgate, Tejgaon, Dhaka Metropolitan',
  shortName: 'Farmgate, Dhaka',
  lat: 23.760,
  lng: 90.391,
};

export const boardBazar: RideLocation = {
  name: 'Board Bazar, Gazipur Sadar, Gazipur District',
  shortName: 'Board Bazar, Gazipur',
  lat: 23.945,
  lng: 90.417,
};

// ─── Rides ────────────────────────────────────────────────────────────────────

// Current user's ONGOING created rides
export const myActiveRide: Ride = {
  id: 'r5',
  creator: currentUser,
  from: uttara,
  to: dhanmondi,
  departureTime: '2026-04-15T15:30:00',
  transport: 'Car',
  transportDetail: 'Toyota Allion – Dhaka Metro Ga-11-1234',
  seats: 3,
  currentPassengers: 1,
  fare: 600,
  currency: 'BDT',
  genderPreference: 'Male',
  status: 'started',
  notes: 'Pick up at main gate. Be on time please.',
  isOpenForJoining: false,
};

// Current user's UPCOMING created ride
export const myScheduledRide: Ride = {
  id: 'r7',
  creator: currentUser,
  from: iutCafeteria,
  to: uttara,
  departureTime: '2026-04-16T08:30:00',
  transport: 'Microbus',
  transportDetail: 'Shared Microbus – Gazipur to Uttara route',
  seats: 6,
  currentPassengers: 2,
  fare: 200,
  currency: 'BDT',
  genderPreference: 'Any',
  status: 'unactive',
  isOpenForJoining: true,
};

// Past created rides
export const myCompletedRide: Ride = {
  id: 'r8',
  creator: currentUser,
  from: uttara,
  to: farmgate,
  departureTime: '2026-04-13T09:00:00',
  transport: 'Car',
  seats: 2,
  currentPassengers: 2,
  fare: 400,
  currency: 'BDT',
  genderPreference: 'Any',
  status: 'completed',
};

export const myCancelledRide: Ride = {
  id: 'r9',
  creator: currentUser,
  from: mirpur,
  to: motijheel,
  departureTime: '2026-04-12T18:00:00',
  transport: 'CNG',
  seats: 2,
  currentPassengers: 0,
  fare: 300,
  currency: 'BDT',
  genderPreference: 'Any',
  status: 'cancelled',
};

// Past ride created by another user that I joined
export const pastRideByUser2: Ride = {
  id: 'r10',
  creator: user2,
  from: iutCafeteria,
  to: sector12,
  departureTime: '2026-04-10T17:00:00',
  transport: 'Car',
  seats: 2,
  currentPassengers: 2,
  fare: 1500,
  currency: 'BDT',
  genderPreference: 'Any',
  status: 'completed',
};

// Available rides for search (by others, not currentUser)
export const availableRides: Ride[] = [
  {
    id: 'r1',
    creator: user2,
    from: iutCafeteria,
    to: sector12,
    departureTime: '2026-04-15T22:31:00',
    transport: 'Car',
    seats: 3,
    currentPassengers: 1,
    fare: 1500,
    currency: 'BDT',
    genderPreference: 'Any',
    status: 'unactive',
    isOpenForJoining: true,
  },
  {
    id: 'r2',
    creator: user3,
    from: uttara,
    to: dhanmondi,
    departureTime: '2026-04-16T09:00:00',
    transport: 'CNG',
    seats: 2,
    currentPassengers: 0,
    fare: 600,
    currency: 'BDT',
    genderPreference: 'Female',
    status: 'unactive',
    isOpenForJoining: true,
  },
  {
    id: 'r3',
    creator: user4,
    from: mirpur,
    to: motijheel,
    departureTime: '2026-04-16T08:30:00',
    transport: 'Bus',
    seats: 3,
    currentPassengers: 1,
    fare: 300,
    currency: 'BDT',
    genderPreference: 'Any',
    status: 'unactive',
    isOpenForJoining: true,
  },
  {
    id: 'r4',
    creator: user5,
    from: iutCafeteria,
    to: dhanmondi,
    departureTime: '2026-04-16T14:00:00',
    transport: 'Car',
    seats: 3,
    currentPassengers: 0,
    fare: 1200,
    currency: 'BDT',
    genderPreference: 'Female',
    status: 'unactive',
    isOpenForJoining: true,
  },
  {
    id: 'r11',
    creator: user6,
    from: boardBazar,
    to: farmgate,
    departureTime: '2026-04-15T20:00:00',
    transport: 'Microbus',
    transportDetail: 'Shared microbus – 8 seats',
    seats: 5,
    currentPassengers: 2,
    fare: 150,
    currency: 'BDT',
    genderPreference: 'Any',
    status: 'unactive',
    isOpenForJoining: true,
  },
  {
    id: 'r12',
    creator: user4,
    from: uttara,
    to: farmgate,
    departureTime: '2026-04-16T07:30:00',
    transport: 'Bike',
    seats: 1,
    currentPassengers: 0,
    fare: 200,
    currency: 'BDT',
    genderPreference: 'Male',
    status: 'unactive',
    isOpenForJoining: true,
  },
  {
    id: 'r13',
    creator: user6,
    from: iutCafeteria,
    to: uttara,
    departureTime: '2026-04-16T08:00:00',
    transport: 'Car',
    seats: 2,
    currentPassengers: 2,
    fare: 500,
    currency: 'BDT',
    genderPreference: 'Any',
    status: 'unactive',
    isOpenForJoining: false, // FULL RIDE – closed
  },
];

// Compatibility export for native screens that still use the older `rides` list.
export const rides: Ride[] = [
  ...availableRides,
  myActiveRide,
  myScheduledRide,
  myCompletedRide,
  myCancelledRide,
  pastRideByUser2,
];

// ─── Join Requests ─────────────────────────────────────────────────────────────

// Incoming: others requesting to join MY rides
export const incomingJoinRequests: JoinRequest[] = [
  {
    id: 'jr_in_1',
    rideId: 'r5',
    ride: myActiveRide,
    requester: user4,
    status: 'pending',
    requestedAt: '2026-04-15T14:00:00',
    paymentStatus: 'pending',
    joinerFrom: iutCafeteria,
    joinerTo: dhanmondi,
  },
  {
    id: 'jr_in_2',
    rideId: 'r7',
    ride: myScheduledRide,
    requester: user3,
    status: 'accepted',
    requestedAt: '2026-04-15T10:00:00',
    paymentStatus: 'pending',
    joinerFrom: boardBazar,
    joinerTo: uttara,
  },
  {
    id: 'jr_in_3',
    rideId: 'r7',
    ride: myScheduledRide,
    requester: user6,
    status: 'accepted',
    requestedAt: '2026-04-15T11:00:00',
    paymentStatus: 'paid',
    joinerFrom: iutCafeteria,
    joinerTo: uttara,
  },
  {
    id: 'jr_in_4',
    rideId: 'r8',
    ride: myCompletedRide,
    requester: user5,
    status: 'accepted',
    requestedAt: '2026-04-12T20:00:00',
    paymentStatus: 'pending',
    joinerFrom: uttara,
    joinerTo: farmgate,
  },
  {
    id: 'jr_in_5',
    rideId: 'r8',
    ride: myCompletedRide,
    requester: user2,
    status: 'accepted',
    requestedAt: '2026-04-12T21:00:00',
    paymentStatus: 'paid',
    joinerFrom: sector12,
    joinerTo: farmgate,
  },
];

// Outgoing: MY requests to join others' rides
export const myJoinRequests: JoinRequest[] = [
  {
    id: 'mjr1',
    rideId: 'r1',
    ride: availableRides[0],
    requester: currentUser,
    status: 'accepted',
    requestedAt: '2026-04-15T10:00:00',
    paymentStatus: 'pending',
    joinerFrom: sector12,
    joinerTo: sector12,
  },
  {
    id: 'mjr2',
    rideId: 'r4',
    ride: availableRides[3],
    requester: currentUser,
    status: 'pending',
    requestedAt: '2026-04-15T12:00:00',
    paymentStatus: 'pending',
    joinerFrom: iutCafeteria,
    joinerTo: dhanmondi,
  },
  {
    id: 'mjr3',
    rideId: 'r10',
    ride: pastRideByUser2,
    requester: currentUser,
    status: 'accepted',
    requestedAt: '2026-04-10T09:00:00',
    paymentStatus: 'pending', // Payment pending for completed ride
    joinerFrom: iutCafeteria,
    joinerTo: sector12,
  },
];

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews: Review[] = [
  {
    id: 'rev1',
    rideId: 'r10',
    reviewer: user2,
    reviewee: currentUser,
    rating: 5,
    comment: 'Great ride buddy! Very punctual and friendly.',
    createdAt: '2026-04-10T19:00:00',
  },
];

// ─── Notifications ─────────────────────────────────────────────────────────────

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    type: 'join_request',
    title: 'New join request',
    body: 'Karim Uddin wants to join your ride from Uttara to Dhanmondi.',
    time: '2 min ago',
    read: false,
    fromUser: user4,
    rideId: 'r5',
  },
  {
    id: 'n2',
    type: 'friend_request',
    title: 'Friend request',
    body: 'Nadia Islam sent you a friend request.',
    time: '1 hour ago',
    read: false,
    fromUser: user3,
  },
  {
    id: 'n3',
    type: 'ride_update',
    title: 'Ride accepted!',
    body: "Your request to join A B Siddique's ride has been accepted.",
    time: '3 hours ago',
    read: true,
    fromUser: user2,
    rideId: 'r1',
  },
  {
    id: 'n4',
    type: 'message',
    title: 'New message',
    body: 'A B Siddique: "Please be at the pickup point 5 minutes early."',
    time: 'Yesterday',
    read: true,
    fromUser: user2,
  },
  {
    id: 'n5',
    type: 'payment_request',
    title: 'Payment pending',
    body: 'Please complete payment of BDT 750 for your ride with A B Siddique.',
    time: '2 days ago',
    read: false,
    fromUser: user2,
    rideId: 'r10',
  },
];

// ─── Chats ────────────────────────────────────────────────────────────────────

export const chats: Chat[] = [
  {
    id: 'c1',
    participant: user2,
    lastMessage: 'Please be at the pickup point 5 minutes early.',
    lastTime: '10:45 PM',
    unreadCount: 2,
    messages: [
      { id: 'm1', senderId: 'u2', text: "Hi! I've confirmed your ride request.", time: '10:30 PM', read: true },
      { id: 'm2', senderId: 'u1', text: 'Great! Thanks for accepting.', time: '10:32 PM', read: true },
      { id: 'm3', senderId: 'u2', text: 'The pickup point is at the main gate.', time: '10:40 PM', read: true },
      { id: 'm4', senderId: 'u2', text: 'Please be at the pickup point 5 minutes early.', time: '10:45 PM', read: false },
      { id: 'm5', senderId: 'u2', text: 'See you tomorrow!', time: '10:46 PM', read: false },
    ],
  },
  {
    id: 'c2',
    participant: user3,
    lastMessage: "Are you still available for tomorrow's ride?",
    lastTime: '8:20 PM',
    unreadCount: 0,
    messages: [
      { id: 'm6', senderId: 'u1', text: "Hey Nadia, I saw your ride listing.", time: '7:00 PM', read: true },
      { id: 'm7', senderId: 'u3', text: 'Yes! I have a spot available.', time: '7:05 PM', read: true },
      { id: 'm8', senderId: 'u3', text: "Are you still available for tomorrow's ride?", time: '8:20 PM', read: true },
    ],
  },
  {
    id: 'c3',
    participant: user5,
    lastMessage: 'Thanks for sharing the ride!',
    lastTime: 'Yesterday',
    unreadCount: 0,
    messages: [
      { id: 'm9', senderId: 'u5', text: 'Thanks for sharing the ride!', time: 'Yesterday', read: true },
      { id: 'm10', senderId: 'u1', text: "You're welcome! Safe travels.", time: 'Yesterday', read: true },
    ],
  },
];

export const friends: User[] = [user3, user5, user4];

// ─── Group Chats (one per ride for accepted participants) ──────────────────────

export const groupChats: GroupChat[] = [
  {
    id: 'gc_r5',
    rideId: 'r5',
    rideName: 'Uttara → Dhanmondi',
    participants: [currentUser, user4],
    lastMessage: 'Be at the main gate by 3:20 PM',
    lastTime: '2:45 PM',
    unreadCount: 1,
    messages: [
      { id: 'gm1', senderId: 'u1', text: 'Hey everyone! Ride starts at 3:30 PM from main gate.', time: '2:00 PM', read: true },
      { id: 'gm2', senderId: 'u4', text: 'Got it, I\'ll be there!', time: '2:05 PM', read: true },
      { id: 'gm3', senderId: 'u1', text: 'Be at the main gate by 3:20 PM', time: '2:45 PM', read: false },
    ],
  },
  {
    id: 'gc_r7',
    rideId: 'r7',
    rideName: 'IUT, Gazipur → Uttara',
    participants: [currentUser, user3, user6],
    lastMessage: 'Nadia: Can we stop at Turag briefly?',
    lastTime: '9:15 AM',
    unreadCount: 2,
    messages: [
      { id: 'gm4', senderId: 'u1', text: 'Good morning! Microbus leaves at 8:30 AM sharp.', time: '7:00 AM', read: true },
      { id: 'gm5', senderId: 'u3', text: 'Thanks for the heads up!', time: '7:30 AM', read: true },
      { id: 'gm6', senderId: 'u6', text: 'I\'ll be at the IUT gate.', time: '8:00 AM', read: true },
      { id: 'gm7', senderId: 'u3', text: 'Can we stop at Turag briefly?', time: '9:15 AM', read: false },
      { id: 'gm8', senderId: 'u6', text: 'I second that, need to pick something up.', time: '9:16 AM', read: false },
    ],
  },
  {
    id: 'gc_r1',
    rideId: 'r1',
    rideName: 'IUT → Sector 12, Uttara',
    participants: [user2, currentUser],
    lastMessage: 'AB: Please be at the pickup point 5 minutes early.',
    lastTime: '10:45 PM',
    unreadCount: 2,
    messages: [
      { id: 'gm9', senderId: 'u2', text: "Hi! I've confirmed your ride request.", time: '10:30 PM', read: true },
      { id: 'gm10', senderId: 'u1', text: 'Great! Thanks for accepting.', time: '10:32 PM', read: true },
      { id: 'gm11', senderId: 'u2', text: 'The pickup point is at the main gate.', time: '10:40 PM', read: true },
      { id: 'gm12', senderId: 'u2', text: 'Please be at the pickup point 5 minutes early.', time: '10:45 PM', read: false },
      { id: 'gm13', senderId: 'u2', text: 'See you tomorrow!', time: '10:46 PM', read: false },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatRideTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRideDate(isoString: string): string {
  const date = new Date(isoString);
  return (
    date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
    }) +
    ', ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

export const transportEmoji: Record<TransportMode, string> = {
  Car: '🚗',
  CNG: '🛺',
  Bus: '🚌',
  Bike: '🏍',
  Microbus: '🚐',
  Rickshaw: '🚲',
  Other: '🚕',
};

// ─── Fare Calculation Helpers ─────────────────────────────────────────────────

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}