// middlewares/authenticateToken.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta";

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // Normalmente el token se envía como: Bearer <token>
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Acceso denegado, token requerido" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido o expirado" });
    }
    // Guardamos la información del usuario decodificada en req.user
    req.user = decoded; // { userId, role, iat, exp } || ({ email } solo para el caso de la recuperacion de contraseña)

    next();
  });
};
