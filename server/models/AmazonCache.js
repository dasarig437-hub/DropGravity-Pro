import mongoose from 'mongoose';

const amazonCacheSchema = new mongoose.Schema({
    keyword: { type: String, required: true, unique: true, index: true },
    products: { type: Array, default: [] },
    fetchedAt: { type: Date, default: Date.now },
});

export default mongoose.model('AmazonCache', amazonCacheSchema);
