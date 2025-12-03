const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');

// Modelos
const { administratorModel, adminEventsDiscriminator } = require("../models/user/administrator/administrator.model");
const { participantModel } = require("../models/user/participant/participant.model");
const { supervisorModel } = require("../models/user/supervisor/supervisor.model");

// Utils y Constantes
const { USER_ROLES } = require("../utils/constants/user.roles");
const { DB_ERROR_CODES, DataBaseError } = require("../utils/errors/DataBase.error");

// Configuración de variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // ¡Asegúrate de poner esto en tu .env!

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Busca un usuario en todas las colecciones posibles por orden de prioridad/probabilidad.
 */
const findUserByEmail = async (email) => {
  let user = await administratorModel.findOne({ email });
  if (user) return user;

  user = await adminEventsDiscriminator.findOne({ email });
  if (user) return user;

  user = await participantModel.findOne({ email });
  if (user) return user;

  user = await supervisorModel.findOne({ email });
  return user;
};

/**
 * Registro de usuarios estándar (Email/Password)
 */
const registerUser = async (userData) => {
  const { email, password, role } = userData;

  // 1. Verificar si existe
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new DataBaseError("El usuario ya existe", DB_ERROR_CODES.DUPLICATED_CONTENT);
  }

  // 2. Hashear contraseña
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const dataToSave = { ...userData, password: hashedPassword };

  // 3. Crear el modelo según el rol
  let newUser;
  
  if (role === USER_ROLES.EVENT_ADMIN) {
    newUser = new adminEventsDiscriminator(dataToSave);
  } else if (role === USER_ROLES.SUPER_ADMIN) {
    newUser = new administratorModel(dataToSave);
  } else if (role === USER_ROLES.PARTICIPANT) {
    newUser = new participantModel(dataToSave);
  } else {
    // Si intentan crear un rol desconocido o no permitido por esta vía
    throw new Error("Rol no válido para registro directo");
  }

  // 4. Guardar
  try {
    const savedUser = await newUser.save();
    return savedUser;
  } catch (err) {
    if (err.code === 11000) { 
       throw new DataBaseError(`El valor ya existe en la base de datos`, DB_ERROR_CODES.DUPLICATED_CONTENT);
    }
    throw err;
  }
};

/**
 * Login estándar (Email/Password)
 */
const loginUser = async (email, password) => {
  // 1. Buscar usuario
  const user = await findUserByEmail(email);
  if (!user) return null;

  // 2. Comparar contraseña
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return null;

  // 3. Generar Token
  const payload = {
    userId: user._id,
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2d" });

  return { token, user };
};

/**
 * Login con Google (OAuth 2.0)
 * - Si el usuario existe (cualquier rol): Inicia sesión.
 * - Si el usuario NO existe: Se registra automáticamente como PARTICIPANTE.
 */
const googleLogin = async (idToken) => {
  // 1. Verificar el token con Google
  let ticket;
  try {
      ticket = await client.verifyIdToken({
          idToken: idToken,
          audience: GOOGLE_CLIENT_ID,
      });
  } catch (error) {
      throw new Error("Token de Google inválido");
  }

  const { email, name, given_name, family_name, picture } = ticket.getPayload();

  // 2. Buscar si el usuario ya existe en nuestra BD
  let user = await findUserByEmail(email);

  // 3. Si NO existe, lo creamos como PARTICIPANTE
  if (!user) {
    const saltRounds = 10;
    // Generamos contraseña aleatoria (ya que entra por Google)
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);

    const newParticipantData = {
      name: given_name || name,
      lastname: family_name || " ",
      email: email,
      password: hashedPassword,
      role: USER_ROLES.PARTICIPANT || "Participant", 
      eventAwarness: "Google",
      gender: "Sin especificar",
      livingState: "Sin especificar",
      profession: "N/A",
      workPlace: "N/A"
      // Si quieres guardar la foto: image: picture
    };

    user = new participantModel(newParticipantData);
    await user.save();
  }

  // 4. Generar Token JWT propio
  const payload = {
    userId: user._id,
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2d" });

  return { token, user };
};

module.exports = {
  registerUser,
  loginUser,
  googleLogin
};