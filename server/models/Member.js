import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true },
        planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
        joinDate: { type: Date, default: Date.now },
        expiryDate: { type: Date, default: null },
        status: {
            type: String,
            enum: ['active', 'expired', 'paused'],
            default: 'active',
        },
        notes: { type: String, default: '' },
        photo: { type: String, default: null },   // uploaded filename e.g. "member_abc123.jpg"
        trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null },
        address: { type: String, default: '' },
        gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
        anniversaryDate: { type: Date, default: null },
        trainerAssignedDate: { type: Date, default: null },
        dob: { type: Date, default: null },
        whatsappNotifications: { type: Boolean, default: true },
        lastBirthdayWishSentYear: { type: Number, default: 0 },
        lastAnniversaryWishSentYear: { type: Number, default: 0 },
        lastExpiryReminderSentDate: { type: Date, default: null },
    },
    { timestamps: true }
);

export default mongoose.model('Member', memberSchema);