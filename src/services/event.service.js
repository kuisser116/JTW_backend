const { participantModel } = require("../models/user/participant/participant.model");
const { eventModel } = require("../models/event/event.model");
const { adminEventsDiscriminator } = require("../models/user/administrator/administrator.model");
const { DB_ERROR_CODES, DataBaseError } = require("../utils/errors/DataBase.error");
const { supervisorModel } = require("../models/user/supervisor/supervisor.model");
const { default: mongoose } = require("mongoose");
const { recreationalWorkshopModel } = require("../models/recreational.workshops/recreational.workshops.model");
const { formattDate } = require("../validators/dates");
const bcrypt = require("bcrypt");

const registerUserToEvent = async (user, eventId) => {
  const {
    name, lastname,
    gender, birthday,
    email, eventAwarness,
    livingState, profession,
    workPlace
  } = user;

  const session = await mongoose.startSession();

  session.startTransaction();

  // Buscar si el evento esta registrado
  const eventFound = await eventModel.findOne({ _id: eventId }).session(session);

  if (!eventFound) throw new DataBaseError("No se ha encontrado el evento en el que quieres participar", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Buscar el participante asociado con el email
  let userFound = await participantModel.findOne({ email }).session(session);

  // Si el participante no existe en la base de datos, se crea uno
  if (!userFound) {

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(email, saltRounds);

    const participantSaved = new participantModel({
      name,
      lastname,
      email,
      password: hashedPassword,
      role: "Participant",
      gender,
      birthday,
      eventAwarness,
      livingState,
      profession,
      workPlace
    });

    // Registrar el participante en la base de datos
    try {
      userFound = await participantSaved.save({ session });
      // await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      await session.endSession();
      console.log(err);
      let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
      let errorMsg = "Ha ocurrido un error al registrar la participación";

      if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
        const keyValue = Object.entries(err.keyValue);
        errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
        errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
      }
      throw new DataBaseError(errorMsg, errorCode);
    }
  }

  // Actualizacion de los participantes del evento
  const eventResult = await eventFound.updateOne({ $addToSet: { participants: { userId: userFound._id, assist: false } } }, { session });
  if (eventResult.modifiedCount === 0) throw new DataBaseError("Ya hay un registro con este valor en el campo participantes del evento", DB_ERROR_CODES.DUPLICATED_CONTENT);

  // Actualizacion de los eventos del participante
  const participantResult = await userFound.updateOne({ $addToSet: { events: eventFound._id } }, { session });
  if (participantResult.modifiedCount === 0) throw new DataBaseError("Ya hay un registro con este valor en el campo eventos del participante", DB_ERROR_CODES.DUPLICATED_CONTENT);

  // Retornar true en caso de que el participante se haya registrado
  await session.commitTransaction();
  await session.endSession();
  return { success: true, data: { participant: userFound, event: eventFound } };
}

