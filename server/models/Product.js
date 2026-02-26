import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'userId is required'],
        index: true,
    },
    productName: {
        type: String,
        required: [true, 'productName is required'],
        trim: true,
    },
    metrics: {
        type: Object,
        required: [true, 'metrics are required'],
    },
    score: {
        type: Number,
        required: [true, 'score is required'],
    },
    grade: {
        type: String,
        required: [true, 'grade is required'],
        enum: ['A', 'B', 'C', 'D', 'F'],
    },
    version: {
        type: Number,
        default: 1,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index: prevents exact duplicates, allows versioned re-grades
productSchema.index({ userId: 1, productName: 1, version: 1 }, { unique: true });

const Product = mongoose.model('Product', productSchema);

export default Product;
