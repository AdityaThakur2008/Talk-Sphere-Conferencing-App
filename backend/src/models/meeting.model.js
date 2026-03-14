import mongoose, { Schema } from "mongoose";

const MeetingSchema = new Schema({
  user_id: { type: String },
  meetingCode: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const Meeting = mongoose.model("Meeting", MeetingSchema);

export { Meeting };
