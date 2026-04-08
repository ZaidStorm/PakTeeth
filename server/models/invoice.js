const mongoose = require("../database");

const InvoiceSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: true,
        ref: "Patient"
    },
    patientName: {
        type: String
    },
    doctorId: {
        type: String
    },
    doctorName: {
        type: String
    },
    invoiceNumber: {
        type: String,
        unique: true
    },
    date: {
        type: String
    },
    services: [{
        type: String
    }],
    items: [{
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number
    }],
    subtotal: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    paid: {
        type: Number,
        default: 0
    },
    balance: {
        type: Number,
        default: 0
    },
    credit: {
        type: Number,
        default: 0
    },
    usedCredit: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        default: "Pending"
    },
    paymentMethod: {
        type: String
    },
    dueDate: {
        type: Date
    },
    paidDate: {
        type: Date
    },
    notes: {
        type: String
    }
}, { timestamps: true });

const Counter = require("./counter");

// Pre-save hook to generate atomic invoice number
InvoiceSchema.pre('save', async function () {
    if (this.isNew) {
        // Initialize credit fields
        if (this.credit === undefined) this.credit = 0;
        if (this.usedCredit === undefined) this.usedCredit = 0;

        if (!this.invoiceNumber) {
            try {
                const seq = await Counter.findOneAndUpdate(
                    { _id: "invoiceNumber" },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );
                this.invoiceNumber = `INV${seq.seq.toString().padStart(4, '0')}`;
            } catch (error) {
                console.error('Error generating atomic invoice number:', error);
                this.invoiceNumber = `INV${Date.now()}`;
            }
        }
    }
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
