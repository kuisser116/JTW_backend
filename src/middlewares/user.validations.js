const {
  notRequiredString,
  requiredString,
  isEmail,
  isEmailAndOptional
} = require("../validators/strings");

const userValidationsRequired = [
  requiredString("name", "Este campo es requerido y debe ser un texto"),
  requiredString("lastname", "Este campo es requerido y debe ser un texto"),
  isEmail("email", "Asegurate de que el correo electronico sea valido"),
];

const userValidationsOptionals = [
  notRequiredString("name", "Este campo debe ser un texto"),
  notRequiredString("lastname", "Este campo debe ser un texto"),
  isEmailAndOptional("email", "Asegurate de que el correo electronico sea valido"),
];

module.exports = { userValidationsRequired, userValidationsOptionals };