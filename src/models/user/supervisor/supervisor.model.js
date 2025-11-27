const { status } = require("express/lib/response");
const { userSchema } = require("../user");
const mongoose = require("mongoose");

// Este es el esquema del checador
const supervisorSchema = new mongoose.Schema(
  {
    cellphoneNumber: {
      type: String,
      required: true
    },
    events: {
      _id: 0,
      type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Event" }],
      required: true
    },
    status: {
      type: Boolean,
      required: false,
      default: true
    },
    workshops: {
      _id: 0,
      type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "RecreationalWorkshop" }],
      required: true
    },
    administrator: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Administrator",
      required: true
    }
  }
);

supervisorSchema.add(userSchema);

const supervisorModel = mongoose.model("Supervisor", supervisorSchema);

module.exports = { supervisorModel };