const createEvent = async (event, adminId) => {
  const newEvent = new eventModel(event);

  const session = await mongoose.startSession();

  session.startTransaction();

  // Buscar el administrador en la base de datos
  const adminFound = await adminEventsDiscriminator.findById(adminId).session(session);

  if (!adminFound) throw new DataBaseError("El administrador no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  try {
    const eventStored = await newEvent.save({ session });

    // Agregar el id del administrador al arrelgo `administrators` del evento
    const eventResult = await eventStored.updateOne({ $addToSet: { administrators: adminId } }, { session });

    if (eventResult.modifiedCount === 0) throw new DataBaseError("Ya existe un registro con este valor dentro del campo de administradores de este evento", DB_ERROR_CODES.DUPLICATED_CONTENT);

    await adminFound.updateOne({ $addToSet: { events: eventStored._id } }, { session });

    await session.commitTransaction();
    return eventStored;
  } catch (err) {

    console.log(err);

    await session.abortTransaction();
    await session.endSession();

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

const addWorkshopToEvent = async (workshopId, eventId, schedule) => {

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // Busqueda del taller
    const workshopFound = await recreationalWorkshopModel.findById(workshopId).session(session);
    if (!workshopFound) throw new DataBaseError("Este taller no existe", DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Si el taller ya pertenece a un evento, lanzar un error
    if(workshopFound.event) throw new DataBaseError(`Este taller ya pertenece a un evento ${workshopFound.event}`, DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Busqueda del evento
    const eventFound = await eventModel.findById(eventId).session(session);
    if (!eventFound) throw new DataBaseError("Este evento no existe", DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Agragar el taller al arreglo `workshops` del evento
    const eventResult = await eventFound.updateOne({ $addToSet: { recreationalWorkshops: workshopFound } }, { new: true, session });
    if (eventResult.modifiedCount === 0) throw new DataBaseError("Este taller ya fue agregado en el evento", DB_ERROR_CODES.DUPLICATED_CONTENT);

    //Agregar el evento a la propiedad de evento del taller
    const  { startDate, endDate } = schedule;

    // Validar si los horarios del taller estan dentro de los horarios del evento
    if(startDate && new Date(formattDate(startDate)) < new Date(formattDate(eventFound.startDate))) {
      throw new DataBaseError(
        `La fecha de inicio que quieres poner al taller (${startDate}) es anterior a la fecha de inicio del evento (${eventFound.startDate})`,
        DB_ERROR_CODES.BAD_REQUEST
      );
    }
    // Validar si la fecha de fin del taller es posterior a la fecha de fin del evento retornar un error
    if(endDate && new Date(formattDate(endDate)) > new Date(formattDate(eventFound.endDate))) {
      throw new DataBaseError(
        `La fecha de fin que quieres poner al taller (${endDate}) es posterior a la fecha de fin del evento (${eventFound.endDate})`,
        DB_ERROR_CODES.BAD_REQUEST
      );
    }
    // Agregar el evento a las modificaciones que se le harán al taller
    schedule.event = eventFound._id

    const workshopResult = await workshopFound.updateOne(schedule, { new: true, session });
    if (workshopResult.modifiedCount === 0) throw new DataBaseError("Este taller ya cuenta con un evento", DB_ERROR_CODES.DUPLICATED_CONTENT);

    await session.commitTransaction();
    return eventFound;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

const getEventsByName = async (name) => {
  const events = await eventModel.find({ name: { $regex: name } });
  return events;
}

const assistanceRegistration = async (eventId, participantId) => {
  const event = await eventModel.findOne({ _id: eventId });
  if(!event) throw new DataBaseError("El evento no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  const participantToUpdate = event.participants.find(participant => participant.userId.equals(participantId));

  if(participantToUpdate) {
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
  if(!participant) throw new DataBaseError("No se encontró el código QR con el folio especificado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  
  // Obtener el QR específico y su eventId
  const qr = participant.QRs.find(qr => qr.folio === folio);
  if(!qr) throw new DataBaseError("No se encontró el código QR con el folio especificado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Buscar el evento
  const event = await eventModel.findById(qr.eventId);
  if(!event) throw new DataBaseError("No se encontró el evento asociado al QR", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Buscar el participante en el arreglo de participantes del evento
  const participantToUpdate = event.participants.find(p => p.userId.equals(participant._id));
  if(!participantToUpdate) throw new DataBaseError("El participante no está registrado en este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

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

// Cancelar inscripción a un evento
const cancelEventRegistration = async (participantId, eventId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Buscar el participante
    const participant = await participantModel.findById(participantId).session(session);
    if(!participant) throw new DataBaseError("No se encontró el participante", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Buscar el evento
    const event = await eventModel.findById(eventId).session(session);
    if(!event) throw new DataBaseError("No se encontró el evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Remover el QR asociado al evento
    const qrIndex = participant.QRs.findIndex(qr => qr.eventId.equals(eventId));
    if(qrIndex === -1) throw new DataBaseError("No se encontró el QR asociado a este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Obtener los IDs y folios de los talleres del QR antes de eliminarlo
    const workshopIds = participant.QRs[qrIndex].workshops.map(w => w.workshopId);
    const workshopFolios = participant.QRs[qrIndex].workshops.map(w => w.folio);
    participant.QRs.splice(qrIndex, 1);

    // Remover el evento de los eventos del participante
    const eventIndex = participant.events.findIndex(e => e.equals(eventId));
    if(eventIndex === -1) throw new DataBaseError("El participante no está inscrito en este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    participant.events.splice(eventIndex, 1);

    // Remover el participante de la lista de participantes del evento
    const participantIndex = event.participants.findIndex(p => p.userId.equals(participantId));
    if(participantIndex === -1) throw new DataBaseError("El participante no está inscrito en este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    event.participants.splice(participantIndex, 1);

    // Cancelar inscripción a los talleres del evento
    for(let i = 0; i < workshopIds.length; i++) {
      const workshopId = workshopIds[i];
      const workshopFolio = workshopFolios[i];
      const workshop = await recreationalWorkshopModel.findById(workshopId).session(session);
      if(workshop) {
        // Remover el participante de la lista de participantes del taller
        const workshopParticipantIndex = workshop.participants.findIndex(p => p.userId.equals(participantId));
        if(workshopParticipantIndex !== -1) {
          workshop.participants.splice(workshopParticipantIndex, 1);
        }

        // Remover el taller de la lista de talleres del participante
        const workshopIndex = participant.workshops.findIndex(w => w.equals(workshopId));
        if(workshopIndex !== -1) {
          participant.workshops.splice(workshopIndex, 1);
        }

        // Remover el folio del taller de los QRs del participante
        participant.QRs.forEach(qr => {
          if(qr.workshops) {
            const workshopQRIndex = qr.workshops.findIndex(w => w.folio === workshopFolio);
            if(workshopQRIndex !== -1) {
              qr.workshops.splice(workshopQRIndex, 1);
            }
          }
        });
        // Guardar los cambios del taller
        workshop.markModified('participants');
        await workshop.save({ session });
      }
    }

    // Guardar los cambios
    await participant.save({ session });
    await event.save({ session });

    await session.commitTransaction();
    return true;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
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