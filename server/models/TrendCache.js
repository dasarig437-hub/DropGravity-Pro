import mongoose from 'mongoose';

const trendCacheSchema = new mongoose.Schema({
    keyword: {
        type: String,
        required: true,
        unique: true,
    },
    trendScore: {
        type: Number,
        required: true,
    },
    rawData: {
        type: Array,
        required: true,
    },
    fetchedAt: {
        type: Date,
        default: Date.now,
    }
});

// Create model
const TrendCache = mongoose.model('TrendCache', trendCacheSchema);

export default TrendCache;
