import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { friendsAPI } from '../src/api/friends';
import { useUser } from './UserContext';

const FriendsContext = createContext();

export const FriendsProvider = ({ children }) => {
  const { currentUser } = useUser();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (currentUser?.id) {
      setLoading(true);
      try {
        const res = await friendsAPI.getFriends(currentUser.id);
        // Map backend user_id to id and username to handle for FriendsBox
        const mapped = (res.data || []).map(f => ({
          ...f,
          id: f.user_id,
          handle: f.username ? `@${f.username}` : '',
        }));
        setFriends(mapped);
      } catch (e) {
        setFriends([]);
      } finally {
        setLoading(false);
      }
    }
  }, [currentUser?.id]);

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
