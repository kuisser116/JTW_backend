const { userSchema } = require("../user");
const mongoose = require("mongoose");

const administratorSchema = new mongoose.Schema(
  {
    cellphoneNumber: {
      type: String,
      required: true
    },
    company: {
      type: String,
      required: true
    },
    status: {
      type: Boolean,
      required: false,
      default: true
    }
  }
);

const eventAdminSchema = new mongoose.Schema({
  events: {
    _id: 0,
    type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Event"}],
    required: true
  },
  workshops: {
    _id: 0,
    type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "RecreationalWorkshop" }],
    required: true
  },
  supervisors: {
    type: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Supervisor" }],
    required: false,
    default: []
  }
});

administratorSchema.add(userSchema);

const administratorModel = mongoose.model("Administrator", administratorSchema);

const adminEventsDiscriminator = administratorModel.discriminator("EventAdmin", eventAdminSchema, { discriminatorKey: "role" });

module.exports = { administratorModel, adminEventsDiscriminator };