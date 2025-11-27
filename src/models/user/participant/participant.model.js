const { userSchema } = require("../user");
const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    gender: {
      type: String,
      required: false,
      enum: ["Hombre", "Mujer", "Sin especificar"]
    },
    birthday: {
      type: String,
      required: false
    },
    eventAwarness: { // Medio por el cual se entero del evento
      type: String,
      required: false
    },
    livingState: { // Estado de residencia
      type: String,
      required: false
    },
    profession: {
      type: String,
      required: false,
      default: "N/A"
    },
    workPlace: { // Lugar de trabajo
      type: String,
      required: false,
      default: "N/A"
    },
    events: {
      _id: 0,
      type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Event" }],
      required: true
    },
    workshops: {
      _id: 0,
      type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "RecreationalWorkshop" }],
      required: true
    },
    QRs: {
      type: [{
        qrRepresentation: String,
        folio: String,
        eventName: String,
        eventId: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: "Event"
        },
        workshops: [
          {
            folio: String,
            workshopId: {
              type: mongoose.SchemaTypes.ObjectId,
              ref: "RecreationalWorkshop"
            }
          }
        ]
      }]
    }
  }
);

participantSchema.add(userSchema);

const participantModel = mongoose.model("Participant", participantSchema);

module.exports = { participantModel };
