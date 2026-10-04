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
    await connection.query('TRUNCATE TABLE avatar_parts');
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

    // 4. Seed 39 Avatar parts (doll layers; PNGs ship in uploads/avatar_parts/<folder>, 512x512 canvas)
    await connection.query(
      `INSERT INTO avatar_parts (id, category, name, image_url, back_image_url, layer, is_active) VALUES
      (1, 'base', 'Porcelain, button eyes', '/uploads/avatar_parts/base/white_buttons.png', NULL, 10, 1),
      (2, 'base', 'Porcelain, glossy eyes', '/uploads/avatar_parts/base/white_black.png', NULL, 10, 1),
      (3, 'base', 'Ivory, sleepy eyes', '/uploads/avatar_parts/base/white_sleepy.png', NULL, 10, 1),
      (4, 'base', 'Beige, amber eyes', '/uploads/avatar_parts/base/dark_orange.png', NULL, 10, 1),
      (5, 'base', 'Beige, eyepatch', '/uploads/avatar_parts/base/brown_oneeye.png', NULL, 10, 1),
      (6, 'base', 'Tan, green eyes', '/uploads/avatar_parts/base/yellow_green.png', NULL, 10, 1),
      (7, 'base', 'Tan, closed eyes', '/uploads/avatar_parts/base/yellow_closed.png', NULL, 10, 1),
      (8, 'base', 'Deep brown, golden eyes', '/uploads/avatar_parts/base/dark_yellow.png', NULL, 10, 1),
      (9, 'base', 'Deep brown, grey eyes', '/uploads/avatar_parts/base/dark_grey.png', NULL, 10, 1),
      (10, 'outfit', 'Maid dress', '/uploads/avatar_parts/clothes/maid.png', NULL, 30, 1),
      (11, 'outfit', 'Striped pinafore', '/uploads/avatar_parts/clothes/pinafore.png', NULL, 30, 1),
      (12, 'outfit', 'White lace nightgown', '/uploads/avatar_parts/clothes/white_dress.png', NULL, 30, 1),
      (13, 'outfit', 'Lavender lolita dress', '/uploads/avatar_parts/clothes/purple_dress.png', NULL, 30, 1),
      (14, 'outfit', 'Gothic lolita dress', '/uploads/avatar_parts/clothes/gothic_dress.png', NULL, 30, 1),
      (15, 'outfit', 'Gothic vest and shorts', '/uploads/avatar_parts/clothes/gothic_outfit.png', NULL, 30, 1),
      (16, 'outfit', 'School blazer', '/uploads/avatar_parts/clothes/school_outfit.png', NULL, 30, 1),
      (17, 'outfit', 'Pink cardigan and plaid skirt', '/uploads/avatar_parts/clothes/cardigan.png', NULL, 30, 1),
      (18, 'hair', 'Ash messy bun', '/uploads/avatar_parts/hair/ash_bun.png', NULL, 20, 1),
      (19, 'hair', 'Black drill curls', '/uploads/avatar_parts/hair/black_curls.png', NULL, 20, 1),
      (20, 'hair', 'Blonde twin tails', '/uploads/avatar_parts/hair/blonde_tails.png', NULL, 20, 1),
      (21, 'hair', 'Dark curly crop', '/uploads/avatar_parts/hair/dark_boyhair.png', NULL, 20, 1),
      (22, 'hair', 'Silver shaggy cut', '/uploads/avatar_parts/hair/grey_short.png', NULL, 20, 1),
      (23, 'hair', 'Lavender side ponytail', '/uploads/avatar_parts/hair/lavender_tail.png', NULL, 20, 1),
      (24, 'hair', 'Lilac bob', '/uploads/avatar_parts/hair/lily_short.png', NULL, 20, 1),
      (25, 'hair', 'Mint braids', '/uploads/avatar_parts/hair/mint_brades.png', NULL, 20, 1),
      (26, 'hair', 'Pink waves', '/uploads/avatar_parts/hair/pink_wave.png', NULL, 20, 1),
      (27, 'hair', 'Chocolate mint twin tails', '/uploads/avatar_parts/hair/two_tails_blackteal.png', NULL, 20, 1),
      (28, 'shoes', 'Black shoes', '/uploads/avatar_parts/shoes/black_shoes.png', NULL, 20, 1),
      (29, 'shoes', 'Brown lace-up boots', '/uploads/avatar_parts/shoes/boots.png', NULL, 20, 1),
      (30, 'shoes', 'Cream ballet flats', '/uploads/avatar_parts/shoes/cream_shoes.png', NULL, 20, 1),
      (31, 'shoes', 'Mary Janes with socks', '/uploads/avatar_parts/shoes/mary_jane.png', NULL, 20, 1),
      (32, 'shoes', 'Pink ballet flats', '/uploads/avatar_parts/shoes/pink_shoes.png', NULL, 20, 1),
      (33, 'accessory', 'Black ribbon bow', '/uploads/avatar_parts/accs/black_ribbon.png', NULL, 50, 1),
      (34, 'accessory', 'Cat ears', '/uploads/avatar_parts/accs/cat_ears.png', NULL, 50, 1),
      (35, 'accessory', 'Cross hair clip', '/uploads/avatar_parts/accs/cross.png', NULL, 50, 1),
      (36, 'accessory', 'Nurse cap', '/uploads/avatar_parts/accs/nurse_hat.png', NULL, 50, 1),
      (37, 'accessory', 'Angel wing clips', '/uploads/avatar_parts/accs/wings.png', NULL, 50, 1)`
    );
    console.log('✅ Avatar parts seeded: 37 entries (2 retired outfits).');

    // 5. Seed 5 Users (All English)
    await connection.query(
      `INSERT INTO users (id, login, password_hash, full_name, email, is_email_confirmed, role, rating, profile_picture, avatar_config, bio) VALUES
      (1, 'dollique_admin', ?, 'Chief Moderator', 'dollique.noreply@gmail.com', 1, 'admin', 15, '/uploads/avatars/default.png', '{"base":3,"hair":29,"outfit":14,"shoes":30,"accessories":[35]}', 'Keeping Dollique friendly and bootleg-free.'),
      (2, 'ooak_luna', ?, 'Luna Custom Arts', 'luna@gmail.com', 1, 'user', 28, '/uploads/avatars/default.png', '{"base":1,"hair":26,"outfit":10,"shoes":31,"accessories":[36]}', 'OOAK repaints and pastel faceups, mostly Monster High.'),
      (3, 'doll_doctor_alex', ?, 'Alex Restoration', 'alex.repair@gmail.com', 1, 'user', 42, '/uploads/avatars/default.png', '{"base":5,"hair":25,"outfit":12,"shoes":31,"accessories":[37]}', 'I fix sticky vinyl, yellowed PVC and broken joints.'),
      (4, 'figure_hunter_kai', ?, 'Kai Collector', 'kai.collector@gmail.com', 1, 'user', 19, '/uploads/avatars/default.png', '{"base":8,"hair":23,"outfit":15,"shoes":30,"accessories":[]}', 'Collecting Nendoroids and scale figures since 2015.'),
      (5, 'eva_customs', ?, 'Eva OOAK Studio', 'eva.ooak@gmail.com', 1, 'user', 31, '/uploads/avatars/default.png', '{"base":4,"hair":22,"outfit":18,"shoes":32,"accessories":[]}', 'Reroots, boil perms and custom Barbie styling.')`,
      [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash]
    );
    console.log('✅ Users seeded: 5 entries (English).');

    // 6. Seed 5 Tokens
    await connection.query(
      `INSERT INTO tokens (id, user_id, token, type, expires_at) VALUES
      (1, 1, 'token_email_confirm_sample_admin_001', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY)),
      (2, 2, 'token_email_confirm_sample_luna_002', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY)),
      (3, 3, 'token_password_reset_sample_alex_003', 'password_reset', DATE_ADD(NOW(), INTERVAL 1 HOUR)),
      (4, 4, 'token_password_reset_sample_kai_004', 'password_reset', DATE_ADD(NOW(), INTERVAL 1 HOUR)),
      (5, 5, 'token_email_confirm_sample_eva_005', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY))`
    );
    console.log('✅ Tokens seeded: 5 entries.');

    // 7. Seed 6 Categories (All English)
    await connection.query(
      `INSERT INTO categories (id, title, description, status, created_by, rejection_reason) VALUES
      (1, 'OOAK & Faceup', 'Painting techniques, pastels, acrylics, watercolor pencils, and Mr. Super Clear sealants.', 'approved', 1, NULL),
      (2, 'Reroot & Hair Styling', 'Hair rerooting methods, fiber selection (Saran, Nylon, Mohair), and boil washing.', 'approved', 1, NULL),
      (3, 'Restoration & Care', 'Stain removal, sticky plasticizer cleaning on PVC, yellowing recovery, and joint repairs.', 'approved', 1, NULL),
      (4, 'Identification (ID)', 'Community help identifying vintage and modern doll molds, releases, and anime figures.', 'approved', 1, NULL),
      (5, 'Legit Check & Bootlegs', 'Authentication guides for anime scale figures, Nendoroid bootleg checks, and packaging details.', 'approved', 1, NULL),
      (6, 'Sculpting & Body Mods', 'Custom body modifications, epoxy putty (Apoxie Sculpt), resin eye chips, and joint carving.', 'approved', 1, NULL),
      (7, 'BJD Wigs & Eyes', 'Ball-jointed doll wig sizing, mohair vs synthetic wigs, and acrylic or resin eye choices.', 'pending', 2, NULL),
      (8, 'Cheap Figures Marketplace', 'Buy and sell figures for low prices.', 'rejected', 4, 'Selling is not allowed on Dollique, and the name invites bootlegs.')`
    );
    console.log('✅ Categories seeded: 8 entries (1 pending, 1 rejected).');

    // 8. Seed 5 Posts (All English)
    await connection.query(
      `INSERT INTO posts (id, author_id, title, content, status) VALUES
      (1, 2, 'How to safely remove factory face paint from a Monster High doll without melting the vinyl?', 'Hi everyone! Starting my first custom OOAK on a Draculaura doll. Should I use 100% pure acetone or regular non-acetone nail polish remover? I am worried about dissolving the vinyl head or leaving permanent shiny marks.', 'active'),
      (2, 3, 'How to clean sticky plasticizer residue from an older 2010 PVC anime scale figure?', 'Just unpacked an older scale figure that was kept in its sealed box for years, and the surface is sticky to the touch. I heard about soaking in warm soapy water. What dish soap ratio and soak duration will not damage the paint finish?', 'active'),
      (3, 5, 'Saran vs Nylon: which fiber holds tight boil-permed curls best for Barbie dolls?', 'Planning a full reroot on a Barbie Extra doll. I want bouncy spiral curls set with wooden toothpicks and boiling water. Which fiber holds curls better long-term without frizzing?', 'active'),
      (4, 4, 'Legit Check: Authentic Hatsune Miku Nendoroid or a bootleg replica?', 'Bought an unboxed Miku Nendoroid at a local convention. The neck joint has a matte texture, but there is no Good Smile Company logo stamped on the stand. What are the key details to verify authenticity?', 'active'),
      (5, 2, 'Which sealant should a beginner choose: Mr. Super Clear UV Cut Flat vs standard Matt?', 'Applying my first pastel and watercolor layers on doll vinyl. Is there a major difference in tooth, chalkiness, and yellowing protection between UV Cut Flat and standard Matt spray?', 'active')`
    );

    // Two posts hidden by the moderator: one waits for an appeal decision, one has a running deletion timer
    await connection.query(
      `INSERT INTO posts (id, author_id, title, content, status, moderation_reason, moderated_at, delete_after) VALUES
      (6, 4, 'Selling cheap Nendoroid copies, DM me for prices', 'Got a big batch of unboxed Nendoroids from an overseas factory, way cheaper than official stores. Message me privately if you want one.', 'inactive', 'Advertising bootleg figures is not allowed on Dollique.', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY)),
      (7, 5, 'My OOAK repaint of a Rainbow High doll (photo spam)', 'Twenty identical photos of the same repaint, posted to bump the thread to the top.', 'inactive', 'Duplicate images used to game the feed ranking.', NOW(), NULL)`
    );
    console.log('✅ Posts seeded: 7 entries (2 hidden by moderation).');

    // 9. Seed Post Categories (M:N)
    await connection.query(
      `INSERT INTO post_categories (post_id, category_id) VALUES
      (1, 1), (1, 3),
      (2, 3),
      (3, 2),
      (4, 5),
      (5, 1),
      (6, 5),
      (7, 1)`
    );
    console.log('✅ PostCategories seeded: 8 entries.');

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

    // 11. Seed 5 Comments (including nested reply) (All English)
    await connection.query(
      `INSERT INTO comments (id, author_id, post_id, parent_id, content, status) VALUES
      (1, 3, 1, NULL, 'Use 100% pure acetone on a cotton pad, but wipe quickly and never leave the pad resting on the head. Immediately wash with mild hand soap and warm water afterwards.', 'active'),
      (2, 2, 1, 1, 'Thank you so much! Should I also remove the eyelashes with the same method?', 'active'),
      (3, 3, 2, NULL, 'Warm water with a small drop of regular Dawn or Fairy dish soap. Soak for 2 to 3 hours, then gently brush with a soft baby toothbrush. Do not rub with rubbing alcohol!', 'active'),
      (4, 5, 3, NULL, 'Nylon takes heat much better and produces crisp, shiny curls. Saran has a heavier, more realistic drape, but boil setting it requires extra care so it does not singe.', 'active'),
      (5, 4, 4, NULL, 'Check the neck joint peg. Authentic Good Smile joints always feature a little stamped smiley face symbol. Also inspect the hair seams for rough plastic flashing.', 'active')`
    );
    console.log('✅ Comments seeded: 5 entries (English).');

    // 12. Seed 5 Likes
    await connection.query(
      `INSERT INTO likes (id, author_id, post_id, comment_id, type) VALUES
      (1, 2, 2, NULL, 'like'),
      (2, 4, 1, NULL, 'like'),
      (3, 5, 1, NULL, 'like'),
      (4, 3, NULL, 1, 'like'),
      (5, 1, 3, NULL, 'like')`
    );
    console.log('✅ Likes seeded: 5 entries.');

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
      (1, 4, 6, 'post_moderated', 'Your post "Selling cheap Nendoroid copies, DM me for prices" was hidden by a moderator. Reason: Advertising bootleg figures is not allowed on Dollique. You can appeal; otherwise the post will be deleted automatically.', 0),
      (2, 5, 7, 'post_moderated', 'Your post "My OOAK repaint of a Rainbow High doll (photo spam)" was hidden by a moderator. Reason: Duplicate images used to game the feed ranking. You can appeal; otherwise the post will be deleted automatically.', 1),
      (3, 4, 6, 'appeal_rejected', 'Your appeal for "Selling cheap Nendoroid copies, DM me for prices" was rejected: Selling copies is still advertising bootlegs. The post will be deleted automatically.', 0),
      (4, 2, 5, 'post_restored', 'Your post "Which sealant should a beginner choose: Mr. Super Clear UV Cut Flat vs standard Matt?" is visible again. Appeal approved: brand names here are a fair comparison, not an ad.', 1),
      (5, 3, NULL, 'post_deleted', 'Your post "Selling my old custom tools" was deleted because the moderation decision was not appealed in time.', 0),
      (6, 4, NULL, 'category_rejected', 'Your category "Cheap Figures Marketplace" was rejected. Reason: Selling is not allowed on Dollique, and the name invites bootlegs.', 0),
      (7, 5, NULL, 'profile_reset', 'A moderator reset your profile picture. Reason: The avatar contained a link to an external shop.', 1)`
    );
    console.log('✅ Notifications seeded: 7 entries.');

    // 15. Seed 5 Appeals
    await connection.query(
      `INSERT INTO appeals (id, post_id, author_id, message, status, admin_response, resolved_at) VALUES
      (1, 6, 4, 'These are not bootlegs, they are just cheaper because I import them myself.', 'rejected', 'Selling copies is still advertising bootlegs.', NOW()),
      (2, 7, 5, 'Sorry, the photos uploaded several times by mistake. I can remove the duplicates.', 'pending', NULL, NULL),
      (3, 5, 2, 'I only compared two sealants, I am not promoting the brand.', 'approved', 'Brand names here are a fair comparison, not an ad.', NOW()),
      (4, 3, 5, 'The post was hidden after a false spam report, please check it again.', 'approved', 'Checked: the report was wrong.', NOW()),
      (5, 4, 4, 'My legit check question got hidden, but it does not break any rule.', 'approved', 'Restored, legit checks are welcome.', NOW())`
    );
    console.log('✅ Appeals seeded: 5 entries.');

    // 16. Seed 5 Violations (kai and eva are one strike away from an automatic ban)
    await connection.query(
      `INSERT INTO violations (id, user_id, type, target_id, reason, created_by, revoked) VALUES
      (1, 4, 'post_hidden', 6, 'Advertising bootleg figures is not allowed on Dollique.', 1, 0),
      (2, 4, 'category_rejected', 8, 'Selling is not allowed on Dollique, and the name invites bootlegs.', 1, 0),
      (3, 5, 'post_hidden', 7, 'Duplicate images used to game the feed ranking.', 1, 0),
      (4, 5, 'profile_reset', 5, 'The avatar contained a link to an external shop.', 1, 0),
      (5, 2, 'post_hidden', 5, 'Looked like brand advertising.', 1, 1)`
    );
    console.log('✅ Violations seeded: 5 entries (1 revoked after an approved appeal).');

    console.log('\n🎉 ALL 13 TABLES SUCCESSFULLY INITIALIZED & SEEDED (>= 5 rows each, English)!');
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