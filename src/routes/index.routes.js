const fs = require("fs");
const express = require("express");
const router = express.Router();

fs.readdir(__dirname, (err, files) => {
  if(err) {
    console.log("Ha ocurrido un error al leer los archivos");
  }

  console.log("Rutas disponibles:")
  files.forEach((file) => {
    const filename = file.split('.')[0];
    if(filename !== 'index'){
      console.log(`/${filename}`);
      router.use(`/${filename}`, require(`./${filename}.routes`));
    }
  });
});

module.exports = { router };