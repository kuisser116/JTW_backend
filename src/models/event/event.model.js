const mongoose = require("mongoose");
const { recreationalWorkshopSchema } = require("../recreational.workshops/recreational.workshops.model");

const eventSchema = new mongoose.Schema(
  {
    mainImg: {
      required: true,
      type: String
    },
    bannerImgs: {
      type: [String],
      validate: {
        validator: function (value) {
          return value.length >= 3;
        }
      }
    },
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String,
      required: true
    },
    recreationalWorkshops: {
      type: [recreationalWorkshopSchema],
      required: false,
      default: []
    },
    participants: {
      _id: false,
      type: [{
        userId: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: "Participant"
        },
        assist: {
          type: Boolean,
          default: false
        }
      }],
      default: []
    },
    supervisors: { // Checadores
      _id: false,
      type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Supervisor" }],
      required: true,
    },
    administrators: {
      _id: 0,
      type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Administrator" }],
      required: true
    },
    startDate: {
      type: String,
      required: true
    },
    endDate: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: false,
      default: "Sin especificar"
    }
  }
);

const eventModel = mongoose.model("Event", eventSchema);

module.exports = { eventModel };