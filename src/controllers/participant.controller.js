const { updateParticipant, getParticipantQRsAndFolios, findQRByFolio, getParticipantByEmail } = require("../services/participant.service");
const { clientDataValidation } = require("../utils/client.data.validation");
const bcrypt = require("bcrypt");

const updateParticipantById = async (req, res) => {
  try {
    const result = clientDataValidation(req);
    if(result.status === 400) return res.status(result.status).json(result);

    const { userId } = req.user;
    if(!userId) return res.status(400).send({ data: "Inicia sesion para realizar esta accion", status: 400 });

    if(req.body.password) {
      // Hashear la contraseña
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
      req.body.password = hashedPassword;
    }

    const updated = await updateParticipant(userId, req.body);
    if(updated) return res.status(201).json({ data: "Participante actualizado" })
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
}

// Traer los QR's y folios del participante
const getParticipantQRsAndFoliosController = async (req, res) => {
  try {
    const { userId } = req.user;
    if(!userId) return res.status(400).send({ data: "Inicia sesion para realizar esta accion", status: 400 });

    const participantQRsAndFolios = await getParticipantQRsAndFolios(userId);
    return res.status(200).json({ data: participantQRsAndFolios });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
}

// Buscar código QR por folio
const getQRByFolio = async (req, res) => {
  try {
    const { folio } = req.query;

    if(!folio) return res.status(400).send({ data: "El folio es requerido", status: 400 });

    const qr = await findQRByFolio(folio);
    return res.status(200).json({ data: qr });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
}

const getParticipantByEmailController = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ data: "El email es requerido", status: 400 });
    }

    const participant = await getParticipantByEmail(email);
    return res.status(200).json({ data: participant });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
};

module.exports = { updateParticipantById, getParticipantQRsAndFoliosController, getQRByFolio, getParticipantByEmailController };