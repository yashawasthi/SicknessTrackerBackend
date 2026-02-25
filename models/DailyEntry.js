import mongoose from 'mongoose';

const dailyEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dateKey: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    isSick: {
      type: Boolean,
      required: true
    },
    severity: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  { timestamps: true }
);

dailyEntrySchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export default mongoose.model('DailyEntry', dailyEntrySchema);
