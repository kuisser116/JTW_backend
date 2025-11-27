const mongoose = require("mongoose");

const recreationalWorkshopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: false,
      unique: false,
    },
    description: {
      type: String,
      required: true
    },
    startDate: {
      type: String,
      required: false
    },
    endDate: {
      type: String,
      required: false
    },
    img: {
      type: String,
      required: true
    },
    limitQuota: {
      type: Number,
      required: true
    },
    instructor: {
      type: String,
      required: true
    },
    supervisors: { // Checadores
      type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Supervisor" }],
      required: false
    },
    participants: {
      _id: false,
      type: [{
        userId: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: "participants" // Ref para apuntar a la colección 'participants'
        },
        assist: {
          type: Boolean,
          default: false
        }
      }],
      default: []
    },
    administrators: {
      _id: 0,
      type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Administrator" }],
      required: true
    },
    event: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Event",
      required: false
    }
  }
);

const recreationalWorkshopModel = mongoose.model("RecreationalWorkshop", recreationalWorkshopSchema);

module.exports = { recreationalWorkshopSchema, recreationalWorkshopModel };