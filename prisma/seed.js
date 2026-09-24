const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Початок наповнення бази даних тестовими даними...');

  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postImage.deleteMany();
  await prisma.postCategory.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.post.deleteMany();
  await prisma.category.deleteMany();
  await prisma.token.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      login: 'dollique_admin',
      passwordHash,
      fullName: 'Головний Модератор Dollique',
      email: 'admin@dollique.com',
      isEmailConfirmed: true,
      role: 'admin',
      rating: 15,
      profilePicture: '/uploads/avatars/default.png',
      avatarConfig: { skin: 'porcelain', eyes: 'violet', hair: 'dark_bob', outfit: 'admin_coat' },
    },
  });

  const luna = await prisma.user.create({
    data: {
      login: 'ooak_luna',
      passwordHash,
      fullName: 'Луна Майстерська',
      email: 'luna@gmail.com',
      isEmailConfirmed: true,
      role: 'user',
      rating: 28,
      profilePicture: '/uploads/avatars/default.png',
      avatarConfig: { skin: 'pale', eyes: 'emerald', hair: 'pastel_pink_curls', outfit: 'lace_dress' },
    },
  });

  const alex = await prisma.user.create({
    data: {
      login: 'doll_doctor_alex',
      passwordHash,
      fullName: 'Олександр Реставратор',
      email: 'alex.repair@gmail.com',
      isEmailConfirmed: true,
      role: 'user',
      rating: 42,
      profilePicture: '/uploads/avatars/default.png',
    },
  });

  const kai = await prisma.user.create({
    data: {
      login: 'figure_hunter_kai',
      passwordHash,
      fullName: 'Кай Колекціонер',
      email: 'kai.collector@gmail.com',
      isEmailConfirmed: true,
      role: 'user',
      rating: 19,
      profilePicture: '/uploads/avatars/default.png',
    },
  });

  const eva = await prisma.user.create({
    data: {
      login: 'eva_customs',
      passwordHash,
      fullName: 'Єва Кастомс',
      email: 'eva.ooak@gmail.com',
      isEmailConfirmed: true,
      role: 'user',
      rating: 31,
      profilePicture: '/uploads/avatars/default.png',
    },
  });

  console.log('✅ Користувачі створені');

  const catFaceup = await prisma.category.create({
    data: {
      title: 'OOAK & Faceup',
      description: 'Матеріали для малювання, пастель, закріплювачі Mr. Super Clear, акрил та техніка мейку.',
    },
  });

  const catReroot = await prisma.category.create({
    data: {
      title: 'Reroot & Hair',
      description: 'Прошивка волосся, матеріали (саран, нейлон, козочка), термоукладка та кипʼятіння.',
    },
  });

  const catCare = await prisma.category.create({
    data: {
      title: 'Restoration & Care',
      description: 'Виведення плям базироном, лікування липкого пластику, пожовтіння вінілу та ремонт шарнірів.',
    },
  });

  const catId = await prisma.category.create({
    data: {
      title: 'Identification (ID)',
      description: 'Допомога у розпізнаванні молдингів, випусків і брендів ляльок та фігурок.',
    },
  });

  const catBootleg = await prisma.category.create({
    data: {
      title: 'Legit Check & Bootlegs',
      description: 'Перевірка оригінальності аніме-фігурок, Nendoroid та ляльок. Як відрізнити підробку.',
    },
  });

  const catSculpt = await prisma.category.create({
    data: {
      title: 'Sculpting & Body Mods',
      description: 'Модифікації тіла, епоксидні пластиліни (Apoxie Sculpt), шарніри та очні чіпи.',
    },
  });

  console.log('✅ Категорії створені');

  const post1 = await prisma.post.create({
    data: {
      authorId: luna.id,
      title: 'Чим безпечно стерти заводський мейк з голови Monster High без розʼїдання гуми?',
      content: 'Привіт усім! Починаю свій перший ООАК на базі Дракулаури. Підкажіть, чи підходить звичайна рідина для зняття лаку з ацетоном, чи краще брати чистий технічний ацетон? Боюся пошкодити вініл або залишити жирні плями.',
      categories: { create: [{ categoryId: catFaceup.id }, { categoryId: catCare.id }] },
    },
  });

  const post2 = await prisma.post.create({
    data: {
      authorId: alex.id,
      title: 'Як прибрати липкий наліт (пластифікатор) зі старої фігурки 2010 року?',
      content: 'Дістав із коробки стару PVC-фігурку, вся поверхня стала неприємно липкою на дотик. Чув про замочування у мильному розчині. Які пропорції та скільки часу тримати, щоб не злізла фарба?',
      categories: { create: [{ categoryId: catCare.id }] },
    },
  });

  const post3 = await prisma.post.create({
    data: {
      authorId: eva.id,
      title: 'Саран чи Нейлон: що краще обрати для густого хвилястого реруту?',
      content: 'Планую перепрошивати Barbie Extra. Хочу довгі локони, які можна завивати на зубочистки й обдавати окропом. Яке волокно краще тримає таку форму — Saran чи Nylon?',
      categories: { create: [{ categoryId: catReroot.id }] },
    },
  });

  const post4 = await prisma.post.create({
    data: {
      authorId: kai.id,
      title: 'Допоможіть з Legit Check: оригінальний Nendoroid чи китайська копія?',
      content: 'Купив на барахолці Nendoroid Hatsune Miku без коробки. Шарніри шиї мають матову текстуру, але немає круглого логотипу Good Smile Company на підставці. Хто розбирається, підкажіть, на що звернути увагу?',
      categories: { create: [{ categoryId: catBootleg.id }] },
    },
  });

  const post5 = await prisma.post.create({
    data: {
      authorId: luna.id,
      title: 'Який клір краще брати новачку: Mr. Super Clear UV Cut чи Flat?',
      content: 'Малюю перший шар акварельними олівцями. Чи є суттєва різниця між балончиком із захистом від ультрафіолету (UV Cut Flat) та звичайним Matt/Flat для лялькового вінілу?',
      categories: { create: [{ categoryId: catFaceup.id }] },
    },
  });

  console.log('✅ Пости створені');

  const comment1 = await prisma.comment.create({
    data: {
      authorId: alex.id,
      postId: post1.id,
      content: 'Беріть чистий ацетон або засіб "Нігтик" без олійок. Головне — не залишати ватний диск надовго на пластику, а швидко протирати, інакше гума може розмʼякнути.',
    },
  });

  await prisma.comment.create({
    data: {
      authorId: luna.id,
      postId: post1.id,
      parentId: comment1.id,
      content: 'Дякую велике! А після цього треба помити голову з милом?',
    },
  });

  await prisma.comment.create({
    data: {
      authorId: alex.id,
      postId: post2.id,
      content: 'Тепла вода + звичайний засіб для миття посуду (Fairy). Замочіть на 3-4 години, потім акуратно промийте мʼякою щіточкою. Це виходить пластифікатор, спиртом терти не можна!',
    },
  });

  await prisma.comment.create({
    data: {
      authorId: eva.id,
      postId: post3.id,
      content: 'Нейлон значно краще витримує гарячу воду та завивку, він термостійкий і блищить менше за дешеву синтетику. Саран більш важкий і натуральний на дотик, але завивати його складніше.',
    },
  });

  await prisma.comment.create({
    data: {
      authorId: kai.id,
      postId: post4.id,
      content: 'Якщо на шарнірі шиї є фірмовий смайлик або напис, то швидше за все оригінал. Також подивіться на якість швів на волоссі — у бутлегів там часто залишаються задирки пластмаси.',
    },
  });

  console.log('✅ Користувачі та коментарі створені');

  await prisma.like.create({
    data: { authorId: luna.id, postId: post2.id, type: 'like' },
  });
  await prisma.like.create({
    data: { authorId: kai.id, postId: post1.id, type: 'like' },
  });
  await prisma.like.create({
    data: { authorId: eva.id, postId: post1.id, type: 'like' },
  });
  await prisma.like.create({
    data: { authorId: alex.id, commentId: comment1.id, type: 'like' },
  });
  await prisma.like.create({
    data: { authorId: admin.id, postId: post3.id, type: 'like' },
  });

  console.log('✅ Лайки створені');
  console.log('🎉 База даних успішно наповнена тестовими даними Dollique!');
}

main()
  .catch((e) => {
    console.error('❌ Помилка під час сідингу:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });та 