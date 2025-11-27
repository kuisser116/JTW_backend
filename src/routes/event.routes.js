const express = require("express");
const eventRoutes = express.Router();
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
  storage
});

// Metodos del controlador de eventos
const {
  registerToEvent,
  registerNewEvent,
  getAllEvents,
  getAllEventsByAdmin,
  getById,
  deleteById,
  updateById,
  addSuperVisor,
  getAllEventsBySupervisor,
  addWorkshopEvent,
  getByName,
  getImg,
  registrateAssistance,
  registerAssistanceByQRFolioController,
  cancelEventRegistrationController,
  getParticipantsByEventController
} = require("../controllers/event.controller");
const { requiredString, notRequiredString } = require("../validators/strings");
const { isIn } = require("../validators/enums");
const { isDate, isAfterDate } = require("../validators/dates");
const { minLength } = require("../validators/arrays");
const { userValidationsRequired } = require("../middlewares/user.validations");
const { authenticateToken } = require("../utils/authenticateToken"); // Funcion para verificar el token
const { checkRole } = require("../middlewares/checkRole"); // Funcion para verificar el rol del usuario
const { USER_ROLES } = require("../utils/constants/user.roles");

// Funcion para registar un nuevo participante a un evento
eventRoutes.post(
  "/inscription/:eventId",
  // Middlewares de validaiones
  userValidationsRequired,
  notRequiredString("eventAwarness", "Este campo debe ser un texto"),
  notRequiredString("livingState", "Este campo debe ser un texto"),
  notRequiredString("gender", "El genero debe ser texto"),
  isDate({
    field: "birthday",
    message: "La fecha debe de tener el formato: dd-MM-YYYY",
    isOptional: true
  }),
  notRequiredString(["profession", "workplace"], "Estos datos deben ser texto"),
  // Controlador
  registerToEvent
);

// Ruta LIGERA solo para Google
eventRoutes.post(
  "/inscription/google/:eventId",
  // Quitamos userValidationsRequired porque Google ya validó al usuario
  // Dejamos solo los validadores opcionales por si acaso
  notRequiredString("profession", "Este dato es opcional"),
  // Controlador
  registerToEvent
);

// ! Funcion para crear un evento nuevo, a esta funcion solo acceden los superAdmins; FALTA VALIDAR LA FUNCION (SOLO ADMINISTRADOR DE EVENTO)
// ? El id del administrador debe venir desde el JWT
eventRoutes.post(
  "/create",
  // Middleware para verificar el token
  authenticateToken,
  // Middleware para verificar el rol del usuario
  checkRole(USER_ROLES.EVENT_ADMIN),
  // Middleware para subir imagenes
  upload.fields([{ name: "mainImg", maxCount: 1 }, { name: "bannerImgs" }]),
  (req, res, next) => {
    const files = req.files;
    req.body.mainImg = files?.mainImg?.[0]?.filename;
    req.body.bannerImgs = files?.bannerImgs?.map(file => file.filename);
    next();
  },
  // Middlewares de validaiones
  requiredString("mainImg", "La imagen principal es requerida"),
  requiredString("name", "El nombre es requerido"),
  requiredString("description", "La descripcion es requerida"),
  minLength({
    fields: "bannerImgs",
    min: 3,
    message: "Inserta minimo 3 imagenes"
  }),
  isDate({
    field: "startDate",
    message: "La fecha de inicio es requerida y debe tener un formato DD/MM/AAAA hh:mm:ss",
    isOptional: true
  }),
  isDate({
    field: "endDate",
    message: "La fecha de fin es requerida y debe tener un formato DD/MM/AAAA hh:mm:ss",
    isOptional: true
  }),
  isAfterDate({
    field: "endDate",
    date: (req) => req.body.startDate,
    isOptional: true
  }),
  // Controlador
  registerNewEvent
);

// ! Funcion para obtener todos los eventos, a esta funcion solo acceden los superAdmins; FALTA VALIDAR EL ROL DEL USUARIO (SOLO SUPER USUARIO Y PARTICIPANTE)
eventRoutes.get("/all-events", getAllEvents);

// ! Realizar funcion para obtener los eventos por administrador; FALTA VALIDAR EL ROL DEL USUARIO (SOLO ADMINISTRADOR DE EVENTO)
eventRoutes.get("/admin", authenticateToken, checkRole(USER_ROLES.EVENT_ADMIN), getAllEventsByAdmin);

// ! Funcion para eliminar un evento mediante el ID, los administradores deben poder eliminar solo eventos registrados a su nombre; FALTA VALIDAR EL ROL DEL USUARIO (SOLO ADMINISTRADOR DE EVENTO)
eventRoutes.delete("/delete/:eventId", authenticateToken, checkRole(USER_ROLES.EVENT_ADMIN), deleteById);

