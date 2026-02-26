import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
    },
    plan: {
        type: String,
        enum: ['free', 'pro', 'agency', 'enterprise'],
        default: 'free',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Never return passwordHash in JSON responses
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.__v;
    return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
