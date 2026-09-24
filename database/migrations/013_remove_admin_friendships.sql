-- Admin accounts are not part of the user-to-user friendship graph.
DELETE FROM friendships f
USING users sender, users receiver
WHERE f.user_id = sender.user_id
  AND f.friend_id = receiver.user_id
  AND (sender.role = 'admin' OR receiver.role = 'admin');
