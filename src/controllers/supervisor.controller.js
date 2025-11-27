const {createSupervisor, getSupervisors, getSupervisorById, updateSupervisor, deleteSupervisor, getSupervisorsByAdministrator } = require("../services/supervisor.service");
const { clientDataValidation } = require("../utils/client.data.validation");
const bcrypt = require("bcrypt");

// Crear un nuevo supervisor
const create = async (req, res) => {

  // Id del administrador que crea el supervisor
  const { userId } = req.user;

  try {
    const result = clientDataValidation(req);
    if(result.status === 400) return res.status(result.status).json(result);

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.email, saltRounds);

    req.body.password = hashedPassword;

    const newSupervisor = await createSupervisor(req.body, userId);
    return res.status(201).json({ data: newSupervisor });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};

// Obtener todos los supervisores
const getAll = async (req, res) => {
  try {
    const supervisors = await getSupervisors();
    return res.status(200).json({ data: supervisors });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};

// Obtener supervisor por ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ data: "Especifica el ID del supervisor" });

    const supervisor = await getSupervisorById(id);
    return res.status(200).json({ data: supervisor });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }

};


// Actualizar supervisor: correo, contraseña y evento
const update = async (req, res) => {
  try {
    const result = clientDataValidation(req);
    if(result.status === 400) return res.status(result.status).json(result);

    const { id } = req.params;
    if (!id) return res.status(400).json({ data: "Especifica el ID del supervisor" });

    // Si se incluye una nueva contraseña, la hasheamos
    if(req.body.password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
      req.body.password = hashedPassword;
    }

    // Ahora el evento puede ser actualizado junto con los demás campos
    const updatedSupervisor = await updateSupervisor(id, req.body);
    return res.status(200).json({ data: updatedSupervisor });
  } catch (err) {
    console.log(err);
    let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
    let errorMsg = "Ha ocurrido un error al actualizar el supervisor";

    if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
      const keyValue = Object.entries(err.keyValue);
      errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
      errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
    }
    throw new DataBaseError(errorMsg, errorCode);
  }
};


// Eliminar supervisor
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ data: "Especifica el ID del supervisor" });

    const deletedSupervisor = await deleteSupervisor(id);
    return res.status(200).json({ data: deletedSupervisor });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
};

const getSupervisorsByAdministratorController = async (req, res) => {
  try {
    const { userId } = req.user;
    if (!userId) {
      return res.status(400).json({ data: "El ID del administrador es requerido", status: 400 });
    }

    const supervisors = await getSupervisorsByAdministrator(userId);
    return res.status(200).json({ data: supervisors });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
};

module.exports = {create,getAll,getById,update,remove, getSupervisorsByAdministratorController};
