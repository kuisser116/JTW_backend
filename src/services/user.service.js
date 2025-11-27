const { administratorModel, adminEventsDiscriminator } = require("../models/user/administrator/administrator.model");
const { participantModel } = require("../models/user/participant/participant.model");
const { supervisorModel } = require("../models/user/supervisor/supervisor.model");
const { DataBaseError, DB_ERROR_CODES } = require("../utils/errors/DataBase.error");
const { mailSender } = require("../utils/mail.sender");
const { EMAIL_CODE_MAP } = require("../utils/tempStorage/email.code.map");
const bcrypt = require("bcrypt");
const { userSchema } = require("../models/user/user");
const mongoose = require("mongoose");

const passwordRecoveryMail = async (email) => {
  // Encontrar el usuario
  const user =
    await participantModel.findOne({ email })||
    await administratorModel.findOne({ email }) ||
    await adminEventsDiscriminator.findOne({ email }) ||
    await supervisorModel.findOne({ email });

  if(!user) return null;

  // Generar el codigo de recuperacion
  const recoveryCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

  // Guardar el email con el codigo de recuperacion en un almacenamiento temporal
  EMAIL_CODE_MAP[email] = recoveryCode;

  const opts = {
    user: "20233tn233@utez.edu.mx",
    pass: "$Victor$13",
    service: "gmail",
    recipient: email,
    subject: "Recuperación de contraseña",
    text: `Para recuperar tu contraseña es necesario que ingreses el siguiente codigo: ${recoveryCode}`
  }
  mailSender(opts);
}

const passwordRecovery = async (email, newPassword) => {
  const user =
    await participantModel.findOne({ email })||
    await administratorModel.findOne({ email }) ||
    await adminEventsDiscriminator.findOne({ email }) ||
    await supervisorModel.findOne({ email });

  if(!user) throw new DataBaseError("Este usuario no existe", DB_ERROR_CODES);

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const userResult = await user.updateOne({ password: hashedPassword });

  if(userResult.modifiedCount === 1) {
    return true;
  }

  return false;
}

const getUserById = async (userId) => {
  // Buscar en todos los modelos de usuario
  const participant = await participantModel.findById(userId);
  if (participant) return participant;

  const supervisor = await supervisorModel.findById(userId);
  if (supervisor) return supervisor;

  const administrator = await administratorModel.findById(userId);
  if (administrator) return administrator;

  const adminEventsDiscriminator = await adminEventsDiscriminator.findById(userId);
  if (adminEventsDiscriminator) return adminEventsDiscriminator;

  throw new DataBaseError("No se encontró el usuario", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
};

const updateUserById = async (userId, updateData) => {
  // Buscar y actualizar en todos los modelos de usuario
  let updatedUser = await participantModel.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );
  if (updatedUser) return updatedUser;

  updatedUser = await supervisorModel.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );
  if (updatedUser) return updatedUser;

  updatedUser = await administratorModel.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );
  if (updatedUser) return updatedUser;

  updatedUser = await adminEventsDiscriminator.findByIdAndUpdate(
    userId,
    updateData,
    { new: true }
  );
  if (updatedUser) return updatedUser;

  throw new DataBaseError("No se encontró el usuario para actualizar", DB_ERROR_CODES.RESOURCE_NOT_FOUND);
};

module.exports = {
  passwordRecoveryMail,
  passwordRecovery,
  getUserById,
  updateUserById
};