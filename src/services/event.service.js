const { participantModel } = require("../models/user/participant/participant.model");
const { eventModel } = require("../models/event/event.model");
const { adminEventsDiscriminator } = require("../models/user/administrator/administrator.model");
const { DB_ERROR_CODES, DataBaseError } = require("../utils/errors/DataBase.error");
const { supervisorModel } = require("../models/user/supervisor/supervisor.model");
const mongoose = require("mongoose");
const { recreationalWorkshopModel } = require("../models/recreational.workshops/recreational.workshops.model");
const { formattDate } = require("../validators/dates");
const bcrypt = require("bcrypt");

const registerUserToEvent = async (user, eventId) => {
  const {
    name, lastname,
    gender, birthday,
    email, eventAwarness,
    livingState, profession,
    workPlace, password
  } = user;

  try {
    // Buscar si el evento esta registrado
    const eventFound = await eventModel.findOne({ _id: eventId });
    if (!eventFound) throw new DataBaseError("El evento no existe", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Buscar si el participante ya existe
    let userFound = await participantModel.findOne({ email });

    if (!userFound) {
      // Si no existe, crearlo
      // Generar contraseña si no viene (caso Google)
      const passwordToSave = password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(passwordToSave, 10);

      const newParticipant = new participantModel({
        name,
        lastname,
        email,
        password: hashedPassword,
        role: "Participant",
        gender: gender || "Sin especificar",
        birthday: birthday || null,
        eventAwarness: eventAwarness || "Google",
        livingState: livingState || "Sin especificar",
        profession: profession || "N/A",
        workPlace: workPlace || "N/A",
        events: [eventFound._id], // Inscribir directamente al evento
        workshops: [],
        QRs: []
      });

      userFound = await newParticipant.save();
    } else {
      // Si ya existe, verificar si ya está inscrito
      const isAlreadyRegistered = userFound.events.some(e => e.equals(eventFound._id));
      if (isAlreadyRegistered) {
        throw new DataBaseError("El usuario ya está registrado en este evento", DB_ERROR_CODES.DUPLICATED_CONTENT);
      }

      // Inscribir al evento
      await userFound.updateOne({ $addToSet: { events: eventFound._id } });
    }

    // Agregar el participante a la lista de participantes del evento
    await eventFound.updateOne({
      $addToSet: {
        participants: {
          userId: userFound._id,
          assist: false
        }
      }
    });

    return { success: true, data: { participant: userFound, event: eventFound } };

  } catch (error) {
    throw error;
  }
}

// --- FUNCIÓN CORREGIDA (Sin Transacción) ---
const createEvent = async (event, adminId) => {
  const newEvent = new eventModel(event);

  // Buscar el administrador en la base de datos
  const adminFound = await adminEventsDiscriminator.findById(adminId);

  if (!adminFound) throw new DataBaseError("El administrador no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  try {
    const eventStored = await newEvent.save();

    // Agregar el id del administrador al arreglo `administrators` del evento
    const eventResult = await eventStored.updateOne({ $addToSet: { administrators: adminId } });

    // Nota: modifiedCount puede ser 0 si ya estaba, pero aquí acabamos de crear el evento, así que raramente pasará.
    // if (eventResult.modifiedCount === 0) ... 

    await adminFound.updateOne({ $addToSet: { events: eventStored._id } });

    return eventStored;
  } catch (err) {

    console.log(err);

    if (err instanceof DataBaseError) throw err;

    let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
    let errorMsg = "Ha ocurrido un error al intentar crear el evento";

    if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
      const keyValue = Object.entries(err.keyValue);
      errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
      errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
    }
    throw new DataBaseError(errorMsg, errorCode);
  }
}

