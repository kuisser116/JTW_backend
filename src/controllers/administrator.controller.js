const {createAdministrator, getAdministrators, getAdministratorById, updateAdministrator, deleteAdministrator} = require('../services/administrator.service');
const { clientDataValidation } = require('../utils/client.data.validation');
const bcrypt = require("bcrypt");
const { DB_ERROR_CODES } = require('../utils/errors/DataBase.error');
const { DataBaseError } = require('../utils/errors/DataBase.error');

// Crear un nuevo administrador
const create = async (req, res) => {
  try {
    const newAdministrator = await createAdministrator(req.body);
    return res.status(201).json({ data: newAdministrator });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};

// Obtener todos los administradores
const getAll = async (req, res) => {
  try {
    const administrators = await getAdministrators();
    return res.status(200).json({ data: administrators });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};

// Obtener administrador por ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ data: "Especifica el ID del administrador" });

    const administrator = await getAdministratorById(id);
    return res.status(200).json({ data: administrator });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};

// Actualizar administrador
const update = async (req, res) => {
  try {

    const result = clientDataValidation(req);
    if(result.status === 400) return res.status(result.status).json(result);

    const { id } = req.params;
    if (!id) return res.status(400).json({ data: "Especifica el ID del administrador" });

    if(req.body.password) {
      // Hashear la contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

      req.body.password = hashedPassword;
    }

    const updatedAdministrator = await updateAdministrator(id, req.body);
    return res.status(200).json({ data: updatedAdministrator });
  } catch (err) {
    console.log(err);
    let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
    let errorMsg = "Ha ocurrido un error al registrar el administrador";

    if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
      const keyValue = Object.entries(err.keyValue);
      errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
      errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
    }
    return res.status(500).json({ data: errorMsg, status: errorCode });
  }
};

// Eliminar administrador
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ data: "Especifica el ID del administrador" });

    const deletedAdministrator = await deleteAdministrator(id);
    return res.status(200).json({ data: deletedAdministrator });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};

module.exports = { create, getAll, getById, update, remove };