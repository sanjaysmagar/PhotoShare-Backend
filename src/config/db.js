const mongoose = require("mongoose");

async function connectDB() {
  try {
    const user = process.env.DB_USER;
    const pass = encodeURIComponent(process.env.DB_PASS); // ✅ encodes @ to %40 etc.
    const host = process.env.DB_HOST;
    const dbName = process.env.DB_NAME;

    const uri =
      `mongodb+srv://${user}:${pass}@${host}/${dbName}` +
      `?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000`;

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });

    console.log("✅ DB connected");
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
