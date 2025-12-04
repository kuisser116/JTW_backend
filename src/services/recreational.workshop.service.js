const { DB_ERROR_CODES, DataBaseError } = require("../utils/errors/DataBase.error");
const { recreationalWorkshopModel } = require("../models/recreational.workshops/recreational.workshops.model");
const { adminEventsDiscriminator } = require("../models/user/administrator/administrator.model");
const { eventModel } = require("../models/event/event.model");
const { supervisorModel } = require("../models/user/supervisor/supervisor.model");
const { participantModel } = require("../models/user/participant/participant.model");
const mongoose = require("mongoose");
const { formattDate } = require("../validators/dates");

// ... (createWorkshop, getWorkshops, updateWorkshopById, deleteWorkshopById, getWorkshopsByAdmin, getWorkshopsByEvent, getWorkshopsBySupervisor, getWorkshopsByParticipant se mantienen igual) ...
// Para ahorrar espacio, dejo las funciones que no cambiaron igual, aquí abajo está lo importante:

const createWorkshop = async (workshop, adminId) => {
  // Busqueda del administrador
  const admin = await adminEventsDiscriminator.findById(adminId);
  if(!admin) throw new DataBaseError("No se ha encontrado al administrador", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  
  try {
    // Se guarda el taller (sin session)
    const workshopCreated = await new recreationalWorkshopModel(workshop).save();

    // Se agrega el id del taller al arreglo de `workshops` del administrador
    await admin.updateOne({ $addToSet: { workshops: workshopCreated._id } });
    
    // Se agrega el id del administrador al arreglo de `administrators` del taller
    await workshopCreated.updateOne({ $addToSet: { administrators: admin._id } });

    return workshopCreated;
  } catch (err) {
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

// --- CORREGIDO: Sin Transacciones ---
const addSupervisor = async (workshopId, supervisorId) => {
  try {
    // Busqueda del supervisor
    const supervisor = await supervisorModel.findById(supervisorId);

    // Busqueda del taller
    const workshop = await recreationalWorkshopModel.findById(workshopId);

    if (!supervisor) {
      throw new DataBaseError("El supervisor no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (!workshop) {
      throw new DataBaseError("Este taller no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Agregar el id del supervisor al arreglo de `supervisors` del taller
    const workshopUpdateResult = await workshop.updateOne(
      { $addToSet: { supervisors: supervisorId } },
      { new: true }
    );

    if (workshopUpdateResult.modifiedCount === 0) {
      throw new DataBaseError("Ya hay un registro con este valor en el campo supervisores", DB_ERROR_CODES.DUPLICATED_CONTENT);
    }

    // Agregar el id del taller al arreglo de `workshops` del supervisor
    const supervisorUpdateResult = await supervisor.updateOne(
      { $addToSet: { workshops: workshopId } },
      { new: true }
    );

    if (supervisorUpdateResult.modifiedCount === 0) {
      throw new DataBaseError("Ya hay un registro con este valor en el campo talleres", DB_ERROR_CODES.DUPLICATED_CONTENT);
    }

    return workshop;
  } catch (err) {
    console.log(err);
    throw err;
  }
};


// =====================================================================
// === AQUÍ ESTÁ LA FUNCIÓN MODIFICADA CON AUTO-INSCRIPCIÓN AL EVENTO ===
// =====================================================================
const addParticipant = async (workshopId, participantId) => {
  // Busqueda del taller
  const workshop = await recreationalWorkshopModel.findById(workshopId);
  if(!workshop) throw new DataBaseError("El taller no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  // Busqueda del participante
  // IMPORTANTE: No usar findById solamente si vamos a modificar y salvar el documento completo,
  // aquí obtenemos el documento de mongoose completo.
  const participant = await participantModel.findById(participantId);
  if(!participant) throw new DataBaseError("El participante no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  try {
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

    // Obtener el id del evento del taller
    const eventId = workshop.event;
    if(!eventId) throw new DataBaseError("Este taller no pertenece a un evento", DB_ERROR_CODES.BAD_REQUEST);

    // --- LOGICA DE AUTO-INSCRIPCION AL EVENTO ---
    // Verificamos si ya existe el QR del evento en el participante
    let QREvent = participant.QRs.find(QR => QR.eventId.equals(eventId));

    if (!QREvent) {
        // Si no existe, significa que no está inscrito en el evento (o hubo un error de datos).
        // Procedemos a inscribirlo automáticamente.
        
        const event = await eventModel.findById(eventId);
        if(!event) throw new DataBaseError("El evento asociado al taller no existe", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

        // 1. Inscribir al participante en el Modelo de Evento
        await event.updateOne({ 
            $addToSet: { participants: { userId: participant._id, assist: false } } 
        });

        // 2. Agregar el evento al array de eventos del participante (en memoria)
        participant.events.addToSet(eventId);

        // 3. Generar el Folio del Evento (ID usuario + ID evento)
        const eventFolio = participant._id.toString().slice(-5) + eventId.toString().slice(-5);

        // 4. Crear el objeto QR para el evento
        const newQR = {
            eventId: eventId,
            folio: eventFolio,
            workshops: []
        };

        // 5. Agregarlo al array de QRs del participante
        participant.QRs.push(newQR);

        // 6. Guardamos los cambios iniciales del participante (Inscripción al evento)
        await participant.save();

        // 7. Actualizamos la referencia QREvent para que el resto de la función la encuentre
        QREvent = participant.QRs.find(QR => QR.eventId.equals(eventId));
    }
    // -------------------------------------------------

    // Agregar el id del participante al arreglo de `participants` del taller
    const workshopResult = await workshop.updateOne({ $addToSet: { participants: { userId: participant._id, assist: false } } }, { new: true });
    if(workshopResult.modifiedCount === 0) throw new DataBaseError("Ya hay un registro de este participante en este taller", DB_ERROR_CODES.DUPLICATED_CONTENT);

    // Agregar el id del taller al arreglo de `workshops` del participante
    // Nota: Usamos updateOne aquí para asegurar consistencia atómica en este campo, 
    // aunque participant.save() al final también lo haría, mantenemos tu lógica original.
    await participant.updateOne({ $addToSet: { workshops: workshop._id } });

    // Generar el folio del taller
    const folio = participant._id.toString().slice(-5) + workshop._id.toString().slice(-5);

    // Agregar el folio del taller al arreglo de talleres de `QRs` del participante
    // Como QREvent es una referencia al objeto dentro de participant.QRs (gracias a mongoose),
    // si hacemos push aquí y luego save(), se guarda.
    
    // Verificamos duplicados en memoria antes de empujar
    const existsWorkshopInQR = QREvent.workshops.some(w => w.workshopId.equals(workshop._id));
    if (!existsWorkshopInQR) {
        QREvent.workshops.push({ folio, workshopId: workshop._id });
    } else {
        // Si ya existe, lanzamos error para mantener consistencia con tu lógica
        throw new DataBaseError("Ya hay un registro de este participante en este taller", DB_ERROR_CODES.DUPLICATED_CONTENT);
    }

    // Actualizar el participante completo (esto guardará el nuevo workshop en el QR)
    participant.markModified("QRs");
    await participant.save();

    return workshop;
  } catch (err) {
    console.log("Error al agregar el participante al taller");
    console.log(err);
    throw err;
  }
}

// ... importaciones

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
    
    // --- NUEVA VALIDACIÓN: YA ESCANEADO ---
    if (participantToUpdate.assist === true) {
        throw new DataBaseError(
            "Este código QR ya fue utilizado para entrar al taller.", 
            DB_ERROR_CODES.DUPLICATED_CONTENT
        );
    }
    // --------------------------------------

    participantToUpdate.assist = true;
    workshopFound.markModified('participants');
    await workshopFound.save();
    return true;
  }

  throw new DataBaseError("No se ha encontrado este participante en el taller", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
}


// --- CORREGIDO: Sin Transacciones ---
const cancelWorkshopRegistration = async (participantId, workshopId) => {
  try {
    // Buscar el participante
    const participant = await participantModel.findById(participantId);
    if(!participant) throw new DataBaseError("No se encontró el participante", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

    // Buscar el taller
    const workshop = await recreationalWorkshopModel.findById(workshopId);
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

    // Guardar los cambios (sin session)
    await participant.save();
    await workshop.save();

    return true;
  } catch (err) {
    throw err;
  }
}

const getWorkshopsBySupervisorAndEvent = async (supervisorId, eventId) => {
  try {
    // 1. Buscamos en el modelo del SUPERVISOR si tiene asignado el evento en su array 'events'.
    const supervisor = await supervisorModel.findOne({
      _id: supervisorId,
      events: eventId 
    });

    if (!supervisor) {
      throw new DataBaseError(
        "El supervisor no tiene asignado este evento o no existe",
        DB_ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    // 2. Si el supervisor tiene permiso, traemos TODOS los talleres de ese evento.
    const workshops = await recreationalWorkshopModel.find({
      event: eventId
    }).populate('event', 'name date').lean();

    if (!workshops || workshops.length === 0) {
      throw new DataBaseError(
        "No se encontraron talleres en este evento",
        DB_ERROR_CODES.RESOURCE_NOT_FOUND
      );
    }

    return workshops;
  } catch (error) {
    console.error("Error al obtener talleres por supervisor y evento:", error);
    throw error;
  }
};

// --- CORREGIDO: Sin Transacciones ---
const removeSupervisor = async (workshopId, supervisorId) => {
  try {
    // Busqueda del supervisor
    const supervisor = await supervisorModel.findById(supervisorId);

    // Busqueda del taller
    const workshop = await recreationalWorkshopModel.findById(workshopId);

    if (!supervisor) {
      throw new DataBaseError("El supervisor no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (!workshop) {
      throw new DataBaseError("Este taller no se ha encontrado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Remover el id del supervisor del arreglo de `supervisors` del taller
    const workshopUpdateResult = await workshop.updateOne(
      { $pull: { supervisors: supervisorId } },
      { new: true }
    );

    if (workshopUpdateResult.modifiedCount === 0) {
      throw new DataBaseError("El supervisor no está asignado a este taller", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    // Remover el id del taller del arreglo de `workshops` del supervisor
    const supervisorUpdateResult = await supervisor.updateOne(
      { $pull: { workshops: workshopId } },
      { new: true }
    );

    if (supervisorUpdateResult.modifiedCount === 0) {
      throw new DataBaseError("El taller no está asignado a este supervisor", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    return workshop;
  } catch (err) {
    console.log(err);
    throw err;
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