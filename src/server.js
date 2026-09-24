require('dotenv').config();
const app = require('./app');
const prisma = require('./prismaClient');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Перевірка зв'язку з базою даних
    await prisma.$connect();
    console.log('📦 Успішне підключення до бази даних MySQL (Dollique DB)');

    app.listen(PORT, () => {
      console.log(`🚀 Сервер Dollique запущено на http://localhost:${PORT}`);
      console.log(`🩺 Перевірка статусу: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Не вдалося запустити сервер:', error);
    process.exit(1);
  }
}

startServer();