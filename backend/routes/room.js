const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Get all active rooms
router.get('/rooms', async (req, res) => {
    try {
        const rooms = await Room.find({ 
            status: { $in: ['waiting', 'active'] },
            isPrivate: false 
        })
        .populate('host', 'username email')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            rooms
        });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rooms'
        });
    }
});

// Get room by ID
router.get('/rooms/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId })
            .populate('host', 'username email')
            .populate('participants.userId', 'username email');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.json({
            success: true,
            room
        });
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch room'
        });
    }
});

// Create room (REST API endpoint)
router.post('/rooms/create', async (req, res) => {
    try {
        const { name, hostId, username, maxParticipants, isPrivate, password } = req.body;

        if (!name || !hostId || !username) {
            return res.status(400).json({
                success: false,
                message: 'Room name, host ID, and username are required'
            });
        }

        const roomId = Room.generateRoomId();

        const room = new Room({
            roomId,
            name,
            host: hostId,
            maxParticipants: maxParticipants || 10,
            isPrivate: isPrivate || false,
            password: password || null,
            participants: [{
                userId: hostId,
                username,
                joinedAt: new Date()
            }]
        });

        await room.save();

        console.log('Room created:', roomId);

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            room: {
                roomId: room.roomId,
                name: room.name,
                host: hostId,
                participants: room.participants.length,
                maxParticipants: room.maxParticipants
            }
        });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create room'
        });
    }
});

// Delete room
router.delete('/rooms/:roomId', async (req, res) => {
    try {
        const room = await Room.findOneAndDelete({ roomId: req.params.roomId });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.json({
            success: true,
            message: 'Room deleted successfully'
        });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete room'
        });
    }
});

module.exports = router;
