const { supervisorModel } = require("../models/user/supervisor/supervisor.model");
const { DB_ERROR_CODES, DataBaseError } = require("../utils/errors/DataBase.error");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { adminEventsDiscriminator } = require("../models/user/administrator/administrator.model");

// Crear un nuevo supervisor
const createSupervisor = async (supervisorData, administratorId) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Buscar al administrador
    const administrator = await adminEventsDiscriminator.findById(administratorId);
    if (!administrator) {
      throw new DataBaseError("No se encontró el administrador", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(supervisorData.email, saltRounds);
    supervisorData.password = hashedPassword;

    // Crear el supervisor
    const supervisor = new supervisorModel({
      ...supervisorData,
      administrator: administratorId
    });

    await supervisor.save({ session });

    // Agregar el supervisor al array de supervisores del administrador
    administrator.supervisors.push(supervisor._id);
    administrator.markModified("supervisors");
    await administrator.save({ session });

    await session.commitTransaction();
    return supervisor;
  } catch (err) {
    await session.abortTransaction();
    console.log(err);
    let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
    let errorMsg = "Ha ocurrido un error al crear el supervisor";
    if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
      errorMsg = "El supervisor ya existe";
      const keyValue = Object.entries(err.keyValue);
      errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
      errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
    }
    throw new DataBaseError(errorMsg, errorCode);
  } finally {
    await session.endSession();
  }
};

// Obtener todos los supervisores
const getSupervisors = async () => {
  try {
    return await supervisorModel.find();
  } catch (err) {
    throw new DataBaseError(
      "Error al obtener los supervisores",
      DB_ERROR_CODES.UNKNOWN_ERROR
    );
  }
};

// Obtener supervisor por ID
const getSupervisorById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new DataBaseError(
      "ID de supervisor no válido",
      DB_ERROR_CODES.BAD_REQUEST
    );
  }
  const supervisor = await supervisorModel.findById(id);
  if (!supervisor)
    throw new DataBaseError(
      "Supervisor no encontrado",
      DB_ERROR_CODES.RESOURCE_NOT_FOUND
    );
  return supervisor;
};

/// ... existing code ...

// Actualizar supervisor
const updateSupervisor = async (id, supervisorData) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new DataBaseError(
      "ID de supervisor no válido",
      DB_ERROR_CODES.BAD_REQUEST
    );
  }
  
  // Permitimos actualizar cellphoneNumber, password, status, events y workshops
  const updateFields = {};
  if (supervisorData.cellphoneNumber !== undefined) {
    updateFields.cellphoneNumber = supervisorData.cellphoneNumber;
  }
  if (supervisorData.password !== undefined) {
    updateFields.password = supervisorData.password;
  }
  if (supervisorData.hasOwnProperty('status')) {
    updateFields.status = supervisorData.status;
  }
  if (supervisorData.events !== undefined) {
    // Verificar que todos los IDs de eventos sean válidos
    const validEvents = supervisorData.events.every(eventId => 
      mongoose.isValidObjectId(eventId)
    );
    if (!validEvents) {
      throw new DataBaseError(
        "Uno o más IDs de eventos no son válidos",
        DB_ERROR_CODES.BAD_REQUEST
      );
    }
    updateFields.events = supervisorData.events;
  }
  if (supervisorData.workshops !== undefined) {
    // Verificar que todos los IDs de talleres sean válidos
    const validWorkshops = supervisorData.workshops.every(workshopId => 
      mongoose.isValidObjectId(workshopId)
    );
    if (!validWorkshops) {
      throw new DataBaseError(
        "Uno o más IDs de talleres no son válidos",
        DB_ERROR_CODES.BAD_REQUEST
      );
    }
    updateFields.workshops = supervisorData.workshops;
  }
  
  const updatedSupervisor = await supervisorModel.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  );
  
  if (!updatedSupervisor)
    throw new DataBaseError(
      "No se pudo actualizar el supervisor",
      DB_ERROR_CODES.RESOURCE_NOT_FOUND
    );
  
  return updatedSupervisor;
};

// ... existing code ...

// Eliminar supervisor
const deleteSupervisor = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new DataBaseError(
      "ID de supervisor no válido",
      DB_ERROR_CODES.RESOURCE_BAD_REQUEST
    );
  }
  const deletedSupervisor = await supervisorModel.findByIdAndDelete(id);
  if (!deletedSupervisor)
    throw new DataBaseError(
      "No se pudo eliminar el supervisor",
      DB_ERROR_CODES.RESOURCE_NOT_FOUND
    );
  return deletedSupervisor;
};

const getSupervisorsByAdministrator = async (administratorId) => {
  const administrator = await adminEventsDiscriminator.findById(administratorId);
  if (!administrator) {
    throw new DataBaseError("No se encontró el administrador", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const supervisors = await supervisorModel.find({ administrator: administratorId });
  return supervisors;
};

module.exports = { createSupervisor, getSupervisors, getSupervisorById, updateSupervisor, deleteSupervisor, getSupervisorsByAdministrator };