// ! Funcion para buscar un evento por titulo; FALTA VALIDAR EL ROL DEL USUARIO (SOLO PARTICIPANTE)
eventRoutes.get("/get-by-name", authenticateToken, checkRole(USER_ROLES.PARTICIPANT), getByName);

// Ruta para encontrar una imagen
eventRoutes.get("/image", getImg);

// ! Funcion para obtener un evento mediante el ID; FALTA VALIDAR EL ROL DEL USUARIO (SOLO SUPER ADMINISTRADOR Y PARTICIPANTE)
eventRoutes.get("/:eventId", getById);

// ! Funcion para actualizar un evento mediante el ID, solo los administradores de dicho evento realizan esta accion; FALTA VALIDAR EL ROL DEL USUARIO (SOLO ADMINISTRADOR DE EVENTO)
eventRoutes.put(
  "/update/:eventId",
  authenticateToken,
  checkRole(USER_ROLES.EVENT_ADMIN),
  // Middleware para subir imagenes
  upload.fields([{ name: "mainImg", maxCount: 1 }, { name: "bannerImgs" }]),
  (req, res, next) => {
    const files = req.files;
    req.body.mainImg = files?.mainImg?.[0]?.filename;
    req.body.bannerImgs = files?.bannerImgs?.map(file => file.filename);
    next();
  },
  // Middlewares de validaiones
  notRequiredString("mainImg", "La imagen principal es requerida"),
  notRequiredString("name", "El nombre es requerido"),
  notRequiredString("description", "La descripcion es requerida"),
  minLength({
    fields: "bannerImgs",
    min: 3,
    message: "Inserta minimo 3 imagenes",
    isOptional: true
  }),
  isDate({
    field: "startDate",
    message: "La fecha de inicio debe tener un formato DD/MM/AAAA hh:mm:ss",
    isOptional: true
  }),
  isDate({
    field: "endDate",
    message: "La fecha de fin debe tener un formato DD/MM/AAAA hh:mm:ss",
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

// ! Funcion para agregar checadores a eventos; FALTA VALIDAR EL ROL DEL USUARIO (SOLO ADMINISTRADOR DE EVENTO)
eventRoutes.put("/add-supervisor", authenticateToken, checkRole(USER_ROLES.EVENT_ADMIN), addSuperVisor);

// ! Funcion para obtener los eventos por supervisor (checador); FALTA VALIDAR EL ROL DEL USUARIO (SOLO SUPER ADMINISTRADOR Y PARTICIPANTE)
// ? El id del supervisor debe venir desde el JWT
eventRoutes.get("/supervisor/events", authenticateToken, checkRole(USER_ROLES.SUPER_ADMIN, USER_ROLES.PARTICIPANT, USER_ROLES.SUPERVISOR), getAllEventsBySupervisor);

// !Funcion para agregar un taller a un evento; FALTA VALIDAR EL ROL DEL USUARIO (SOLO ADMINISTRADOR DE EVENTO)
eventRoutes.put(
  "/workshop/",
  authenticateToken,
  checkRole(USER_ROLES.EVENT_ADMIN),
  // Middleware de validaciones para las fechas
  isDate({
    field: "startDate",
    message: "La fecha de inicio debe tener un formato DD/MM/AAAA hh:mm:ss"
  }),
  isDate({
    field: "endDate",
    message: "La fecha de fin debe tener un formato DD/MM/AAAA hh:mm:ss",
    isOptional: true
  }),
  isAfterDate({
    field: "endDate",
    date: (req) => req.body.startDate,
    isOptional: true
  }),
  // Controlador
  addWorkshopEvent
);

// Funcion para registrar la asistencia de un participante en un evento mediante el QR (SOLO SUPERVISOR)
eventRoutes.post("/participant", authenticateToken, checkRole(USER_ROLES.SUPERVISOR), registrateAssistance);

// Funcion para registrar la asistencia de un participante en un evento usando el folio del QR (SOLO SUPERVISOR)
eventRoutes.post("/assistance/qr", authenticateToken, checkRole(USER_ROLES.SUPERVISOR), registerAssistanceByQRFolioController);

// Funcion para cancelar la inscripción a un evento (SOLO PARTICIPANTE)
eventRoutes.delete("/cancel-registration/:eventId", authenticateToken, checkRole(USER_ROLES.PARTICIPANT), cancelEventRegistrationController);

// Get all participants by event ID (ONLY EVENT ADMIN AND SUPERVISOR)
// Obtener todos los participantes por ID de evento (SOLO ADMIN DE EVENTO Y SUPERVISOR)
eventRoutes.get(
  "/participants/:eventId",
  authenticateToken,
  checkRole(USER_ROLES.EVENT_ADMIN, USER_ROLES.SUPERVISOR),
  getParticipantsByEventController
);

module.exports = eventRoutes;