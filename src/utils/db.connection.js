const mongoose = require("mongoose");

async function connectDB(uri) {
  try {
    await mongoose.connect(uri);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

module.exports = connectDB;