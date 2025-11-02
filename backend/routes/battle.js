const express = require('express');
const router = express.Router();
const battleController = require('../controllers/battleController');
const Battle = require('../models/Battle');

router.get('/battles', battleController.getAllBattles);

// IMPORTANT: History route must come BEFORE the :id route
router.get('/battles/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { filter } = req.query; // all, created, joined

        console.log('=== BATTLE HISTORY REQUEST ===');
        console.log('User ID:', userId);
        console.log('Filter:', filter);

        // First, let's check ALL battles in the database
        const allBattles = await Battle.find({});
        console.log('Total battles in DB:', allBattles.length);
        console.log('All battle statuses:', allBattles.map(b => ({ 
            roomId: b.roomId, 
            status: b.status,
            createdBy: b.createdBy?.toString(),
            players: b.players.map(p => p.userId?.toString())
        })));

        let query = {};

        if (filter === 'created') {
            query = { 
                createdBy: userId, 
                status: { $in: ['finished', 'draw'] } 
            };
        } else if (filter === 'joined') {
            query = {
                'players.userId': userId,
                createdBy: { $ne: userId },
                status: { $in: ['finished', 'draw'] }
            };
        } else {
            // all battles (created or joined) - MongoDB will auto-convert string to ObjectId
            query = {
                $or: [
                    { createdBy: userId },
                    { 'players.userId': userId }
                ],
                status: { $in: ['finished', 'draw'] }
            };
        }

        console.log('Query:', JSON.stringify(query, null, 2));

        const battles = await Battle.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        console.log(`Found ${battles.length} battles matching query`);
        console.log('Matched battles:', battles.map(b => ({
            roomId: b.roomId,
            status: b.status,
            createdBy: b.createdBy?.toString(),
            playerCount: b.players.length,
            hasWinner: !!b.winner,
            hasProblem: !!b.problem
        })));

        res.json({
            success: true,
            battles
        });
    } catch (error) {
        console.error('Get battle history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch battle history',
            error: error.message
        });
    }
});

// Generic :id route comes AFTER specific routes
router.get('/battles/:id', battleController.getBattle);
router.post('/battles', battleController.createBattle);
router.patch('/battles/:id', battleController.updateBattle);

// DELETE route for battles
router.delete('/battles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const battle = await Battle.findOne({ roomId: id });
        
        if (!battle) {
            return res.status(404).json({
                success: false,
                message: 'Battle not found'
            });
        }

        await Battle.findOneAndDelete({ roomId: id });
        
        console.log(`Battle ${id} deleted via REST API`);

        res.json({
            success: true,
            message: 'Battle deleted successfully'
        });
    } catch (error) {
        console.error('Delete battle error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete battle'
        });
    }
});

module.exports = router;
