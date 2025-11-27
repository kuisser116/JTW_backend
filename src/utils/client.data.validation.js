const { validationResult } = require("express-validator");

function clientDataValidation(req) {
  const result = validationResult(req);

  let errorMsg = ``;
  result.array().forEach(error => {
    errorMsg += `El campo '${error.path}' tiene un valor invalido: '${error.value}'. ${error.msg}; `;
  });

  if (!result.isEmpty()) return { data: errorMsg, status: 400 };

  return { data: errorMsg, status: 200 };
}

module.exports = { clientDataValidation };