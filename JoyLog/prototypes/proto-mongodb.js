// ====================================================
// JoyLog – Prototipo MongoDB
// Sprint 2 – Test de integración con MongoDB Atlas
// ====================================================
// Uso: node proto-mongodb.js
// Requiere: npm install mongoose dotenv
// Crear archivo .env con: MONGODB_URI=mongodb+srv://...
// ====================================================

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/joylog_test';

// -------------------- ESQUEMAS --------------------

const userSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  avatar:    { type: String, default: '' },
  bio:       { type: String, default: '' },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  badges:    [{
    id:          String,
    name:        String,
    description: String,
    icon:        String,
    unlockedAt:  Date,
  }],
}, { timestamps: true });

const gameEntrySchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rawgId:         { type: Number, required: true },
  title:          { type: String, required: true },
  coverImage:     { type: String, default: '' },
  platform:       { type: String, enum: ['PC', 'PS5', 'PS4', 'Xbox Series', 'Xbox One', 'Switch', 'Mobile', 'Other'], required: true },
  status:         { type: String, enum: ['playing', 'completed', 'pending', 'abandoned', '100%'], default: 'pending' },
  hoursPlayed:    { type: Number, default: 0 },
  personalRating: { type: Number, min: 1, max: 10, default: null },
  startDate:      { type: Date, default: null },
  endDate:        { type: Date, default: null },
}, { timestamps: true });

// Índice compuesto: un usuario no puede tener el mismo juego+plataforma dos veces
gameEntrySchema.index({ userId: 1, rawgId: 1, platform: 1 }, { unique: true });

const reviewSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username:   { type: String, required: true },
  userAvatar: { type: String, default: '' },
  rawgId:     { type: Number, required: true },
  gameTitle:  { type: String, required: true },
  title:      { type: String, required: true },
  content:    { type: String, required: true },
  rating:     { type: Number, min: 1, max: 10, required: true },
  likes:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const GameEntry = mongoose.model('GameEntry', gameEntrySchema);
const Review = mongoose.model('Review', reviewSchema);

// -------------------- OPERACIONES CRUD --------------------

async function createUser() {
  console.log('\n👤 Creando usuario de prueba...');
  const user = await User.create({
    username: 'test_player',
    email: 'test@joylog.com',
    password: '$2b$10$hashedpasswordplaceholder', // En producción usar bcrypt
    bio: 'Gamer apasionado 🎮',
    badges: [
      { id: 'first_game', name: 'Primer Paso', description: 'Añade tu primer juego', icon: '🎮', unlockedAt: new Date() },
    ],
  });
  console.log(`   ✅ Usuario creado: ${user.username} (ID: ${user._id})`);
  return user;
}

async function addGameToLibrary(userId) {
  console.log('\n🎮 Añadiendo juegos a la biblioteca...');

  const games = [
    {
      userId,
      rawgId: 3498,
      title: 'Grand Theft Auto V',
      coverImage: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg',
      platform: 'PC',
      status: 'completed',
      hoursPlayed: 120,
      personalRating: 9,
      startDate: new Date('2023-01-15'),
      endDate: new Date('2023-03-20'),
    },
    {
      userId,
      rawgId: 3328,
      title: 'The Witcher 3: Wild Hunt',
      coverImage: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6f76db.jpg',
      platform: 'PC',
      status: 'playing',
      hoursPlayed: 45,
      personalRating: 10,
      startDate: new Date('2024-01-01'),
    },
    {
      userId,
      rawgId: 58175,
      title: 'God of War (2018)',
      coverImage: 'https://media.rawg.io/media/games/4be/4be6a6ad0217c61c71c3a7c5e67f0211.jpg',
      platform: 'PS5',
      status: 'pending',
      hoursPlayed: 0,
    },
  ];

  const entries = await GameEntry.insertMany(games);
  console.log(`   ✅ ${entries.length} juegos añadidos a la biblioteca`);
  entries.forEach(e => console.log(`      - ${e.title} (${e.platform}) → ${e.status}`));
  return entries;
}

