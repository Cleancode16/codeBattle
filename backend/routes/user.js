const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get leaderboard
router.get('/users/leaderboard', async (req, res) => {
    try {
        const Battle = require('../models/Battle');
        
        // Get all users sorted by score
        const users = await User.find()
            .select('username email codeforcesHandle score')
            .sort({ score: -1 });

        // Enhance each user with battle stats
        const enhancedUsers = await Promise.all(users.map(async (user) => {
            // Get all finished battles for this user
            const userBattles = await Battle.find({
                'players.userId': user._id,
                status: { $in: ['finished', 'draw'] }
            }).sort({ createdAt: -1 });

            const totalBattles = userBattles.length;
            let battlesWon = 0;
            let battlesLost = 0;
            let battlesDraw = 0;
            const last5Games = [];
            let lastGamePoints = 0;

            userBattles.forEach((battle, index) => {
                let result = '';
                let points = 0;

                if (battle.status === 'draw') {
                    battlesDraw++;
                    result = 'D';
                    points = 5;
                } else if (battle.winner && battle.winner.userId.toString() === user._id.toString()) {
                    battlesWon++;
                    result = 'W';
                    points = 10;
                } else {
                    battlesLost++;
                    result = 'L';
                    points = 2;
                }

                // Store last 5 games
                if (index < 5) {
                    last5Games.push(result);
                }

                // Store last game points
                if (index === 0) {
                    lastGamePoints = points;
                }
            });

            return {
                _id: user._id,
                username: user.username,
                email: user.email,
                codeforcesHandle: user.codeforcesHandle,
                score: user.score || 0,
                totalBattles,
                battlesWon,
                battlesLost,
                battlesDraw,
                last5Games,
                lastGamePoints
            };
        }));

        res.json({
            success: true,
            users: enhancedUsers
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leaderboard'
        });
    }
});

// Get user stats
router.get('/users/:userId/stats', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('username email codeforcesHandle score');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const Battle = require('../models/Battle');

        const totalBattles = await Battle.countDocuments({
            players: { $elemMatch: { userId: req.params.userId } },
            status: { $in: ['finished', 'draw'] }
        });

        const wins = await Battle.countDocuments({
            'winner.userId': req.params.userId,
            status: 'finished'
        });

        const draws = await Battle.countDocuments({
            players: { $elemMatch: { userId: req.params.userId } },
            status: 'draw'
        });

        const losses = totalBattles - wins - draws;

        res.json({
            success: true,
            user,
            stats: {
                totalBattles,
                wins,
                losses,
                draws,
                winRate: totalBattles > 0 ? ((wins / totalBattles) * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user stats'
        });
    }
});

module.exports = router;
