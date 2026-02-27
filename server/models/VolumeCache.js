import mongoose from 'mongoose';

const volumeCacheSchema = new mongoose.Schema({
    keyword: {
        type: String,
        required: true,
        unique: true,
    },
    volumeScore: {
        type: Number,
        required: true,
    },
    competitionScore: {
        type: Number,
        required: true,
    },
    rawVolume: {
        type: Number,
        required: true,
    },
    fetchedAt: {
        type: Date,
        default: Date.now,
    }
});

// Create model
const VolumeCache = mongoose.model('VolumeCache', volumeCacheSchema);

export default VolumeCache;
