const express = require("express");
const router = express.Router();
const administartorController = require("../controllers/administrator.controller");
const { userValidationsOptionals } = require("../middlewares/user.validations");
const { authenticateToken } = require("../utils/authenticateToken");//Funcion para verificar el token
const { checkRole } = require("../middlewares/checkRole");//Funcion para verificar el rol del usuario

/*RUTAS PROTEGIDAS*/
router.get( "/", administartorController.getAll);

// router.post('/', administartorController.create);

router.get("/:id",authenticateToken,checkRole("SuperAdmin"), administartorController.getById);

router.put("/:id",authenticateToken,checkRole("SuperAdmin", "EventAdmin"),userValidationsOptionals, administartorController.update);

router.delete("/:id",authenticateToken,checkRole("SuperAdmin", "EventAdmin"), administartorController.remove);

module.exports = router;
