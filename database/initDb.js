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
    console.log('✅ Schema executed: database & all 9 tables verified.');

    // Switch to database
    await connection.changeUser({ database: process.env.DB_NAME || 'dollique_db' });

    // 2. Clear old data for clean re-initialization
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
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

    // 4. Seed 5 Users (All English)
    await connection.query(
      `INSERT INTO users (id, login, password_hash, full_name, email, is_email_confirmed, role, rating, profile_picture, avatar_config) VALUES
      (1, 'dollique_admin', ?, 'Chief Moderator', 'dollique.noreply@gmail.com', 1, 'admin', 15, '/uploads/avatars/default.png', '{"skin":"porcelain","eyes":"violet","hair":"dark_bob"}'),
      (2, 'ooak_luna', ?, 'Luna Custom Arts', 'luna@gmail.com', 1, 'user', 28, '/uploads/avatars/default.png', '{"skin":"pale","eyes":"emerald","hair":"pastel_pink_curls"}'),
      (3, 'doll_doctor_alex', ?, 'Alex Restoration', 'alex.repair@gmail.com', 1, 'user', 42, '/uploads/avatars/default.png', NULL),
      (4, 'figure_hunter_kai', ?, 'Kai Collector', 'kai.collector@gmail.com', 1, 'user', 19, '/uploads/avatars/default.png', NULL),
      (5, 'eva_customs', ?, 'Eva OOAK Studio', 'eva.ooak@gmail.com', 1, 'user', 31, '/uploads/avatars/default.png', NULL)`,
      [passwordHash, passwordHash, passwordHash, passwordHash, passwordHash]
    );
    console.log('✅ Users seeded: 5 entries (English).');

    // 5. Seed 5 Tokens
    await connection.query(
      `INSERT INTO tokens (id, user_id, token, type, expires_at) VALUES
      (1, 1, 'token_email_confirm_sample_admin_001', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY)),
      (2, 2, 'token_email_confirm_sample_luna_002', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY)),
      (3, 3, 'token_password_reset_sample_alex_003', 'password_reset', DATE_ADD(NOW(), INTERVAL 1 HOUR)),
      (4, 4, 'token_password_reset_sample_kai_004', 'password_reset', DATE_ADD(NOW(), INTERVAL 1 HOUR)),
      (5, 5, 'token_email_confirm_sample_eva_005', 'email_confirm', DATE_ADD(NOW(), INTERVAL 1 DAY))`
    );
    console.log('✅ Tokens seeded: 5 entries.');

    // 6. Seed 6 Categories (All English)
    await connection.query(
      `INSERT INTO categories (id, title, description) VALUES
      (1, 'OOAK & Faceup', 'Painting techniques, pastels, acrylics, watercolor pencils, and Mr. Super Clear sealants.'),
      (2, 'Reroot & Hair Styling', 'Hair rerooting methods, fiber selection (Saran, Nylon, Mohair), and boil washing.'),
      (3, 'Restoration & Care', 'Stain removal, sticky plasticizer cleaning on PVC, yellowing recovery, and joint repairs.'),
      (4, 'Identification (ID)', 'Community help identifying vintage and modern doll molds, releases, and anime figures.'),
      (5, 'Legit Check & Bootlegs', 'Authentication guides for anime scale figures, Nendoroid bootleg checks, and packaging details.'),
      (6, 'Sculpting & Body Mods', 'Custom body modifications, epoxy putty (Apoxie Sculpt), resin eye chips, and joint carving.')`
    );
    console.log('✅ Categories seeded: 6 entries (English).');

    // 7. Seed 5 Posts (All English)
    await connection.query(
      `INSERT INTO posts (id, author_id, title, content, status) VALUES
      (1, 2, 'How to safely remove factory face paint from a Monster High doll without melting the vinyl?', 'Hi everyone! Starting my first custom OOAK on a Draculaura doll. Should I use 100% pure acetone or regular non-acetone nail polish remover? I am worried about dissolving the vinyl head or leaving permanent shiny marks.', 'active'),
      (2, 3, 'How to clean sticky plasticizer residue from an older 2010 PVC anime scale figure?', 'Just unpacked an older scale figure that was kept in its sealed box for years, and the surface is sticky to the touch. I heard about soaking in warm soapy water. What dish soap ratio and soak duration will not damage the paint finish?', 'active'),
      (3, 5, 'Saran vs Nylon: which fiber holds tight boil-permed curls best for Barbie dolls?', 'Planning a full reroot on a Barbie Extra doll. I want bouncy spiral curls set with wooden toothpicks and boiling water. Which fiber holds curls better long-term without frizzing?', 'active'),
      (4, 4, 'Legit Check: Authentic Hatsune Miku Nendoroid or a bootleg replica?', 'Bought an unboxed Miku Nendoroid at a local convention. The neck joint has a matte texture, but there is no Good Smile Company logo stamped on the stand. What are the key details to verify authenticity?', 'active'),
      (5, 2, 'Which sealant should a beginner choose: Mr. Super Clear UV Cut Flat vs standard Matt?', 'Applying my first pastel and watercolor layers on doll vinyl. Is there a major difference in tooth, chalkiness, and yellowing protection between UV Cut Flat and standard Matt spray?', 'active')`
    );
    console.log('✅ Posts seeded: 5 entries (English).');

    // 8. Seed Post Categories (M:N)
    await connection.query(
      `INSERT INTO post_categories (post_id, category_id) VALUES
      (1, 1), (1, 3),
      (2, 3),
      (3, 2),
      (4, 5),
      (5, 1)`
    );
    console.log('✅ PostCategories seeded: 6 entries.');

    // 9. Seed 5 Post Images
    await connection.query(
      `INSERT INTO post_images (id, post_id, image_url) VALUES
      (1, 1, '/uploads/posts/sample-monster-high-face.png'),
      (2, 2, '/uploads/posts/sample-sticky-figure.png'),
      (3, 3, '/uploads/posts/sample-reroot-hair.png'),
      (4, 4, '/uploads/posts/sample-nendoroid-joint.png'),
      (5, 5, '/uploads/posts/sample-msc-spray.png')`
    );
    console.log('✅ PostImages seeded: 5 entries.');

    // 10. Seed 5 Comments (including nested reply) (All English)
    await connection.query(
      `INSERT INTO comments (id, author_id, post_id, parent_id, content, status) VALUES
      (1, 3, 1, NULL, 'Use 100% pure acetone on a cotton pad, but wipe quickly and never leave the pad resting on the head. Immediately wash with mild hand soap and warm water afterwards.', 'active'),
      (2, 2, 1, 1, 'Thank you so much! Should I also remove the eyelashes with the same method?', 'active'),
      (3, 3, 2, NULL, 'Warm water with a small drop of regular Dawn or Fairy dish soap. Soak for 2 to 3 hours, then gently brush with a soft baby toothbrush. Do not rub with rubbing alcohol!', 'active'),
      (4, 5, 3, NULL, 'Nylon takes heat much better and produces crisp, shiny curls. Saran has a heavier, more realistic drape, but boil setting it requires extra care so it does not singe.', 'active'),
      (5, 4, 4, NULL, 'Check the neck joint peg. Authentic Good Smile joints always feature a little stamped smiley face symbol. Also inspect the hair seams for rough plastic flashing.', 'active')`
    );
    console.log('✅ Comments seeded: 5 entries (English).');

    // 11. Seed 5 Likes
    await connection.query(
      `INSERT INTO likes (id, author_id, post_id, comment_id, type) VALUES
      (1, 2, 2, NULL, 'like'),
      (2, 4, 1, NULL, 'like'),
      (3, 5, 1, NULL, 'like'),
      (4, 3, NULL, 1, 'like'),
      (5, 1, 3, NULL, 'like')`
    );
    console.log('✅ Likes seeded: 5 entries.');

    // 12. Seed 5 Favorites
    await connection.query(
      `INSERT INTO favorites (user_id, post_id) VALUES
      (1, 1),
      (1, 2),
      (2, 2),
      (3, 1),
      (4, 3)`
    );
    console.log('✅ Favorites seeded: 5 entries.');

    console.log('\n🎉 ALL 9 TABLES SUCCESSFULLY INITIALIZED & SEEDED (>= 5 rows each, English)!');
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