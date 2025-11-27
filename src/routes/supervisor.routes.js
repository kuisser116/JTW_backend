const express = require("express");
const router = express.Router();
const supervisorController = require("../controllers/supervisor.controller");
const {
  userValidationsOptionals,
  userValidationsRequired,
} = require("../middlewares/user.validations");
const { authenticateToken } = require("../utils/authenticateToken");//Funcion para verificar el token
const { checkRole } = require("../middlewares/checkRole");//Funcion para verificar el rol del usuario
const { USER_ROLES } = require("../utils/constants/user.roles");
const { getSupervisorsByAdministratorController } = require("../controllers/supervisor.controller");

/*RUTAS DEL CHECADOR PROTEGIDAS*/
router.get("/",authenticateToken,checkRole(USER_ROLES.EVENT_ADMIN),supervisorController.getAll);

router.post("/",authenticateToken,checkRole(USER_ROLES.EVENT_ADMIN),userValidationsRequired,supervisorController.create);

// Ruta para obtener los supervisores de un administrador de eventos
router.get("/by-administrator", authenticateToken, checkRole(USER_ROLES.EVENT_ADMIN), getSupervisorsByAdministratorController);

router.get("/:id",authenticateToken,checkRole(USER_ROLES.EVENT_ADMIN),supervisorController.getById);

router.put("/:id",authenticateToken,checkRole(USER_ROLES.EVENT_ADMIN, USER_ROLES.SUPERVISOR),userValidationsOptionals,supervisorController.update);

router.delete("/:id",authenticateToken,checkRole(USER_ROLES.EVENT_ADMIN),supervisorController.remove);

module.exports = router;
