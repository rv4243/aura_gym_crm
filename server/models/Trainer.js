import mongoose from 'mongoose';

const trainerSchema = new mongoose.Schema(
    {
        name:      { type: String, required: true, trim: true },
        phone:     { type: String, required: true, trim: true },
        email:     { type: String, trim: true, lowercase: true, default: '' },
        specialty: { type: String, trim: true, default: '' },  // e.g. "Strength & Conditioning"
        salary:    { type: Number, default: 0 },               // monthly salary in INR
        joinDate:  { type: Date, default: Date.now },
        status:    { type: String, enum: ['active', 'inactive'], default: 'active' },
        photo:     { type: String, default: null },            // uploaded filename
        notes:     { type: String, default: '' },
    },
    { timestamps: true }
);

export default mongoose.model('Trainer', trainerSchema);
