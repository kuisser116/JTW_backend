const { passwordRecoveryMail, passwordRecovery, getUserById, updateUserById } = require("../services/user.service");
const jwt = require("jsonwebtoken");
const { EMAIL_CODE_MAP } = require("../utils/tempStorage/email.code.map");
const { DB_ERROR_CODES } = require("../utils/errors/DataBase.error");
const bcrypt = require("bcrypt");

const recoverPasswordMail = async (req, res) => {
  const { email } = req.body;
  await passwordRecoveryMail(email);
  // Generar un token temporal para permitir al usuario cambiar de contraseña
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: 15*1000*60 });

  res.status(200).json({ data: "Si hay un usuario registrado con este correo se mandará un correo para recuperar la contraseña", token });
}

const validateCode = async (req, res) => {
  const { email } = req.user;
  const { code } = req.body;

  // Verificar que el codigo sea del usuario asociado al email
  if(EMAIL_CODE_MAP[email] === code) {
    return res.status(200).json({ data: "Usuario validado", status: 200 });
  }
  return res.status(500).json({ data: "Codigo erroneo", status: 400 });
}

const recoverPassword = async (req, res) => {
  const { email } = req.user;
  const { password } = req.body;
  try {
    const isSuccessfullChange = await passwordRecovery(email, password);
    if(isSuccessfullChange) return res.status(201).json({ data: "Contraseña modificada con exito" });
    return res.status(500).json({ data: "No se ha podido hacer el cambio de la contraseña", status: DB_ERROR_CODES.UNKNOWN_ERROR });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ data: err.message, status: err.errorCode });
  }
}

const getUserByIdController = async (req, res) => {
  try {
    const { userId } = req.user; // Obtener el ID del usuario del JWT
    if (!userId) {
      return res.status(400).json({ data: "No se pudo obtener el ID del usuario del token", status: 400 });
    }

    const user = await getUserById(userId);
    return res.status(200).json({ data: user });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
};

const updateUserByIdController = async (req, res) => {
  try {
    const { userId } = req.user; // Obtener el ID del usuario del JWT
    if (!userId) {
      return res.status(400).json({ data: "No se pudo obtener el ID del usuario del token", status: 400 });
    }

    const updateData = req.body;
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ data: "No se proporcionaron datos para actualizar", status: 400 });
    }

    // Si se está actualizando la contraseña, la hasheamos
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await updateUserById(userId, updateData);
    return res.status(200).json({ data: updatedUser });
  } catch (err) {
    console.log(err);
    const { errorCode, message } = err;
    return res.status(500).json({ data: message, status: errorCode });
  }
};

module.exports = {
  recoverPasswordMail,
  recoverPassword,
  validateCode,
  getUserByIdController,
  updateUserByIdController
};