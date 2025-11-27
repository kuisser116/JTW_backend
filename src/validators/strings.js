const { body } = require("express-validator")

function requiredString(fields, message = "invalid value") {
  return body(fields, message).trim().notEmpty().isString().escape().withMessage(message);
}

function notRequiredString(fields, message = "invalid value") {
  return body(fields, message).trim().isString().escape().optional().withMessage(message);
}

function isEmail(fields, message = "invalid value") {
  return requiredString(fields).isEmail().withMessage(message);
}

function isEmailAndOptional(fields, message = "invalid value") {
  return requiredString(fields).isEmail().optional().withMessage(message);
}

function validPassword(fields, message = "invalid value") {
  return requiredString(fields).isLength({ min: 8 }).withMessage(message);
}

module.exports = { requiredString, notRequiredString, isEmail, validPassword, isEmailAndOptional };