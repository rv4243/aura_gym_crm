import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
    {
        memberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Member',
            required: true,
        },
        date: {
            type: String, // stored as "YYYY-MM-DD" for easy daily queries
            required: true,
        },
    },
    { timestamps: true }
);

// Prevent duplicate attendance for same member on same day
attendanceSchema.index({ memberId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);