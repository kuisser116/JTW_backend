const { requiredString } = require("./strings");

function isIn(fields, values, message = "invalid value") {
  return requiredString(fields).isIn(values).withMessage(message);
}

module.exports = { isIn };