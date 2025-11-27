const { DB_ERROR_CODES, DataBaseError } = require("../utils/errors/DataBase.error");
const { recreationalWorkshopModel } = require("../models/recreational.workshops/recreational.workshops.model");
const { adminEventsDiscriminator } = require("../models/user/administrator/administrator.model");
const { eventModel } = require("../models/event/event.model");
const { supervisorModel } = require("../models/user/supervisor/supervisor.model");
const { participantModel } = require("../models/user/participant/participant.model");
const mongoose = require("mongoose");
const { formattDate } = require("../validators/dates");

const createWorkshop = async (workshop, adminId) => {
  // Busqueda del administrador
  const admin = await adminEventsDiscriminator.findById(adminId);
  if(!admin) throw new DataBaseError("No se ha encontrado al administrador", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    //Se guarda el taller
    const workshopCreated = await new recreationalWorkshopModel(workshop).save({ session });

    // Se agrega el id del taller al arreglo de `workshops` del administrador
    await admin.updateOne({ $addToSet: { workshops: workshopCreated._id } }, { session });
    // Se agrega el id del administrador al arreglo de `administrators` del taller
    await workshopCreated.updateOne({ $addToSet: { administrators: admin._id } }, { session });

    // Confirmar la transaccion
    await session.commitTransaction();
    return workshopCreated;
  } catch (err) {
    // Realizar un rollback
    await session.abortTransaction();
    console.log(err);
    let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
    let errorMsg = "Ha ocurrido un error al registrar la participación";

    if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
      const keyValue = Object.entries(err.keyValue);
      errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
      errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
    }
    throw new DataBaseError(errorMsg, errorCode);
  } finally {
    await session.endSession();
  }
}

const getWorkshops = async () => {
  const workshops = await recreationalWorkshopModel.find();
  return workshops;
}

