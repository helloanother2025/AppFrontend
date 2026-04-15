import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { friendsAPI } from '../src/api/friends';
import { useUser } from './UserContext';

const FriendsContext = createContext();

export const FriendsProvider = ({ children }) => {
  const { currentUser } = useUser();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    const userId = currentUser?.id || currentUser?.user_id;
    if (userId) {
      setLoading(true);
      try {
        const friends = await friendsAPI.getFriends(userId);
        // Map backend user_id to id and username to handle for FriendsBox
        const mapped = (Array.isArray(friends) ? friends : []).map(f => ({
          ...f,
          id: f.user_id || f.id,
          handle: f.username ? `@${f.username}` : '',
        }));
        setFriends(mapped);
      } catch (e) {
        setFriends([]);
      } finally {
        setLoading(false);
      }
    }
  }, [currentUser?.id, currentUser?.user_id]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return (
    <FriendsContext.Provider value={{ friends, fetchFriends, loading }}>
      {children}
    </FriendsContext.Provider>
  );
};

export const useFriends = () => useContext(FriendsContext);
