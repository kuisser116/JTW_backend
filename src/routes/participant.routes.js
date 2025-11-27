const express = require("express");
const { userValidationsOptionals } = require("../middlewares/user.validations");
const { updateParticipantById, getParticipantQRsAndFoliosController, getQRByFolio, getParticipantByEmailController } = require("../controllers/participant.controller");
const participantRoutes = express.Router();

const { authenticateToken } = require("../utils/authenticateToken"); // Funcion para verificar el token
const { checkRole } = require("../middlewares/checkRole"); // Funcion para verificar el rol del usuario
const { USER_ROLES } = require("../utils/constants/user.roles");

// Solo los usuarios con el rol de Participant pueden acceder a estas rutas
const allowedRole = USER_ROLES.PARTICIPANT;

// ! Ruta solo accesible para participantes
participantRoutes.put("/update", authenticateToken, checkRole(allowedRole), userValidationsOptionals, updateParticipantById);

participantRoutes.get("/qr", authenticateToken, checkRole(allowedRole), getParticipantQRsAndFoliosController);

// ! Ruta para obtener el código QR por folio
participantRoutes.get("/qr/search", authenticateToken, checkRole(USER_ROLES.PARTICIPANT), getQRByFolio);

// Ruta para obtener un participante por su email
participantRoutes.get("/by-email", getParticipantByEmailController);

module.exports = participantRoutes;