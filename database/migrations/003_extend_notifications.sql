ALTER TABLE notifications
    ADD COLUMN notification_type VARCHAR(30) NOT NULL DEFAULT 'watchlist_share',
    ADD COLUMN friendship_id INT NULL,
    ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE notifications
    ADD CONSTRAINT fk_notification_friendship
        FOREIGN KEY (friendship_id) REFERENCES friendships(friendship_id) ON DELETE CASCADE;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notification_type
        CHECK (
            (notification_type = 'watchlist_share' AND share_id IS NOT NULL AND friendship_id IS NULL)
            OR (notification_type IN ('friend_request', 'friend_accepted') AND friendship_id IS NOT NULL AND share_id IS NULL)
        );
