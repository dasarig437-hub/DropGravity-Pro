import { randomUUID } from 'crypto';

/**
 * In-Memory User Store
 * Fallback when MongoDB is unavailable.
 * Users persist only while the server process is running.
 */
class MemoryUserStore {
    constructor() {
        this.users = new Map();
        console.log('📦 Using in-memory user store (no MongoDB)');
    }

    async findOne({ email }) {
        for (const user of this.users.values()) {
            if (user.email === email) return user;
        }
        return null;
    }

    async create({ email, passwordHash, plan = 'free' }) {
        // Check duplicate
        const existing = await this.findOne({ email });
        if (existing) {
            const err = new Error('Duplicate');
            err.code = 11000;
            throw err;
        }

        const user = {
            _id: randomUUID(),
            email,
            passwordHash,
            plan,
            createdAt: new Date(),
        };

        this.users.set(user._id, user);
        return user;
    }
}

export default MemoryUserStore;
