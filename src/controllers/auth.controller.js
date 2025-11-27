const mongoose = require("mongoose");
const { userSchema } = require("../models/user/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { adminEventsDiscriminator, administratorModel } = require("../models/user/administrator/administrator.model");
const { USER_ROLES } = require("../utils/constants/user.roles");
const { clientDataValidation } = require("../utils/client.data.validation");
const { participantModel } = require("../models/user/participant/participant.model");
const { supervisorModel } = require("../models/user/supervisor/supervisor.model");

const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta";

// Creamos el modelo directamente a partir de tu userSchema
const User = mongoose.model("User", userSchema);

/*Registrar usuario*/
exports.register = async (req, res) => {
  try {

    const result = clientDataValidation(req);
    if(result.status === 400) return res.status(result.status).json(result);

    const { email, role } = req.body;

    // Verificar si el usuario ya existe
    const existingUser =
      await administratorModel.findOne({ email }) ||
      await adminEventsDiscriminator.findOne({ email });

    if(existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(email, saltRounds);

    req.body.password = hashedPassword;

    if (role === USER_ROLES.EVENT_ADMIN) {
      const eventAdmin = new adminEventsDiscriminator(req.body);

      try {
        await eventAdmin.save();
        return res.status(201).json({ data: "Usuario creado con exito", status: 201 });
      } catch (err) {
        console.log(err);
        let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
        let errorMsg = "Ha ocurrido un error al registrar la participación";

        if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
          const keyValue = Object.entries(err.keyValue);
          errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
          errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
        }
        return res.status().send({ data: errorMsg, status: errorCode });
      }
    } else if (role === USER_ROLES.SUPER_ADMIN) {
      const superAdmin = new administratorModel(req.body);

      try {
        await superAdmin.save();
        return res.status(201).json({ data: "Usuario creado con exito", status: 201 });
      } catch (err) {
        console.log(err);
        let errorCode = DB_ERROR_CODES.UNKNOWN_ERROR;
        let errorMsg = "Ha ocurrido un error al registrar la participación";

        if (err.code === DB_ERROR_CODES.DUPLICATED_CONTENT) {
          const keyValue = Object.entries(err.keyValue);
          errorCode = DB_ERROR_CODES.DUPLICATED_CONTENT;
          errorMsg = `Ya hay un registro de ${keyValue[0][0]} con el valor ${keyValue[0][1]}`;
        }
        return res.status().send({ data: errorMsg, status: errorCode });
      }
    } else {
      return res.status(403).json({ data: "Rol no valido", status: 403 });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Login de usuario
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar al usuario por email en los diferentes modelos
    const user =
      await administratorModel.findOne({ email }) ||
      await adminEventsDiscriminator.findOne({ email }) ||
      await participantModel.findOne({ email }) ||
      await supervisorModel.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas", status: 404 });
    }

    // Comparar la contraseña
    const isMatch = user.password === password || await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas", status: 400 });
    }

    // Crear payload para el token
    const payload = {
      userId: user._id,
      role: user.role
    };

    // Firmar el token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2d" });

    // Devolver la respuesta con el usuario completo
    return res.json({ token, role: payload.role, user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};

