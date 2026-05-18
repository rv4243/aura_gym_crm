import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
    {
        memberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Member',
            required: true,
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
            required: true,
        },
        amount: { type: Number, required: true },
        method: {
            type: String,
            enum: ['cash', 'upi', 'card'],
            required: true,
        },
        status: {
            type: String,
            enum: ['paid', 'pending', 'overdue'],
            default: 'paid',
        },
        paidDate: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);