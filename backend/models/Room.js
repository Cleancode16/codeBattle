const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    maxParticipants: {
        type: Number,
        default: 10
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'completed', 'cancelled'],
        default: 'waiting'
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Generate unique room ID
roomSchema.statics.generateRoomId = function() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Add participant to room
roomSchema.methods.addParticipant = function(userId, username) {
    const exists = this.participants.some(p => p.userId.toString() === userId.toString());
    
    if (!exists && this.participants.length < this.maxParticipants) {
        this.participants.push({
            userId,
            username,
            joinedAt: new Date()
        });
        return true;
    }
    return false;
};

// Remove participant from room
roomSchema.methods.removeParticipant = function(userId) {
    this.participants = this.participants.filter(
        p => p.userId.toString() !== userId.toString()
    );
};

module.exports = mongoose.model('Room', roomSchema);