async function queryLibrary(userId) {
  console.log('\n📚 Consultando biblioteca del usuario...');

  // Todos los juegos
  const allGames = await GameEntry.find({ userId }).sort({ createdAt: -1 });
  console.log(`   Total juegos: ${allGames.length}`);

  // Filtrar por estado
  const playing = await GameEntry.find({ userId, status: 'playing' });
  console.log(`   Jugando ahora: ${playing.length} juegos`);
  playing.forEach(g => console.log(`      - ${g.title} (${g.hoursPlayed}h)`));

  const completed = await GameEntry.find({ userId, status: 'completed' });
  console.log(`   Completados: ${completed.length} juegos`);

  const pending = await GameEntry.find({ userId, status: 'pending' });
  console.log(`   Pendientes: ${pending.length} juegos`);

  // Filtrar por plataforma
  const pcGames = await GameEntry.find({ userId, platform: 'PC' });
  console.log(`   Juegos en PC: ${pcGames.length}`);

  // Ordenar por nota
  const topRated = await GameEntry.find({ userId, personalRating: { $ne: null } })
    .sort({ personalRating: -1 })
    .limit(3);
  console.log(`   Top 3 mejor valorados:`);
  topRated.forEach(g => console.log(`      - ${g.title}: ${g.personalRating}/10`));

  // Estadísticas
  const stats = await GameEntry.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalGames: { $sum: 1 },
        totalHours: { $sum: '$hoursPlayed' },
        avgRating: { $avg: '$personalRating' },
        completedCount: {
          $sum: { $cond: [{ $in: ['$status', ['completed', '100%']] }, 1, 0] },
        },
      },
    },
  ]);

  if (stats.length > 0) {
    console.log(`\n📊 Estadísticas:`);
    console.log(`   Total juegos: ${stats[0].totalGames}`);
    console.log(`   Total horas: ${stats[0].totalHours}h`);
    console.log(`   Nota media: ${stats[0].avgRating?.toFixed(1) || 'N/A'}`);
    console.log(`   Completados: ${stats[0].completedCount}`);
  }
}

async function createReview(userId) {
  console.log('\n✍️ Creando reseña...');
  const review = await Review.create({
    userId,
    username: 'test_player',
    rawgId: 3498,
    gameTitle: 'Grand Theft Auto V',
    title: 'Una obra maestra del mundo abierto',
    content: 'GTA V sigue siendo uno de los mejores juegos de mundo abierto. La historia de los tres protagonistas es increíble y el online no para de recibir contenido. Un must-have.',
    rating: 9,
  });
  console.log(`   ✅ Reseña creada: "${review.title}" → ${review.rating}/10`);
  return review;
}

async function updateGameEntry(entryId) {
  console.log('\n🔄 Actualizando entrada de juego...');
  const updated = await GameEntry.findByIdAndUpdate(
    entryId,
    {
      status: 'completed',
      hoursPlayed: 80,
      personalRating: 10,
      endDate: new Date(),
    },
    { new: true }
  );
  console.log(`   ✅ ${updated.title} actualizado → ${updated.status} (${updated.hoursPlayed}h, ${updated.personalRating}/10)`);
}

async function cleanup() {
  console.log('\n🧹 Limpiando datos de prueba...');
  await User.deleteMany({ username: 'test_player' });
  await GameEntry.deleteMany({ rawgId: { $in: [3498, 3328, 58175] } });
  await Review.deleteMany({ username: 'test_player' });
  console.log('   ✅ Datos de prueba eliminados');
}

// -------------------- EJECUCIÓN --------------------

async function main() {
  console.log('='.repeat(60));
  console.log('   JoyLog – Prototipo MongoDB');
  console.log('='.repeat(60));

  try {
    // Conectar
    console.log(`\n🔌 Conectando a MongoDB...`);
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Ocultar credenciales
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ Conectado correctamente');

    // CRUD Operations
    const user = await createUser();
    const entries = await addGameToLibrary(user._id);
    await queryLibrary(user._id);
    await createReview(user._id);
    await updateGameEntry(entries[1]._id); // Actualizar Witcher 3
    await queryLibrary(user._id); // Ver cambios

    // Limpiar
    await cleanup();

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    console.log('\n' + '='.repeat(60));
    console.log('   ✅ Prototipo MongoDB completado');
    console.log('='.repeat(60));
  }
}

main();