const getEvents = async () => {
  try {
    const events = await eventModel.find().lean();
    return events;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
}

const getEventsByAdmin = async (userId) => {
  const admin = await adminEventsDiscriminator.findById(userId, { events: 1 });
  if (!admin) throw new DataBaseError("El administrador no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  const events = (await admin.populate("events")).events;
  return events;
}

const getEventById = async (eventId) => {
  const event = await eventModel.findById(eventId);
  if (!event) throw new DataBaseError("El evento no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  return event;
}

const deleteEventById = async (eventId) => {
  const eventDeleted = await eventModel.findByIdAndDelete(eventId);
  if (!eventDeleted) throw new DataBaseError("No se ha encontrado este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  return eventDeleted;
}

const updateEventById = async (eventId, eventProps) => {
  try {

    const eventFound = await eventModel.findById(eventId);
    if (!eventFound) throw new DataBaseError("No se ha encontrado este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Validar en caso de que se quiera modificar las fechas. La fecha de inicio debe ser anterior a la fecha fin
    if (eventProps?.startDate || eventProps?.endDate) {
      const startDateFormatted = formattDate(eventProps?.startDate || eventFound?.startDate);
      const endDateFormatted = formattDate(eventProps?.endDate || eventFound?.endDate);

      if (new Date(startDateFormatted) >= new Date(endDateFormatted)) {
        throw new DataBaseError(
          `La fecha de inicio debe ser anterior a la fecha de fin. fecha de inicio: ${startDateFormatted}, fecha fin: ${endDateFormatted}`,
          DB_ERROR_CODES.BAD_REQUEST
        );
      }
    }

    const eventUpdated = await eventModel.findOneAndUpdate({ _id: eventId }, eventProps, { runValidators: true });
    if (!eventUpdated) throw new DataBaseError("No se ha encontrado este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    return eventUpdated;
  } catch (err) {
    if (err instanceof DataBaseError) throw new DataBaseError(err.message, err.errorCode);

    console.log(err);
    let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
    let errorMsg = "Ha ocurrido un error al actualizar este evento";

    if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
      const keyValue = Object.entries(err.keyValue);
      errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
      errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
    }
    throw new DataBaseError(errorMsg, errorCode);
  }
}

const addSupervisorToEvent = async (supervisorId, eventId) => {
  const event = await eventModel.findById(eventId);

  if (!event) throw new DataBaseError("El evento no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  // Agregar el supervisor al arreglo `supervisors` del evento
  const data = await event.updateOne({ $addToSet: { supervisors: supervisorId } });
  if (data.modifiedCount === 0) throw new DataBaseError("Ya hay un registro con este valor en el campo supervisores", DB_ERROR_CODES.DUPLICATED_CONTENT);

  // Agregar el evento al arreglo `events` del supervisor
  const supervisor = await supervisorModel.findById(supervisorId);
  if (!supervisor) throw new DataBaseError("No se ha encontrado este supervisor", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  const supervisorData = await supervisor.updateOne({ $addToSet: { events: eventId } });

  return { success: true, data }
}

const getEventsBySupervisor = async (supervisorId) => {
  const supervisor = await supervisorModel.findById(supervisorId);

  if (!supervisor) throw new DataBaseError("No se ha encontrado este supervisor", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  const events = (await supervisor.populate("events")).events;

  return events;
}

// --- FUNCIÓN CORREGIDA (Sin Transacción) ---
const addWorkshopToEvent = async (workshopId, eventId, schedule) => {

  try {
    // Busqueda del taller
    const workshopFound = await recreationalWorkshopModel.findById(workshopId);
    if (!workshopFound) throw new DataBaseError("Este taller no existe", DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Si el taller ya pertenece a un evento, lanzar un error
    if (workshopFound.event) throw new DataBaseError(`Este taller ya pertenece a un evento ${workshopFound.event}`, DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Busqueda del evento
    const eventFound = await eventModel.findById(eventId);
    if (!eventFound) throw new DataBaseError("Este evento no existe", DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Agregar el taller al arreglo `workshops` del evento
    const eventResult = await eventFound.updateOne({ $addToSet: { recreationalWorkshops: workshopFound } }, { new: true });
    if (eventResult.modifiedCount === 0) throw new DataBaseError("Este taller ya fue agregado en el evento", DB_ERROR_CODES.DUPLICATED_CONTENT);

    //Agregar el evento a la propiedad de evento del taller
    const { startDate, endDate } = schedule;

    // Validar si los horarios del taller estan dentro de los horarios del evento
    if (startDate && new Date(formattDate(startDate)) < new Date(formattDate(eventFound.startDate))) {
      throw new DataBaseError(
        `La fecha de inicio que quieres poner al taller (${startDate}) es anterior a la fecha de inicio del evento (${eventFound.startDate})`,
        DB_ERROR_CODES.BAD_REQUEST
      );
    }
    // Validar si la fecha de fin del taller es posterior a la fecha de fin del evento retornar un error
    if (endDate && new Date(formattDate(endDate)) > new Date(formattDate(eventFound.endDate))) {
      throw new DataBaseError(
        `La fecha de fin que quieres poner al taller (${endDate}) es posterior a la fecha de fin del evento (${eventFound.endDate})`,
        DB_ERROR_CODES.BAD_REQUEST
      );
    }
    // Agregar el evento a las modificaciones que se le harán al taller
    schedule.event = eventFound._id

    const workshopResult = await workshopFound.updateOne(schedule, { new: true });
    if (workshopResult.modifiedCount === 0) throw new DataBaseError("Este taller ya cuenta con un evento", DB_ERROR_CODES.DUPLICATED_CONTENT);

    return eventFound;
  } catch (err) {
    throw err;
  }
}

const getEventsByName = async (name) => {
  const events = await eventModel.find({ name: { $regex: name } });
  return events;
}

const assistanceRegistration = async (eventId, participantId) => {
  const event = await eventModel.findOne({ _id: eventId });
  if (!event) throw new DataBaseError("El evento no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  const participantToUpdate = event.participants.find(participant => participant.userId.equals(participantId));

  if (participantToUpdate) {
    participantToUpdate.assist = true;
    event.markModified('participants');
    await event.save();
    return true;
  }

  throw new DataBaseError("No se ha encontrado este participante en el evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
}

// Registrar asistencia usando el folio del QR
const registerAssistanceByQRFolio = async (folio) => {
  // Buscar el participante que tiene el QR con el folio especificado
  const participant = await participantModel.findOne({ "QRs.folio": folio });
  if (!participant) throw new DataBaseError("No se encontró el código QR con el folio especificado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Obtener el QR específico y su eventId
  const qr = participant.QRs.find(qr => qr.folio === folio);
  if (!qr) throw new DataBaseError("No se encontró el código QR con el folio especificado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Buscar el evento
  const event = await eventModel.findById(qr.eventId);
  if (!event) throw new DataBaseError("No se encontró el evento asociado al QR", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Buscar el participante en el arreglo de participantes del evento
  const participantToUpdate = event.participants.find(p => p.userId.equals(participant._id));
  if (!participantToUpdate) throw new DataBaseError("El participante no está registrado en este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Marcar como asistió
  participantToUpdate.assist = true;
  event.markModified('participants');
  await event.save();

  return {
    participantId: participant._id,
    eventId: event._id,
    eventName: event.name,
    participantName: `${participant.name} ${participant.lastname}`
  };
}

// --- FUNCIÓN CORREGIDA (Sin Transacción) ---
const cancelEventRegistration = async (participantId, eventId) => {
  // Eliminamos session y transaction
  try {
    // Buscar el participante
    const participant = await participantModel.findById(participantId);
    if (!participant) throw new DataBaseError("No se encontró el participante", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Buscar el evento
    const event = await eventModel.findById(eventId);
    if (!event) throw new DataBaseError("No se encontró el evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Remover el QR asociado al evento
    const qrIndex = participant.QRs.findIndex(qr => qr.eventId.equals(eventId));
    if (qrIndex === -1) throw new DataBaseError("No se encontró el QR asociado a este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Obtener los IDs y folios de los talleres del QR antes de eliminarlo
    const workshopIds = participant.QRs[qrIndex].workshops.map(w => w.workshopId);
    const workshopFolios = participant.QRs[qrIndex].workshops.map(w => w.folio);
    participant.QRs.splice(qrIndex, 1);

    // Remover el evento de los eventos del participante
    const eventIndex = participant.events.findIndex(e => e.equals(eventId));
    if (eventIndex === -1) throw new DataBaseError("El participante no está inscrito en este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    participant.events.splice(eventIndex, 1);

    // Remover el participante de la lista de participantes del evento
    const participantIndex = event.participants.findIndex(p => p.userId.equals(participantId));
    if (participantIndex === -1) throw new DataBaseError("El participante no está inscrito en este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    event.participants.splice(participantIndex, 1);

    // Cancelar inscripción a los talleres del evento
    for (let i = 0; i < workshopIds.length; i++) {
      const workshopId = workshopIds[i];
      const workshopFolio = workshopFolios[i];
      const workshop = await recreationalWorkshopModel.findById(workshopId);
      if (workshop) {
        // Remover el participante de la lista de participantes del taller
        const workshopParticipantIndex = workshop.participants.findIndex(p => p.userId.equals(participantId));
        if (workshopParticipantIndex !== -1) {
          workshop.participants.splice(workshopParticipantIndex, 1);
        }

        // Remover el taller de la lista de talleres del participante
        const workshopIndex = participant.workshops.findIndex(w => w.equals(workshopId));
        if (workshopIndex !== -1) {
          participant.workshops.splice(workshopIndex, 1);
        }

        // Remover el folio del taller de los QRs del participante
        participant.QRs.forEach(qr => {
          if (qr.workshops) {
            const workshopQRIndex = qr.workshops.findIndex(w => w.folio === workshopFolio);
            if (workshopQRIndex !== -1) {
              qr.workshops.splice(workshopQRIndex, 1);
            }
          }
        });
        // Guardar los cambios del taller (sin sesión)
        workshop.markModified('participants');
        await workshop.save();
      }
    }

    // Guardar los cambios (sin sesión)
    await participant.save();
    await event.save();

    return true;
  } catch (err) {
    throw err;
  }
}

const getParticipantsByEvent = async (eventId) => {
  const event = await eventModel.findById(eventId).populate('participants.userId');
  if (!event) throw new DataBaseError("El evento no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  return event.participants;
}

module.exports = {
  registerUserToEvent,
  createEvent,
  getEvents,
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
};