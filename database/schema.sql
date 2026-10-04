-- Dollique MySQL Database Schema

CREATE DATABASE IF NOT EXISTS dollique_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dollique_db;

-- Drop old tables if they exist to guarantee clean recreation
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS violations;
DROP TABLE IF EXISTS appeals;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS post_images;
DROP TABLE IF EXISTS post_categories;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS tokens;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    login VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    is_email_confirmed BOOLEAN DEFAULT FALSE,
    profile_picture VARCHAR(255) DEFAULT '/uploads/avatars/default.png',
    avatar_config JSON DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    rating INT DEFAULT 0,
    role ENUM('admin', 'user') DEFAULT 'user',
    banned_until TIMESTAMP NULL DEFAULT NULL,
    ban_reason TEXT DEFAULT NULL,
    strikes_reset_at TIMESTAMP NULL DEFAULT NULL,
    token_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_login (login),
    INDEX idx_user_email (email)
) ENGINE=InnoDB;

-- 2. Tokens (Email verification & Password reset)
CREATE TABLE tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    type ENUM('email_confirm', 'password_reset') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token_lookup (token, type)
) ENGINE=InnoDB;

-- 3. Categories
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    created_by INT DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_category_status (status)
) ENGINE=InnoDB;

-- 4. Posts
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    moderation_reason TEXT DEFAULT NULL,
    moderated_at TIMESTAMP NULL DEFAULT NULL,
    delete_after TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_post_author (author_id),
    INDEX idx_post_delete_after (delete_after),
    INDEX idx_post_status (status),
    INDEX idx_post_created (created_at)
) ENGINE=InnoDB;

-- 5. Post Categories (Many-to-Many)
CREATE TABLE post_categories (
    post_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Post Images
CREATE TABLE post_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Comments
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT NOT NULL,
    post_id INT NOT NULL,
    parent_id INT DEFAULT NULL,
    content TEXT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_comment_post (post_id),
    INDEX idx_comment_author (author_id)
) ENGINE=InnoDB;

-- 8. Likes
CREATE TABLE likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT NOT NULL,
    post_id INT DEFAULT NULL,
    comment_id INT DEFAULT NULL,
    type ENUM('like', 'dislike') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_post_like (author_id, post_id),
    UNIQUE KEY uq_user_comment_like (author_id, comment_id)
) ENGINE=InnoDB;

-- 9. Favorites (Act: Creative)
CREATE TABLE favorites (
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Notifications (system messages for users)
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT DEFAULT NULL,
    type VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    INDEX idx_notification_user (user_id, is_read)
) ENGINE=InnoDB;

-- 11. Appeals (author disputes a moderation decision)
CREATE TABLE appeals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    author_id INT NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_response TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_appeal_status (status)
) ENGINE=InnoDB;

-- 12. Violations (strikes that lead to an automatic ban)
CREATE TABLE violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('post_hidden', 'post_deleted', 'comment_hidden', 'comment_deleted',
              'category_rejected', 'profile_reset') NOT NULL,
    target_id INT DEFAULT NULL,
    reason TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_violation_user (user_id, revoked),
    INDEX idx_violation_target (type, target_id)
) ENGINE=InnoDB;
