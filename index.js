require("dotenv").config()
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const connectDB = require("./src/utils/db.connection");
const { router } = require("./src/routes/index.routes");

const app = express();

if(process.env.ENV === "dev") {
  app.use(morgan('dev'));
}

app.use(cors());
app.use(express.json());

// Rutas
app.use("/api", router);

const PORT = process.env.PORT;
const MONGO_URI = `${process.env.MONGO_URI}/${process.env.DB_NAME}`;
console.log(MONGO_URI);

app.listen(PORT, () => {
  console.log(`App corriendo en el puerto ${PORT}`);
  connectDB(MONGO_URI).then((isConnected) => {
    if(isConnected) console.log(`Base de datos conectada a: ${MONGO_URI}`);
    else console.log(`No se pudo conectar a la base de datos con el URI: ${MONGO_URI}`);
  });
});