const { participantModel } = require("../models/user/participant/participant.model");
const { DataBaseError, DB_ERROR_CODES } = require("../utils/errors/DataBase.error");
const { eventModel } = require("../models/event/event.model");

// Guardar evento en el participante
const saveEventInParticipant = async (participantId, data) => {
  const participantFound = await participantModel.findById(participantId);
  await participantFound.updateOne({ $addToSet: { QRs: data } });
}

// Actualizar participante
const updateParticipant = async (participantId, participantProps) => {
  const participant = await participantModel.findById(participantId);
  if(!participant) throw new DataBaseError("Este participante no existe", DB_ERROR_CODES.RESOURCE_NOT_FOUND)
  const participantResult = await participant.updateOne(participantProps);
  if(participantResult.modifiedCount === 0) throw new DataBaseError("No se ha podido actualizar este participante", DB_ERROR_CODES.UNKNOWN_ERROR);
  return true;
}

// Traer los QR's y folios del participante
const getParticipantQRsAndFolios = async (participantId) => {
  const participant = await participantModel.findById(participantId).lean();
  if(!participant) throw new DataBaseError("No se encontró el participante con el id especificado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  const qrs = participant.QRs;
  const qrsResponse = qrs;
  for(let i = 0; i < qrsResponse.length; i++) {
    const event = await eventModel.findById(qrsResponse[i]?.eventId);
    qrsResponse[i]['eventImg'] = event?.mainImg;
  }
  return qrsResponse;
}

// Buscar código QR por folio
const findQRByFolio = async (folio) => {
  const participant = await participantModel.findOne({ "QRs.folio": folio });
  if(!participant) throw new DataBaseError("No se encontró el código QR con el folio especificado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);

  const qr = participant.QRs.find(qr => qr.folio === folio);
  return qr;
}

const getParticipantByEmail = async (email) => {
  const participant = await participantModel.findOne({ email });
  if (!participant) {
    throw new DataBaseError("No se encontró el participante con el email especificado", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
  }
  return participant;
};

module.exports = { saveEventInParticipant, updateParticipant, getParticipantQRsAndFolios, findQRByFolio, getParticipantByEmail };