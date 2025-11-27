const fs = require("fs");
const express = require("express");
const router = express.Router();

const files = fs.readdirSync(__dirname);

console.log("Rutas disponibles:")
files.forEach((file) => {
  const filename = file.split('.')[0];
  if (filename !== 'index') {
    console.log(`/${filename}`);
    router.use(`/${filename}`, require(`./${filename}.routes`));
  }
});

module.exports = { router };