import React, { useState } from 'react';
import { StyledButton as Button } from './StyledButton';
import { friendsAPI } from '../src/api/friends';

const SendFriendRequestButton = ({ userId }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await friendsAPI.sendFriendRequest(userId);
      setSent(true);
    } catch (error) {
      // Optionally show error
      setSent(false);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return <Button title="Request Sent" disabled />;
  }

  return (
    <Button title={sending ? "Sending..." : "Add Friend"} onPress={handleSend} disabled={sending} />
  );
};

export default SendFriendRequestButton;
