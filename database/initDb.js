const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  console.log('🚀 Starting Dollique MySQL Database Initialization...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    // 1. Create database and tables from schema.sql
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await connection.query(schemaSql);
    console.log('✅ Schema executed: database & all 13 tables verified.');

    // Switch to database
    await connection.changeUser({ database: process.env.DB_NAME || 'dollique_db' });

    // 2. Clear old data for clean re-initialization
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE doll_parts');
    await connection.query('TRUNCATE TABLE violations');
    await connection.query('TRUNCATE TABLE appeals');
    await connection.query('TRUNCATE TABLE notifications');
    await connection.query('TRUNCATE TABLE favorites');
    await connection.query('TRUNCATE TABLE likes');
    await connection.query('TRUNCATE TABLE comments');
    await connection.query('TRUNCATE TABLE post_images');
    await connection.query('TRUNCATE TABLE post_categories');
    await connection.query('TRUNCATE TABLE posts');
    await connection.query('TRUNCATE TABLE categories');
    await connection.query('TRUNCATE TABLE tokens');
    await connection.query('TRUNCATE TABLE users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🧹 Old data wiped for fresh seeding.');

    // 3. Ensure default.png exists in uploads/avatars/
    const avatarDir = path.join(__dirname, '../uploads/avatars');
    if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
    const defaultAvatarPath = path.join(avatarDir, 'default.png');
    if (!fs.existsSync(defaultAvatarPath)) {
      const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(defaultAvatarPath, dummyPng);
      console.log('🖼️ default.png avatar created in uploads/avatars/');
    }

    // Hash common test password 'password123'
    const passwordHash = await bcrypt.hash('password123', 10);

    // 4. Seed 37 Doll parts 
    await connection.query(
      `INSERT INTO doll_parts (id, category, name, image_url, layer, is_active) VALUES
      (1, 'base', 'Porcelain, button eyes', '/uploads/doll_parts/base/white_buttons.png', 10, 1),
      (2, 'base', 'Porcelain, glossy eyes', '/uploads/doll_parts/base/white_black.png', 10, 1),
      (3, 'base', 'Ivory, sleepy eyes', '/uploads/doll_parts/base/white_sleepy.png', 10, 1),
      (4, 'base', 'Beige, amber eyes', '/uploads/doll_parts/base/dark_orange.png', 10, 1),
      (5, 'base', 'Beige, eyepatch', '/uploads/doll_parts/base/brown_oneeye.png', 10, 1),
      (6, 'base', 'Tan, green eyes', '/uploads/doll_parts/base/yellow_green.png', 10, 1),
      (7, 'base', 'Tan, closed eyes', '/uploads/doll_parts/base/yellow_closed.png', 10, 1),
      (8, 'base', 'Deep brown, golden eyes', '/uploads/doll_parts/base/dark_yellow.png', 10, 1),
      (9, 'base', 'Deep brown, grey eyes', '/uploads/doll_parts/base/dark_grey.png', 10, 1),
      (10, 'outfit', 'Maid dress', '/uploads/doll_parts/clothes/maid.png', 30, 1),
      (11, 'outfit', 'Striped pinafore', '/uploads/doll_parts/clothes/pinafore.png', 30, 1),
      (12, 'outfit', 'White lace nightgown', '/uploads/doll_parts/clothes/white_dress.png', 30, 1),
      (13, 'outfit', 'Lavender lolita dress', '/uploads/doll_parts/clothes/purple_dress.png', 30, 1),
      (14, 'outfit', 'Gothic lolita dress', '/uploads/doll_parts/clothes/gothic_dress.png', 30, 1),
      (15, 'outfit', 'Gothic vest and shorts', '/uploads/doll_parts/clothes/gothic_outfit.png', 30, 1),
      (16, 'outfit', 'School blazer', '/uploads/doll_parts/clothes/school_outfit.png', 30, 1),
      (17, 'outfit', 'Pink cardigan and plaid skirt', '/uploads/doll_parts/clothes/cardigan.png', 30, 1),
      (18, 'hair', 'Ash messy bun', '/uploads/doll_parts/hair/ash_bun.png', 20, 1),
      (19, 'hair', 'Black drill curls', '/uploads/doll_parts/hair/black_curls.png', 20, 1),
      (20, 'hair', 'Blonde twin tails', '/uploads/doll_parts/hair/blonde_tails.png', 20, 1),
      (21, 'hair', 'Dark curly crop', '/uploads/doll_parts/hair/dark_boyhair.png', 20, 1),
      (22, 'hair', 'Silver shaggy cut', '/uploads/doll_parts/hair/grey_short.png', 20, 1),
      (23, 'hair', 'Lavender side ponytail', '/uploads/doll_parts/hair/lavender_tail.png', 20, 1),
      (24, 'hair', 'Lilac bob', '/uploads/doll_parts/hair/lily_short.png', 20, 1),
      (25, 'hair', 'Mint braids', '/uploads/doll_parts/hair/mint_brades.png', 20, 1),
      (26, 'hair', 'Pink waves', '/uploads/doll_parts/hair/pink_wave.png', 20, 1),
      (27, 'hair', 'Chocolate mint twin tails', '/uploads/doll_parts/hair/two_tails_blackteal.png', 20, 1),
      (28, 'shoes', 'Black shoes', '/uploads/doll_parts/shoes/black_shoes.png', 20, 1),
      (29, 'shoes', 'Brown lace-up boots', '/uploads/doll_parts/shoes/boots.png', 20, 1),
      (30, 'shoes', 'Cream ballet flats', '/uploads/doll_parts/shoes/cream_shoes.png', 20, 1),
      (31, 'shoes', 'Mary Janes with socks', '/uploads/doll_parts/shoes/mary_jane.png', 20, 1),
      (32, 'shoes', 'Pink ballet flats', '/uploads/doll_parts/shoes/pink_shoes.png', 20, 1),
      (33, 'accessory', 'Black ribbon bow', '/uploads/doll_parts/accs/black_ribbon.png', 50, 1),
      (34, 'accessory', 'Cat ears', '/uploads/doll_parts/accs/cat_ears.png', 50, 1),
      (35, 'accessory', 'Cross hair clip', '/uploads/doll_parts/accs/cross.png', 50, 1),
      (36, 'accessory', 'Nurse cap', '/uploads/doll_parts/accs/nurse_hat.png', 50, 1),
      (37, 'accessory', 'Angel wing clips', '/uploads/doll_parts/accs/wings.png', 50, 1)`
    );
    console.log('✅ Doll parts seeded: 37 entries.');

    // 5. Seed 5 Users 
    await connection.query(
      `INSERT INTO users (id, login, password_hash, full_name, email, is_email_confirmed, role, rating, profile_picture, doll_config, use_doll_as_avatar, bio) VALUES
      (1, 'dollique_admin', ?, 'Dollique Admin', 'dollique.noreply@gmail.com', 1, 'admin', 0, '/uploads/avatars/default.png', '{"base":3,"hair":27,"outfit":14,"shoes":28,"accessories":[33]}', 1, 'Keeping Dollique friendly and bootleg-free'),
      (2, 'ooak.amy', ?, 'amy🎨OOAK', 'amy.ooak@gmail.com', 1, 'user', 0, '/uploads/avatars/default.png', '{"base":1,"hair":24,"outfit":10,"shoes":31,"accessories":[34]}', 1, 'hii! I making OOAK repaints and pastel faceups. she/her . 22 y. o. 🎀'),
      (3, 'draculaura.og', ?, 'Draculaura💗🖤', 'draculaura.og@gmail.com', 1, 'user', 0, '/uploads/avatars/default.png', '{"base":5,"hair":23,"outfit":12,"shoes":31,"accessories":[36]}', 0, 'I OBSESSED WITH MONSTER HIIIIIGH'),
      (4, 'alex.figures', ?, 'Alex', 'alex.figures@gmail.com', 1, 'user', 0, '/uploads/avatars/default.png', '{"base":8,"hair":21,"outfit":15,"shoes":29,"accessories":[]}', 0, NULL),
      (5, 'monix.dolls', ?, 'Dolls Archive🎞️', 'monix.dolls@gmail.com', 1, 'user', 0, '/uploads/avatars/default.png', '{"base":4,"hair":20,"outfit":11,"shoes":30,"accessories":[]}', 0, 'Welcome to my page. There you can see a lot of unique and unusual dolls.')`,
      [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash]
    );
    console.log('✅ Users seeded: 5 entries.');

    // 6. Seed 5 Tokens
    await connection.query(
      `INSERT INTO tokens (id, user_id, token, type, expires_at) VALUES
      (1, 1, 'token_email_confirm_sample_admin_001', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY)),
      (2, 2, 'token_email_confirm_sample_amy_002', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY)),
      (3, 3, 'token_password_reset_sample_draculaura_003', 'password_reset', DATE_ADD(NOW(), INTERVAL 1 HOUR)),
      (4, 4, 'token_password_reset_sample_alex_004', 'password_reset', DATE_ADD(NOW(), INTERVAL 1 HOUR)),
      (5, 5, 'token_email_confirm_sample_monix_005', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY))`
    );
    console.log('✅ Tokens seeded: 5 entries.');

    // 7. Seed 10 Categories
    await connection.query(
      `INSERT INTO categories (id, title, description, status, created_by, rejection_reason) VALUES
      (1, 'OOAK', 'One Of A Kind repaints and faceups: pastels, acrylics, watercolor pencils and sealants.', 'approved', 1, NULL),
      (2, 'Reroot & Hair Styling', 'Hair rerooting methods, fiber selection (Saran, Nylon, Mohair), boil perms and washing.', 'approved', 1, NULL),
      (3, 'Restoration & Care', 'Stain removal, sticky plasticizer cleaning on PVC, yellowing recovery and joint repairs.', 'approved', 1, NULL),
      (4, 'Legit Check', 'Telling official dolls and figures from bootlegs: stamps, joints, paint and packaging details.', 'approved', 1, NULL),
      (5, 'Sculpting & Body Mods', 'Custom body modifications, epoxy putty, resin eye chips and joint carving.', 'approved', 1, NULL),
      (6, 'Anime figures', 'Scale figures, Nendoroids and prize figures: care, display and collecting.', 'approved', 1, NULL),
      (7, 'Hatsune Miku', 'Everything Miku: figures, dolls, releases and customs.', 'approved', 1, NULL),
      (8, 'Hirono', 'Hirono art toys by Pop Mart: series, secret figures and customs.', 'approved', 1, NULL),
      (9, 'Pure Flex', 'Pure Flex dolls: bodies, articulation and outfits.', 'pending', 4, NULL),
      (10, 'BARBIE💗', 'Barbie dolls of every era: collecting, styling and customs.', 'approved', 5, NULL)`
    );
    console.log('✅ Categories seeded: 10 entries (1 pending).');

    // 8. Seed 5 Posts
    await connection.query(
      `INSERT INTO posts (id, author_id, title, content, status) VALUES
      (1, 3, 'HELP my Draculaura faceup is RUINED?? 😭', 'okay so I found a 2010 Draculaura at a flea market and her lipstick is all scratched 🖤 I want to wipe her face and do a brand new faceup but I am SO scared of melting her vinyl. pure acetone or regular nail polish remover?? please tell me before I do something stupid 💗', 'active'),
      (2, 4, 'Sticky PVC figure from 2010, how to clean?', 'Got an old scale figure that sat in a sealed box since 2010. The surface is sticky. Is warm water with dish soap ok? How long can I soak it without damaging the paint?', 'active'),
      (3, 5, 'Saran or Nylon for a vintage Barbie reroot?', 'Hello everyone! A 1990s Barbie with very damaged hair has just joined my archive. I would like to give her soft spiral curls that hold for years. Which fiber would you recommend for boil perms, Saran or Nylon? Any experience is welcome.', 'active'),
      (4, 4, 'Miku Nendoroid: legit or bootleg?', 'Bought an unboxed Miku Nendoroid at a convention. Matte neck joint, no Good Smile logo on the stand, and the price was suspiciously good. What should I check?', 'active'),
      (5, 2, 'first pastel faceup!! which sealant should i use? 🎀', 'hii! I finally doing my first pastel faceup on a Rainbow High head 🥺 everyone says Mr. Super Clear, but there is UV Cut Flat and the normal Matt... which one keeps pastels from looking chalky? pls help 🎀', 'active'),
      (8, 2, 'can i paint a Hirono?? 👀', 'got a Hirono from the new series and I really want to give him a tiny pastel blush 🎀 is his vinyl ok with soft pastels and sealant, or will it ruin him? has anyone tried?', 'active'),
      (9, 3, 'I WANT TO GIVE MY CLAWDEEN REAL FANGS 🐺', 'is Apoxie Sculpt safe on Monster High vinyl?? I want to sculpt bigger fangs for my Clawdeen and I need them to stay on and not crack. tips pleaseee 🖤', 'active')`
    );

    // Two posts hidden by the moderator: one waits for an appeal decision, one has a running deletion timer
    await connection.query(
      `INSERT INTO posts (id, author_id, title, content, status, moderation_reason, moderated_at, delete_after) VALUES
      (6, 4, 'Cheap Nendoroids, DM me', 'Have a big batch of unboxed Nendoroids, way cheaper than official stores. DM for prices.', 'inactive', 'Advertising bootleg figures is not allowed on Dollique.', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY)),
      (7, 5, 'Archive update: the same doll, 20 photos', 'Posting the same photo set again so more people can see this beauty.', 'inactive', 'Duplicate images used to game the feed ranking.', NOW(), NULL)`
    );
    console.log('✅ Posts seeded: 9 entries (2 hidden by moderation).');

    // 9. Seed Post Categories (M:N)
    await connection.query(
      `INSERT INTO post_categories (post_id, category_id) VALUES
      (1, 1), (1, 3),
      (2, 3), (2, 6),
      (3, 2), (3, 10),
      (4, 4), (4, 6), (4, 7),
      (5, 1),
      (6, 4),
      (7, 1),
      (8, 8), (8, 1),
      (9, 5)`
    );
    console.log('✅ PostCategories seeded: 14 entries.');

    // 10. Seed 5 Post Images
    await connection.query(
      `INSERT INTO post_images (id, post_id, image_url) VALUES
      (1, 1, '/uploads/posts/sample-monster-high-face.png'),
      (2, 2, '/uploads/posts/sample-sticky-figure.png'),
      (3, 3, '/uploads/posts/sample-reroot-hair.png'),
      (4, 4, '/uploads/posts/sample-nendoroid-joint.png'),
      (5, 5, '/uploads/posts/sample-msc-spray.png')`
    );
    console.log('✅ PostImages seeded: 5 entries.');

    // 11. Seed 7 Comments (including a nested reply)
    await connection.query(
      `INSERT INTO comments (id, author_id, post_id, parent_id, content, status) VALUES
      (1, 2, 1, NULL, 'omg dont use remover with oils in it!! I use pure acetone on a cotton pad, quick wipes only, never leave it resting on her face. then wash her with soap and warm water right away. she will be fine 🎀', 'active'),
      (2, 3, 1, 1, 'AMY YOU SAVED HER LIFE 💗 what about the eyelashes, same thing??', 'active'),
      (3, 5, 2, NULL, 'From my experience: warm water with a small drop of mild dish soap, 2 to 3 hours, then a soft toothbrush. Please avoid rubbing alcohol, it can lift the paint.', 'active'),
      (4, 2, 3, NULL, 'nylon holds boil curls super nice and shiny! saran looks more natural, but be careful with the hot water, it gets frizzy fast 🥺', 'active'),
      (5, 1, 4, NULL, 'Check the neck peg first: official Good Smile joints have a small smiley face stamp. Also look for rough plastic seams on the hair parts. If both are missing, it is most likely a bootleg.', 'active'),
      (6, 5, 9, NULL, 'Apoxie Sculpt holds well on vinyl if you scuff the spot with fine sandpaper first. Let it cure for 24 hours before sanding and painting.', 'active'),
      (7, 3, 8, NULL, 'A HIRONO WITH BLUSH?? I NEED TO SEE THIS 💗🖤', 'active')`
    );
    console.log('✅ Comments seeded: 7 entries.');

    // 12. Seed 11 Likes
    await connection.query(
      `INSERT INTO likes (id, author_id, post_id, comment_id, type) VALUES
      (1, 2, 2, NULL, 'like'),
      (2, 4, 1, NULL, 'like'),
      (3, 5, 1, NULL, 'like'),
      (4, 3, NULL, 1, 'like'),
      (5, 1, 3, NULL, 'like'),
      (6, 3, NULL, 4, 'like'),
      (7, 5, 4, NULL, 'like'),
      (8, 2, 3, NULL, 'like'),
      (9, 4, NULL, 5, 'like'),
      (10, 4, 5, NULL, 'like'),
      (11, 3, 5, NULL, 'dislike')`
    );
    console.log('✅ Likes seeded: 11 entries.');

    // 13. Seed 5 Favorites
    await connection.query(
      `INSERT INTO favorites (user_id, post_id) VALUES
      (1, 1),
      (1, 2),
      (2, 2),
      (3, 1),
      (4, 3)`
    );
    console.log('✅ Favorites seeded: 5 entries.');

    // 14. Seed 5 Notifications
    await connection.query(
      `INSERT INTO notifications (id, user_id, post_id, type, message, is_read) VALUES
      (1, 4, 6, 'post_moderated', 'Your post "Cheap Nendoroids, DM me" was hidden by a moderator. Reason: Advertising bootleg figures is not allowed on Dollique. You can appeal; otherwise the post will be deleted automatically.', 0),
      (2, 5, 7, 'post_moderated', 'Your post "Archive update: the same doll, 20 photos" was hidden by a moderator. Reason: Duplicate images used to game the feed ranking. You can appeal; otherwise the post will be deleted automatically.', 1),
      (3, 4, 6, 'appeal_rejected', 'Your appeal for "Cheap Nendoroids, DM me" was rejected: Selling copies is still advertising bootlegs. The post will be deleted automatically.', 0),
      (4, 2, 5, 'post_restored', 'Your post "first pastel faceup!! which sealant should i use? 🎀" is visible again. Appeal approved: brand names here are a fair comparison, not an ad.', 1),
      (5, 3, NULL, 'post_deleted', 'Your post "Selling my old custom tools" was deleted because the moderation decision was not appealed in time.', 0),
      (6, 5, NULL, 'profile_reset', 'A moderator reset your profile picture. Reason: The avatar contained a link to an external shop.', 1)`
    );
    console.log('✅ Notifications seeded: 6 entries.');

    // 15. Seed 5 Appeals
    await connection.query(
      `INSERT INTO appeals (id, post_id, author_id, message, status, admin_response, resolved_at) VALUES
      (1, 6, 4, 'Not bootlegs. I import them myself, that is why they are cheaper.', 'rejected', 'Selling copies is still advertising bootlegs.', NOW()),
      (2, 7, 5, 'I am sorry, the photo set was uploaded several times by mistake. I will gladly remove the duplicates.', 'pending', NULL, NULL),
      (3, 5, 2, 'i just asked about two sealants, its not an ad 🥺', 'approved', 'Brand names here are a fair comparison, not an ad.', NOW()),
      (4, 3, 5, 'My post was hidden after a false spam report. Could you please check it again?', 'approved', 'Checked: the report was wrong.', NOW()),
      (5, 4, 4, 'It is a legit check question. Does not break any rule.', 'approved', 'Restored, legit checks are welcome.', NOW())`
    );
    console.log('✅ Appeals seeded: 5 entries.');

    // 16. Seed 5 Violations (monix.dolls is one strike away from an automatic ban)
    await connection.query(
      `INSERT INTO violations (id, user_id, type, target_id, reason, created_by, revoked) VALUES
      (1, 4, 'post_hidden', 6, 'Advertising bootleg figures is not allowed on Dollique.', 1, 0),
      (2, 3, 'post_deleted', NULL, 'Selling is not allowed on Dollique.', 1, 0),
      (3, 5, 'post_hidden', 7, 'Duplicate images used to game the feed ranking.', 1, 0),
      (4, 5, 'profile_reset', 5, 'The avatar contained a link to an external shop.', 1, 0),
      (5, 2, 'post_hidden', 5, 'Looked like brand advertising.', 1, 1)`
    );
    console.log('✅ Violations seeded: 5 entries (1 revoked after an approved appeal).');

    // 17. Ratings follow the seeded votes (likes minus dislikes on each author's posts and comments)
    await connection.query(`
      UPDATE users u SET rating = (
        SELECT COALESCE(SUM(CASE WHEN l.type = 'like' THEN 1 ELSE -1 END), 0)
        FROM likes l
        LEFT JOIN posts p ON l.post_id = p.id
        LEFT JOIN comments c ON l.comment_id = c.id
        WHERE p.author_id = u.id OR c.author_id = u.id
      )
    `);
    console.log('✅ User ratings recalculated from likes.');

    console.log('\nALL 13 TABLES SUCCESSFULLY INITIALIZED & SEEDED!');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = initDatabase;