const express = require("express");
const { recoverPasswordMail, recoverPassword, validateCode, getUserByIdController, updateUserByIdController } = require("../controllers/user.controller");
const { authenticateToken } = require("../utils/authenticateToken");
const userRoutes = express.Router();

// Mandar correo electronico para el cambio de contraseña
userRoutes.post("/change-pass-mail", recoverPasswordMail);
// Validar el usuario
userRoutes.post("/validate-code", authenticateToken, validateCode);
// Cambiar contraseña
userRoutes.post("/change-pass", authenticateToken, recoverPassword);

userRoutes.get("/me", authenticateToken, getUserByIdController);
userRoutes.put("/me", authenticateToken, updateUserByIdController);

module.exports = userRoutes;