import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        durationDays: { type: Number, required: true },   // e.g. 30, 90, 365
        price: { type: Number, required: true },           // in INR
        description: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model('Plan', planSchema);