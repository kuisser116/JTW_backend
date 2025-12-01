const express = require("express");
const {
  create,
  getAllWorkshops,
  updateById,
  deleteById,
  getAllWorkshopsByAdmin,
  getAllWorkshopsByEvent,
  getAllWorkshopsBySupervisor,
  getAllWorkshopsByParticipant,
  addSupervisorToWorkshop,
  addParticipantToWorkshop,
  registrateAssistance,
  cancelWorkshopRegistrationController,
  getWorkshopsBySupervisorAndEventController,
  removeSupervisorFromWorkshop,
  getImg
} = require("../controllers/recreational.workshop.controller");
const { requiredString, notRequiredString } = require("../validators/strings");
const { isNumber } = require("../validators/numbers");
const { isDate, isAfterDate } = require("../validators/dates");
const recreationalWorkshopRoutes = express.Router();

const { authenticateToken } = require("../utils/authenticateToken"); // Funcion para verificar el token
const { checkRole } = require("../middlewares/checkRole"); // Funcion para verificar el rol del usuario
const { USER_ROLES } = require("../utils/constants/user.roles");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('El archivo debe ser una imagen'), false);
    }
  }
});


// ! Ruta para crear un nuevo taller (SOLO ADMINISTRADOR DE EVENTO)
recreationalWorkshopRoutes.post(
  "/create",
  // Middleware para verificar el token
  authenticateToken,
  // Middleware para verificar el rol del usuario
  checkRole(USER_ROLES.EVENT_ADMIN),
  // Middleware para subir imagen
  upload.single("img"),
  (req, res, next) => {
    req.body.img = req.file?.filename;
    next();
  },
  // Middleware de validaciones
  requiredString("name", "El nombre del taller debe ser un texto y es obligatorio"),
  requiredString("description", "La descripcion del evento debe ser un texto y es obligatoria"),
  notRequiredString("img", "La imagen del taller es opcional"),
  requiredString("instructor", "El ponente del taller debe ser un texto y es obligatorio"),
  isNumber("limitQuota", "El limite de participantes debe ser un numero y es obligatorio"),
  isDate({
    field: "startDate",
    message: "La fecha de inicio del taller debe estar definida y debe seguir el formato DD/MM/AAAA hh:mm:ss"
  }),
  isDate({
    field: "endDate",
    message: "La fecha de fin del taller debe estar definida y debe seguir el formato DD/MM/AAAA hh:mm:ss"
  }),
  isAfterDate({
    field: "endDate",
    date: (req) => req.body.startDate
  }),
  // Controlador
  create
);

// ! Ruta para obtener todos los talleres (SOLO SUPER ADMINISTRADOR)
recreationalWorkshopRoutes.get("/all-workshops", getAllWorkshops);

// ! Ruta para actualizar los talleres (SOLO ADMINISTRADOR DE EVENTO)
recreationalWorkshopRoutes.put(
  "/update/:workshopId",
  authenticateToken, checkRole(USER_ROLES.EVENT_ADMIN),
  // Middleware para subir imagen
  upload.single("img"),
  (req, res, next) => {
    req.body.img = req.file?.filename;
    next();
  },
  // Middleware de validaciones
  notRequiredString("name", "El nombre del taller debe ser un texto y es obligatorio"),
  notRequiredString("description", "La descripcion del evento debe ser un texto y es obligatoria"),
  notRequiredString("img", "La imagen del taller debe ser un texto y es obligatoria"),
  notRequiredString("instructor", "El ponente del taller debe ser un texto y es obligatorio"),
  isNumber("limitQuota", "El limite de participantes debe ser un numero y es obligatorio", true),
  isDate({
    field: "startDate",
    message: "La fecha de inicio del taller debe estar definida y debe seguir el formato DD/MM/AAAA hh:mm:ss",
    isOptional: true
  }),
  isDate({
    field: "endDate",
    message: "La fecha de fin del taller debe estar definida y debe seguir el formato DD/MM/AAAA hh:mm:ss",
    isOptional: true
  }),
  isAfterDate({
    field: "endDate",
    date: (req) => req.body.startDate,
    isOptional: true
  }),
  // Controlador
  updateById
);

// ! Ruta para eliminar los talleres  (SOLO ADMINISTRADOR DE EVENTO)
recreationalWorkshopRoutes.delete("/delete/:workshopId", authenticateToken, checkRole(USER_ROLES.EVENT_ADMIN), deleteById);

// ! Ruta para obtener los talleres por administrador (SOLO ADMINISTRADOR DE EVENTO)
recreationalWorkshopRoutes.get("/admin", authenticateToken, checkRole(USER_ROLES.EVENT_ADMIN), getAllWorkshopsByAdmin);

// ! Ruta para obtener los talleres por evento (TODOS LOS USUARIOS)
recreationalWorkshopRoutes.get("/event/:eventId", getAllWorkshopsByEvent);

// Ruta para encontrar una imagen
recreationalWorkshopRoutes.get("/image", getImg);

// ! Ruta para obtener los talleres por supervisor (SOLO SUPERVISOR)
recreationalWorkshopRoutes.get("/supervisor", authenticateToken, checkRole(USER_ROLES.SUPERVISOR), getAllWorkshopsBySupervisor);

// ! Ruta para obtener los talleres por participante (SOLO PARTICIPANTE)
recreationalWorkshopRoutes.get("/participant", authenticateToken, checkRole(USER_ROLES.PARTICIPANT), getAllWorkshopsByParticipant);

// ! Ruta para inscribir a un participante (SOLO PARTICIPANTE, SUPERVISOR)
recreationalWorkshopRoutes.put(
  "/add-participant/:workshopId",
  authenticateToken,
  checkRole(USER_ROLES.PARTICIPANT, USER_ROLES.SUPERVISOR),
  addParticipantToWorkshop
);

// ! Ruta para agregar un supervisor a un taller (SOLO ADMINISTRADOR DE EVENTO)
recreationalWorkshopRoutes.put(
  "/add-supervisor/:workshopId/:supervisorId",
  authenticateToken,
  checkRole(USER_ROLES.EVENT_ADMIN),
  addSupervisorToWorkshop
);

// ! Funcion para registrar la asistencia de un participante en un taller (SOLO SUPERVISOR)
recreationalWorkshopRoutes.post("/participant", authenticateToken, checkRole(USER_ROLES.SUPERVISOR), registrateAssistance);

// ! Ruta para cancelar la inscripción a un taller (SOLO PARTICIPANTE)
recreationalWorkshopRoutes.delete(
  "/cancel-registration/:workshopId",
  authenticateToken,
  checkRole(USER_ROLES.PARTICIPANT, USER_ROLES.SUPERVISOR),
  cancelWorkshopRegistrationController
);

// Obtener talleres por supervisor y evento
recreationalWorkshopRoutes.get(
  "/by-supervisor/:eventId",
  authenticateToken,
  checkRole(USER_ROLES.SUPERVISOR),
  getWorkshopsBySupervisorAndEventController
);

// ! Ruta para eliminar un supervisor de un taller (SOLO ADMINISTRADOR DE EVENTO)
recreationalWorkshopRoutes.delete(
  "/remove-supervisor/:workshopId/:supervisorId",
  authenticateToken,
  checkRole(USER_ROLES.EVENT_ADMIN),
  removeSupervisorFromWorkshop
);

module.exports = recreationalWorkshopRoutes;