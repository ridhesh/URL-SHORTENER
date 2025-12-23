const pool = require('./database');

class AIInsights {
    static async generateInsights(urlId, userId) {
        try {
            // Get URL data
            const [urls] = await pool.execute(
                `SELECT * FROM urls WHERE id = ? AND user_id = ?`,
                [urlId, userId]
            );
            
            if (urls.length === 0) {
                return "🤖 AI Insight: No data available for this URL.";
            }
            
            const url = urls[0];
            const clicks = url.clicks || 0;
            
            // Simple AI analysis based on clicks
            let insights = [];
            
            // AI Personality
            const aiStyles = [
                { emoji: '🤖', style: 'AI Analysis' },
                { emoji: '🧠', style: 'Smart Insight' },
                { emoji: '⚡', style: 'Quick Analysis' }
            ];
            const ai = aiStyles[Math.floor(Math.random() * aiStyles.length)];
            
            // Performance analysis
            if (clicks === 0) {
                insights.push(`${ai.emoji} ${ai.style}: New link ready for action!`);
                insights.push(`💡 Try sharing on social media to get started.`);
            } else if (clicks < 10) {
                insights.push(`${ai.emoji} ${ai.style}: Gaining traction with ${clicks} clicks.`);
                insights.push(`🌟 Keep sharing to build momentum!`);
            } else if (clicks < 50) {
                insights.push(`${ai.emoji} ${ai.style}: Good engagement! ${clicks} clicks so far.`);
                insights.push(`📈 Growing steadily.`);
            } else if (clicks < 100) {
                insights.push(`${ai.emoji} ${ai.style}: Strong performance! ${clicks} clicks and counting.`);
                insights.push(`🔥 Your content is resonating well.`);
            } else {
                insights.push(`${ai.emoji} ${ai.style}: Excellent! ${clicks} clicks - top performer!`);
                insights.push(`🏆 Champion-level engagement.`);
            }
            
            // Get some basic analytics
            const [clickData] = await pool.execute(
                `SELECT 
                    COUNT(*) as total_clicks,
                    MIN(clicked_at) as first_click,
                    MAX(clicked_at) as last_click
                 FROM clicks 
                 WHERE url_id = ?`,
                [urlId]
            );
            
            if (clickData[0] && clickData[0].first_click) {
                const firstClick = new Date(clickData[0].first_click);
                const daysActive = Math.floor((new Date() - firstClick) / (1000 * 60 * 60 * 24));
                
                if (daysActive > 0) {
                    const clicksPerDay = (clicks / daysActive).toFixed(1);
                    insights.push(`📅 Active for ${daysActive} day${daysActive === 1 ? '' : 's'}`);
                    insights.push(`📊 Average: ${clicksPerDay} clicks per day`);
                }
            }
            
            // Time-based suggestions
            const hour = new Date().getHours();
            if (hour >= 9 && hour <= 17) {
                insights.push(`⏰ Good time to share: People are active during work hours.`);
            } else {
                insights.push(`🌙 Evening hours: Perfect for leisure content sharing.`);
            }
            
            // Final recommendation
            if (clicks < 5) {
                insights.push(`💡 AI Tip: Share on 2-3 different platforms for better reach.`);
            } else if (clicks < 20) {
                insights.push(`💡 AI Tip: Try adding a compelling description when sharing.`);
            } else {
                insights.push(`💡 AI Tip: Consider creating a QR code for offline sharing.`);
            }
            
            return insights.join('\n\n');
            
        } catch (error) {
            console.log('AI Insights error:', error.message);
            return "🤖 AI is analyzing your link performance...";
        }
    }
}

module.exports = AIInsights;