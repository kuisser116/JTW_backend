const {
  registerUserToEvent,
  createEvent, getEvents,
  getEventsByAdmin,
  getEventById,
  deleteEventById,
  updateEventById,
  addSupervisorToEvent,
  getEventsBySupervisor,
  addWorkshopToEvent,
  getEventsByName,
  assistanceRegistration,
  registerAssistanceByQRFolio,
  cancelEventRegistration,
  getParticipantsByEvent
} = require("../services/event.service");
const { generateQRBase64URI } = require("../utils/QRGenerator/QRGenerator");
const { QR_GENERATOR_ERROR_CODES, QRGeneratorError } = require("../utils/errors/QRGenerator.error");
const { clientDataValidation } = require("../utils/client.data.validation");
const { saveEventInParticipant } = require("../services/participant.service");
const path = require("path");
const { existsSync } = require("fs");
const { DB_ERROR_CODES, DataBaseError } = require("../utils/errors/DataBase.error");
const { participantModel } = require("../models/user/participant/participant.model");
const { eventModel } = require("../models/event/event.model");

// ! Ruta solo accesible para usuarios con rol de Participant
const registerToEvent = async (req, res) => {

  const result = clientDataValidation(req);
  if(result.status === 400) return res.status(result.status).json(result);

  try {
    const { eventId } = req.params;

    if (!eventId) return res.status(400).json({ data: "Especifica el id del evento al que te quieres inscribir" });

    const { success, data } = await registerUserToEvent(req.body, eventId);

    if(success) {
      try {
        const { dataURL, folio } = await generateQRBase64URI(JSON.stringify({ userId: data.participant._id, eventId: data.event._id }));

        await saveEventInParticipant(data.participant._id, { qrRepresentation: dataURL, folio, eventName: data.event.name, eventId: data.event._id });

        return res.status(200).json({ data: "Usuario registrado con exito en el evento", dataURL, folio });
      } catch (err) {
        console.log(err);
        throw new QRGeneratorError("No se ha podido generar el codigo QR", QR_GENERATOR_ERROR_CODES.ERROR_GENERATING_CODE);
      }
    }

    return res.status(200).json({ data: "Se ha registrado un nuevo participante al evento", QR_URI });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const registerNewEvent = async (req, res) => {
  const result = clientDataValidation(req);
  if (result.status === 400) return res.status(result.status).json(result);

  const { userId } = req.user;

  try {
    // Validar y convertir recreationalWorkshops si es un string
    if (typeof req.body.recreationalWorkshops === "string") {
      try {
        req.body.recreationalWorkshops = JSON.parse(req.body.recreationalWorkshops);
      } catch (error) {
        return res.status(400).json({ data: "Formato inválido para recreationalWorkshops", status: 400 });
      }
    }

    const newEvent = await createEvent(req.body, userId);
    return res.status(201).json({ data: "Evento creado con éxito", newEvent });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};


const getAllEvents = async (req, res) => {
  try {
    return res.status(200).json({ data: await getEvents() });
  } catch (err) {
    console.log(err);
    res.status(500).json({ data: "Hubo un errror" });
  }
}

const getAllEventsByAdmin = async (req, res) => {
  try {
    const { userId } = req.user;
    const data = await getEventsByAdmin(userId);
    return res.status(200).json({ data });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const data = await getEventById(eventId);
    return res.status(200).json({ data });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const deleteById = async (req, res) => {
  try {
    const { eventId } = req.params;
    await deleteEventById(eventId);
    return res.status(200).json({ data: "Evento eliminado" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const updateById = async (req, res) => {

  const result = clientDataValidation(req);
  if(result.status === 400) return res.status(result.status).json(result);

  try {
    const { eventId } = req.params;
    const data = await updateEventById(eventId, req.body);
    return res.status(200).json({ data });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const addSuperVisor = async (req, res) => {
  const { supervisorId, eventId } = req.query;

  try {
    const data = await addSupervisorToEvent(supervisorId, eventId);
    return res.status(200).json({ data });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getAllEventsBySupervisor = async (req, res) => {

  const { userId } = req.user;

  try {
    const events = await getEventsBySupervisor(userId);
    return res.status(200).json({ data: events });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const addWorkshopEvent = async (req, res) => {
  const { workshopId, eventId } = req.query;
  const schedule = req.body;

  try {
    const data = await addWorkshopToEvent(workshopId, eventId, schedule);
    return res.status(201).json({ data });
  } catch (err) {
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getByName = async (req, res) => {
  const { name } = req.query;
  const events = await getEventsByName(name);
  return res.status(200).json({ data: events });
}

const absPathForImages = path.join(__dirname, "../../uploads/images");
const getImg = async (req, res) => {
  const { filename } = req.query;
  const filePath = path.join(absPathForImages, filename);

  if(existsSync(filePath)) {
    return res.status(200).sendFile(filePath);
  } else {
    return res.status(400).json({ data: "Imagen no encontrada", status: DB_ERROR_CODES.RESOURCE_NOT_FOUND });
  }
}

const registrateAssistance = async (req, res) => {
  const { eventId, participantId } = req.query;
  console.log(req.query);
  try {
    const isRegistered = await assistanceRegistration(eventId, participantId);
    if(isRegistered) return res.status(201).json({ data: "Asistencia registrada" });
    return res.status(400).json({ data: "No se ha podido registrar la asistencia" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

// Registrar asistencia usando el folio del QR
const registerAssistanceByQRFolioController = async (req, res) => {
  try {
    const { folio } = req.query;

    if(!folio) return res.status(400).send({ data: "El folio es requerido", status: 400 });

    const result = await registerAssistanceByQRFolio(folio);
    return res.status(200).json({
      data: "Asistencia registrada correctamente",
      participant: result.participantName,
      event: result.eventName
    });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
}

// Cancelar inscripción a un evento
const cancelEventRegistrationController = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.user;

    if(!eventId) return res.status(400).send({ data: "El ID del evento es requerido", status: 400 });
    if(!userId) return res.status(400).send({ data: "El ID del participante es requerido", status: 400 });

    await cancelEventRegistration(userId, eventId);
    return res.status(200).json({ data: "Inscripción cancelada correctamente" });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
}

const getParticipantsByEventController = async (req, res) => {
  try {
    const { eventId } = req.params;
    const participants = await getParticipantsByEvent(eventId);
    return res.status(200).json({ data: participants });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

module.exports = {
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
}