const updateWorkshopById = async (workshopId, workshopProps) => {
  try {

    const recreationalWorkshop = await recreationalWorkshopModel.findOne({ _id: workshopId });
    if (!recreationalWorkshop) throw new DataBaseError("No se ha encontrado este taller", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Validar en caso de que se quiera modificar las fechas. La fecha de inicio debe ser anterior a la fecha fin
    if(workshopProps?.startDate || workshopProps?.endDate) {
      const startDateFormatted = formattDate(workshopProps?.startDate || recreationalWorkshop?.startDate);
      const endDateFormatted = formattDate(workshopProps?.endDate || recreationalWorkshop?.endDate);

      if(new Date(startDateFormatted) >= new Date(endDateFormatted)) {
        throw new DataBaseError(
          `La fecha de inicio debe ser anterior a la fecha de fin. fecha de inicio: ${startDateFormatted}, fecha fin: ${endDateFormatted}`,
          DB_ERROR_CODES.BAD_REQUEST
        );
      }
    }

    // Validar que si el taller que se quiere modificar pertenece a un evento, revisando que el taller este dentro del rango en el que se lleva a cabo el evento
    if(recreationalWorkshop.event) {
      const workshopEvent = await eventModel.findById(recreationalWorkshop.event);
      // Validar si la fecha de inicio del taller es anterior a la fecha de inicio del evento retornar un error
      if(workshopProps.startDate && new Date(formattDate(workshopProps.startDate)) < new Date(formattDate(workshopEvent.startDate))) {
        throw new DataBaseError(
          `Este taller pertenece a un evento, y la fecha de inicio que quieres poner al taller (${workshopProps.startDate}) es anterior a la fecha de inicio del evento (${workshopEvent.startDate})`,
          DB_ERROR_CODES.BAD_REQUEST
        );
      }
      // Validar si la fecha de fin del taller es posterior a la fecha de fin del evento retornar un error
      if(workshopProps.endDate && new Date(formattDate(workshopProps.endDate)) > new Date(formattDate(workshopEvent.endDate))) {
        throw new DataBaseError(
          `Este taller pertenece a un evento, y la fecha de fin que quieres poner al taller (${workshopProps.endDate}) es posterior a la fecha de fin del evento (${workshopEvent.endDate})`,
          DB_ERROR_CODES.BAD_REQUEST
        );
      }
    }

    const workshopUpdated = await recreationalWorkshop.updateOne(workshopProps, { new: true, runValidators: true });
    return workshopUpdated;
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

const deleteWorkshopById = async (workshopId) => {
  const workshopDeleted = await recreationalWorkshopModel.findByIdAndDelete(workshopId);
  if(!workshopDeleted) throw new DataBaseError("EL taller no ha sido encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  return workshopDeleted;
}

const getWorkshopsByAdmin = async (adminId) => {
  const admin = await adminEventsDiscriminator.findById(adminId);

  if(!admin) throw new DataBaseError("No se ha encontrado este administrador", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  const workshops = (await admin.populate("workshops")).workshops || [];
  return workshops;
}

const getWorkshopsByEvent = async (eventId) => {
  const event = await eventModel.findById(eventId);

  if(!event) throw new DataBaseError("No se ha encontrado este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  const workshops = event.recreationalWorkshops;
  return workshops;
}

const getWorkshopsBySupervisor = async (supervisorId) => {
  const supervisor = await supervisorModel.findById(supervisorId);

  if(!supervisor) throw new DataBaseError("Este supervisor no ha sido encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  const workshops = (await supervisor.populate("workshops")).workshops;

  return workshops;
}

const getWorkshopsByParticipant = async (participantId) => {
  const participant = await participantModel.findById(participantId);
  if(!participant) throw new DataBaseError("El participante no se ha podido encontrar", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  const workshops = (await participant.populate("workshops")).workshops;
  return workshops
}

const addSupervisor = async (workshopId, supervisorId) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Busqueda del supervisor
    const supervisor = await supervisorModel.findById(supervisorId).session(session);

    // Busqueda del taller
    const workshop = await recreationalWorkshopModel.findById(workshopId).session(session);

    if (!supervisor) {
      throw new DataBaseError("El supervisor no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (!workshop) {
      throw new DataBaseError("Este taller no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Agregar el id del supervisor al arreglo de `supervisors` del taller
    const workshopUpdateResult = await workshop.updateOne(
      { $addToSet: { supervisors: supervisorId } },
      { new: true, session }
    );

    if (workshopUpdateResult.modifiedCount === 0) {
      throw new DataBaseError("Ya hay un registro con este valor en el campo supervisores", DB_ERROR_CODES.DUPLICATED_CONTENT);
    }

    // Agregar el id del taller al arreglo de `workshops` del supervisor
    const supervisorUpdateResult = await supervisor.updateOne(
      { $addToSet: { workshops: workshopId } },
      { new: true, session }
    );

    if (supervisorUpdateResult.modifiedCount === 0) {
      throw new DataBaseError("Ya hay un registro con este valor en el campo talleres", DB_ERROR_CODES.DUPLICATED_CONTENT);
    }

    await session.commitTransaction();

    return workshop;
  } catch (err) {
    console.log(err);
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const addParticipant = async (workshopId, participantId) => {
  // Busqueda del taller
  const workshop = await recreationalWorkshopModel.findById(workshopId);
  if(!workshop) throw new DataBaseError("El taller no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Busqueda del participante
  const participant = await participantModel.findById(participantId);
  if(!participant) throw new DataBaseError("El participante no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Verificar que el taller todavia tenga cupos disponibles
    if(workshop.participants.length >= workshop.limitQuota) {
      throw new DataBaseError("Ya no se aceptan mas participantes en este taller", DB_ERROR_CODES.BAD_REQUEST);
    }

    // Obtener todos los talleres en los que está inscrito el participante
    const participantWorkshops = await recreationalWorkshopModel.find({
      _id: { $in: participant.workshops }
    });

    // Validar conflictos de horarios
    for (const existingWorkshop of participantWorkshops) {
      const newStartDate = formattDate(workshop.startDate);
      const newEndDate = formattDate(workshop.endDate);
      const existingStartDate = formattDate(existingWorkshop.startDate);
      const existingEndDate = formattDate(existingWorkshop.endDate);

      // Verificar si hay solapamiento de fechas
      if (
        (new Date(newStartDate) >= new Date(existingStartDate) && new Date(newStartDate) <= new Date(existingEndDate)) ||
        (new Date(newEndDate) >= new Date(existingStartDate) && new Date(newEndDate) <= new Date(existingEndDate)) ||
        (new Date(newStartDate) <= new Date(existingStartDate) && new Date(newEndDate) >= new Date(existingEndDate))
      ) {
        throw new DataBaseError(
          `No se puede inscribir al taller porque hay un conflicto de horarios con el taller "${existingWorkshop.name}" que se realiza del ${existingWorkshop.startDate} al ${existingWorkshop.endDate}`,
          DB_ERROR_CODES.BAD_REQUEST
        );
      }
    }

    // Agregar el id del participante al arreglo de `participants` del taller
    const workshopResult = await workshop.updateOne({ $addToSet: { participants: { userId: participant._id, assist: false } } }, { new: true, session });
    if(workshopResult.modifiedCount === 0) throw new DataBaseError("Ya hay un registro de este participante en este taller", DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Agregar el id del taller al arreglo de `workshops` del participante
    const participantResult = await participant.updateOne({ $addToSet: { workshops: workshop._id } }, { new: true, session });
    if(participantResult.modifiedCount === 0) throw new DataBaseError("Ya hay un registro de este participante en este taller", DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Agregar el folio del taller al arreglo de talleres de `QRs` del participante
    // Generar el folio del taller
    const folio = participant._id.toString().slice(-5) + workshop._id.toString().slice(-5);

    // Obtener el id del evento
    const eventId = workshop.event;
    if(!eventId) throw new DataBaseError("Este taller no pertenece a un evento", DB_ERROR_CODES.BAD_REQUEST);

    // Buscar el QR del evento
    const QREvent = participant.QRs.find(QR => QR.eventId.equals(eventId));
    if(!QREvent) throw new DataBaseError("Este participante no tiene un QR para este evento", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Agregar el folio del taller al arreglo de talleres de `QRs` del participante
    const QRWorkshopResult = QREvent.workshops.addToSet({ folio, workshopId: workshop._id });
    if(QRWorkshopResult.modifiedCount === 0) throw new DataBaseError("Ya hay un registro de este participante en este taller", DB_ERROR_CODES.DUPLICATED_CONTENT);
    //QREvent.workshops.push({ folio, workshopId: workshop._id });

    // Actualizar el participante
    participant.markModified("QRs");
    participant.markModified("QRS.workshops");
    await participant.save({ session });

    await session.commitTransaction();
    return workshop;
  } catch (err) {
    await session.abortTransaction();
    console.log("Error al agregar el participante al taller");
    console.log(err);
    throw err;
  } finally {
    await session.endSession();
  }
}

const assistanceRegistration = async (folio) => {

  // Buscar el participante por el folio del taller
  const participant = await participantModel.findOne({ "QRs.workshops.folio": folio });
  if(!participant) throw new DataBaseError("No se encontró el código QR con el folio especificado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Buscar el QR del participante
  const QREvent = participant.QRs.find(QR => QR.workshops.some(workshop => workshop.folio === folio));

  // Buscar el taller por el folio
  const workshop = QREvent.workshops.find(workshop => workshop.folio === folio);
  if(!workshop) throw new DataBaseError("El taller no fue encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Buscar el participante en el taller
  const workshopFound = await recreationalWorkshopModel.findById(workshop.workshopId);
  const participantToUpdate = workshopFound.participants.find(participantInWorkshop => participantInWorkshop.userId.equals(participant._id));

  if(participantToUpdate) {
    participantToUpdate.assist = true;
    workshopFound.markModified('participants');
    await workshopFound.save();
    return true;
  }

  throw new DataBaseError("No se ha encontrado este participante en el taller", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
}

// Cancelar inscripción a un taller
const cancelWorkshopRegistration = async (participantId, workshopId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Buscar el participante
    const participant = await participantModel.findById(participantId).session(session);
    if(!participant) throw new DataBaseError("No se encontró el participante", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Buscar el taller
    const workshop = await recreationalWorkshopModel.findById(workshopId).session(session);
    if(!workshop) throw new DataBaseError("No se encontró el taller", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Buscar el participante en el taller
    const participantIndex = workshop.participants.findIndex(p => p.userId.equals(participantId));
    if(participantIndex === -1) throw new DataBaseError("El participante no está inscrito en este taller", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Obtener el folio del taller antes de removerlo
    const workshopFolio = participant.QRs
      .flatMap(qr => qr.workshops || [])
      .find(w => w.workshopId.equals(workshopId))?.folio;

    if(!workshopFolio) throw new DataBaseError("No se encontró el folio del taller", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Remover el participante de la lista de participantes del taller
    workshop.participants.splice(participantIndex, 1);
    workshop.markModified('participants');

    // Remover el taller de la lista de talleres del participante
    const workshopIndex = participant.workshops.findIndex(w => w.equals(workshopId));
    if(workshopIndex !== -1) {
      participant.workshops.splice(workshopIndex, 1);
      participant.markModified('workshops');
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
    participant.markModified('QRs');

    // Guardar los cambios
    await participant.save({ session });
    await workshop.save({ session });

    await session.commitTransaction();
    return true;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

const getWorkshopsBySupervisorAndEvent = async (supervisorId, eventId) => {
  try {
    const workshops = await recreationalWorkshopModel.find({
      event: eventId,
      supervisors: supervisorId
    }).populate('event', 'name date').lean();

    if (!workshops || workshops.length === 0) {
      throw new DataBaseError(
        "No se encontraron talleres para el supervisor en el evento especificado",
        DB_ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    return workshops;
  } catch (error) {
    console.error("Error al obtener talleres por supervisor y evento:", error);
    throw error;
  }
};

const removeSupervisor = async (workshopId, supervisorId) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Busqueda del supervisor
    const supervisor = await supervisorModel.findById(supervisorId).session(session);

    // Busqueda del taller
    const workshop = await recreationalWorkshopModel.findById(workshopId).session(session);

    if (!supervisor) {
      throw new DataBaseError("El supervisor no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (!workshop) {
      throw new DataBaseError("Este taller no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Remover el id del supervisor del arreglo de `supervisors` del taller
    const workshopUpdateResult = await workshop.updateOne(
      { $pull: { supervisors: supervisorId } },
      { new: true, session }
    );

    if (workshopUpdateResult.modifiedCount === 0) {
      throw new DataBaseError("El supervisor no está asignado a este taller", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Remover el id del taller del arreglo de `workshops` del supervisor
    const supervisorUpdateResult = await supervisor.updateOne(
      { $pull: { workshops: workshopId } },
      { new: true, session }
    );

    if (supervisorUpdateResult.modifiedCount === 0) {
      throw new DataBaseError("El taller no está asignado a este supervisor", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    await session.commitTransaction();
    return workshop;
  } catch (err) {
    console.log(err);
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = {
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
};