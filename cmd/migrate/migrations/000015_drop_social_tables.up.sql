-- This project is being repurposed away from a social network.
-- Drop social features tables (posts/comments/followers) and their indexes.

-- Drop indexes if they exist (some are created without IF NOT EXISTS)
DROP INDEX IF EXISTS idx_posts_title;
DROP INDEX IF EXISTS idx_posts_tags;
DROP INDEX IF EXISTS idx_posts_user_id;
DROP INDEX IF EXISTS idx_comments_content;
DROP INDEX IF EXISTS idx_comments_post_id;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS followers;
DROP TABLE IF EXISTS posts;
