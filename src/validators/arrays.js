const { body } = require("express-validator");

function minLength(opts = {}) {

  const { fields, min, message = "invalid value", isOptional = false } = opts;

  const result = body(fields).isArray({ min }).withMessage(message);

  if(isOptional) {
    result.optional();
  }

  return result;
}

module.exports = { minLength };