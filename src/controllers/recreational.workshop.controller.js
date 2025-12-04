const {
  createWorkshop,
  getWorkshops,
  updateWorkshopById,
  deleteWorkshopById,
  getWorkshopsByAdmin,
  getWorkshopsByEvent,
  getWorkshopsBySupervisor,
  getWorkshopsByParticipant,
  addSupervisor,
  addParticipant,
  assistanceRegistration,
  cancelWorkshopRegistration,
  getWorkshopsBySupervisorAndEvent,
  removeSupervisor
} = require("../services/recreational.workshop.service");
const { clientDataValidation } = require("../utils/client.data.validation");
const { DB_ERROR_CODES } = require("../utils/errors/DataBase.error");
const { USER_ROLES } = require("../utils/constants/user.roles");
const path = require("path");
const { existsSync } = require("fs");

const absPathForImages = path.join(__dirname, "../../uploads/images");

const getImg = async (req, res) => {
  const { filename } = req.query;
  const filePath = path.join(absPathForImages, filename);

  if (existsSync(filePath)) {
    return res.status(200).sendFile(filePath);
  } else {
    return res.status(400).json({ data: "Imagen no encontrada", status: DB_ERROR_CODES.RESOURCE_NOT_FOUND });
  }
}

// --- FUNCIÓN CORREGIDA ---
const create = async (req, res) => {
  
  // 1. Asignar la imagen si existe
  if (req.file) {
    req.body.img = req.file.filename;
  } else {
    // Si el modelo requiere imagen obligatoriamente, devolvemos error si no se subió
    return res.status(400).json({ data: "La imagen es obligatoria", status: 400 });
  }

  const result = clientDataValidation(req);
  if (result.status === 400) return res.status(result.status).json(result);

  const { userId } = req.user;
  try {
    const createdWorkshop = await createWorkshop(req.body, userId);
    return res.status(201).json({ data: "Taller creado con éxito", createdWorkshop });
  } catch (err) {
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getAllWorkshops = async (req, res) => {
  try {
    const workshops = await getWorkshops();
    return res.status(200).json({ data: workshops });
  } catch (error) {
    return res.status(500).json({ data: "Hubo un errror" });
  }
}

const updateById = async (req, res) => {

  // Si se sube una nueva imagen al actualizar, la asignamos
  if (req.file) {
    req.body.img = req.file.filename;
  }

  const result = clientDataValidation(req);
  if (result.status === 400) return res.status(result.status).json(result);

  try {
    const { workshopId } = req.params;
    const workshopUpdated = await updateWorkshopById(workshopId, req.body);
    return res.status(200).json({ data: "Taller modificado con exito", workshopUpdated });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const deleteById = async (req, res) => {
  const { workshopId } = req.params;
  try {
    const workshopDeleted = await deleteWorkshopById(workshopId);
    return res.status(200).json({ data: "Taller eliminado con exito", workshopDeleted });
  } catch (err) {
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getAllWorkshopsByAdmin = async (req, res) => {
  const { userId } = req.userId;

  try {
    const workshops = await getWorkshopsByAdmin(userId);
    return res.status(200).json({ data: workshops });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getAllWorkshopsByEvent = async (req, res) => {
  const { eventId } = req.params;
  try {
    const workshops = await getWorkshopsByEvent(eventId);
    return res.status(200).json({ data: workshops });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getAllWorkshopsBySupervisor = async (req, res) => {
  const { userId } = req.user;
  try {
    const workshops = await getWorkshopsBySupervisor(userId);
    return res.status(200).json({ data: workshops });
  } catch (err) {
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getAllWorkshopsByParticipant = async (req, res) => {
  const { userId } = req.user;
  try {
    const workshops = await getWorkshopsByParticipant(userId);
    return res.status(200).json({ data: workshops });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const addSupervisorToWorkshop = async (req, res) => {
  const { workshopId, supervisorId } = req.params;

  try {
    const workshopUpdated = await addSupervisor(workshopId, supervisorId);
    return res.status(201).json({ data: "Supervisor agregado con exito", workshopUpdated });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const addParticipantToWorkshop = async (req, res) => {
  const { workshopId } = req.params;
  const { role } = req.user;
  let { userId } = req.user;

  if (role === USER_ROLES.SUPERVISOR) {
    userId = req.body.userId;
  }

  try {
    const workshopUpdated = await addParticipant(workshopId, userId);
    return res.status(201).json({ data: "Participante agregado con exito al taller", workshopUpdated });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const registrateAssistance = async (req, res) => {
  const { folio } = req.query;

  try {
    const isRegistered = await assistanceRegistration(folio);
    if (isRegistered) return res.status(201).json({ data: "Asistencia registrada" });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ data: err.message, status: err.errorCode });
  }
  return res.status(400).json({ data: "No se ha podido registrar la asistencia", status: DB_ERROR_CODES.UNKNOWN_ERROR });
}

const cancelWorkshopRegistrationController = async (req, res) => {
  try {
    const { workshopId } = req.params;
    const { userId } = req.user;

    if (!workshopId) return res.status(400).send({ data: "El ID del taller es requerido", status: 400 });
    if (!userId) return res.status(400).send({ data: "El ID del participante es requerido", status: 400 });

    await cancelWorkshopRegistration(userId, workshopId);
    return res.status(200).json({ data: "Inscripción al taller cancelada correctamente" });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
}

const getWorkshopsBySupervisorAndEventController = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.user; // Obtener el ID del supervisor del JWT

    if (!eventId) {
      return res.status(400).json({
        data: "Se requiere el ID del evento",
        status: 400
      });
    }

    const workshops = await getWorkshopsBySupervisorAndEvent(userId, eventId);
    return res.status(200).json({ data: workshops });
  } catch (error) {
    console.error("Error en getWorkshopsBySupervisorAndEventController:", error);
    const { errorCode, message } = error;
    return res.status(500).json({
      data: message,
      status: errorCode
    });
  }
};

const removeSupervisorFromWorkshop = async (req, res) => {
  const { workshopId, supervisorId } = req.params;

  try {
    const workshopUpdated = await removeSupervisor(workshopId, supervisorId);
    return res.status(200).json({ data: "Supervisor eliminado con éxito", workshopUpdated });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};

module.exports = {
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
};