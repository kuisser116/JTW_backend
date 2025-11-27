const { body } = require("express-validator");

function isNumber(fields, message = "invalid value", isOptional = false) {
  const validationChain = body(fields).isNumeric().withMessage(message);

  if(isOptional) validationChain.optional();

  return validationChain;
}

module.exports = { isNumber };