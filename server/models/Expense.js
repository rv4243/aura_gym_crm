import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        amount: { type: Number, required: true },
        category: {
            type: String,
            enum: ['rent', 'salary', 'equipment', 'utilities', 'maintenance', 'marketing', 'other'],
            default: 'other',
        },
        date: { type: Date, default: Date.now },
        paidTo: { type: String, trim: true, default: '' },
        method: {
            type: String,
            enum: ['cash', 'upi', 'card'],
            default: 'cash',
        },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
