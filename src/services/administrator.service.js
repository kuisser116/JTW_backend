const { administratorModel, adminEventsDiscriminator } = require("../models/user/administrator/administrator.model");
const mongoose = require("mongoose");
const { DB_ERROR_CODES, DataBaseError} = require("../utils/errors/DataBase.error");

// Crear un nuevo administrador
const createAdministrator = async (administratorData) => {
  try {
    const newAdministrator = new administratorModel(administratorData);
    await newAdministrator.save();
    return newAdministrator;
  } catch (err) {
    console.log(err);
    let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
    let errorMsg = "Ha ocurrido un error al crear el administrador";

    if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
      const keyValue = Object.entries(err.keyValue);
      errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
      errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
    }
    throw new DataBaseError(errorMsg, errorCode);
  }
};

// Obtener todos los administradores
const getAdministrators = async () => {
  try {
    return await administratorModel.find();
  } catch (err) {
    throw new DataBaseError(
      "Error al obtener los administradores",
      DB_ERROR_CODES.UNKNOWN_ERROR
    );
  }
};

// Obtener administrador por ID
const getAdministratorById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new DataBaseError(
      "ID de administrador no válido",
      DB_ERROR_CODES.BAD_REQUEST
    );
  }
  const administrator = await administratorModel.findById(id);
  if (!administrator)
    throw new DataBaseError(
      "Administrador no encontrado",
      DB_ERROR_CODES.RESOURCE_NOT_FOUND
    );
  return administrator;
};

// Actualizar administrador
const updateAdministrator = async (id, administratorData) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new DataBaseError(
      "ID de administrador no válido",
      DB_ERROR_CODES.BAD_REQUEST
    );
  }
  const updatedAdministrator =
    await administratorModel.findByIdAndUpdate(id, administratorData, { new: true, runValidators: true }) ||
    await adminEventsDiscriminator.findByIdAndUpdate(id, administratorData, { new: true, runValidators: true });
  if (!updatedAdministrator)
    throw new DataBaseError(
      "No se encontró el administrador a actualizar",
      DB_ERROR_CODES.RESOURCE_NOT_FOUND
    );
  return updatedAdministrator;
};

// Eliminar administrador
const deleteAdministrator = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new DataBaseError(
      "ID de administrador no válido",
      DB_ERROR_CODES.BAD_REQUEST
    );
  }
  const deletedAdministrator = await administratorModel.findByIdAndDelete(id);
  if (!deletedAdministrator)
    throw new DataBaseError(
      "No se encontró el administrador a eliminar",
      DB_ERROR_CODES.RESOURCE_NOT_FOUND
    );
  return deletedAdministrator;
}

module.exports = {createAdministrator, getAdministrators, getAdministratorById, updateAdministrator, deleteAdministrator};