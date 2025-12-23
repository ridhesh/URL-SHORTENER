const pool = require('./database');

class SimpleInsights {
    // Human-like analysis of URL data
    static async getInsights(urlId, userId) {
        try {
            // Get URL info
            const [urlData] = await pool.execute(
                `SELECT * FROM urls WHERE id = ? AND user_id = ?`,
                [urlId, userId]
            );
            
            if (urlData.length === 0) {
                return "🔍 No data available for this URL.";
            }
            
            const url = urlData[0];
            const clicks = url.clicks;
            
            // Get recent activity
            const [recentData] = await pool.execute(
                `SELECT 
                    DATE(clicked_at) as click_date,
                    COUNT(*) as daily_clicks
                 FROM clicks 
                 WHERE url_id = ?
                 GROUP BY DATE(clicked_at)
                 ORDER BY click_date DESC
                 LIMIT 7`,
                [urlId]
            );
            
            // Get hour patterns
            const [hourData] = await pool.execute(
                `SELECT 
                    HOUR(clicked_at) as hour,
                    COUNT(*) as hour_clicks
                 FROM clicks 
                 WHERE url_id = ?
                 GROUP BY HOUR(clicked_at)
                 ORDER BY hour_clicks DESC
                 LIMIT 3`,
                [urlId]
            );
            
            // Start building insights
            const insights = [];
            
            // 1. Overall performance
            if (clicks === 0) {
                insights.push("🚀 New link! Start sharing to get your first click.");
            } else if (clicks < 5) {
                insights.push(`👍 Getting started with ${clicks} clicks. Keep going!`);
            } else if (clicks < 20) {
                insights.push(`📈 Good momentum! ${clicks} clicks so far.`);
            } else if (clicks < 100) {
                insights.push(`🔥 Hot link! ${clicks} clicks and growing.`);
            } else {
                insights.push(`🎉 Amazing! ${clicks} total clicks!`);
            }
            
            // 2. Recent activity
            if (recentData.length > 0) {
                const today = new Date().toISOString().split('T')[0];
                const todayClicks = recentData.find(d => d.click_date === today)?.daily_clicks || 0;
                
                if (todayClicks > 0) {
                    insights.push(`✨ ${todayClicks} clicks today.`);
                }
                
                // Check if growth is happening
                if (recentData.length >= 2) {
                    const yesterdayClicks = recentData[1]?.daily_clicks || 0;
                    const dayBeforeClicks = recentData[2]?.daily_clicks || 0;
                    
                    if (todayClicks > yesterdayClicks && todayClicks > dayBeforeClicks) {
                        insights.push("📊 Growing faster each day!");
                    }
                }
            }
            
            // 3. Best times
            if (hourData.length > 0) {
                const bestHour = hourData[0];
                const time = this.formatTime(bestHour.hour);
                insights.push(`⏰ Best time: ${time} (${bestHour.hour_clicks} clicks)`);
            }
            
            // 4. Age of link
            const createdDate = new Date(url.created_at);
            const daysOld = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
            
            if (daysOld === 0) {
                insights.push("🆕 Created today!");
            } else if (daysOld === 1) {
                insights.push("📅 Created yesterday.");
            } else if (daysOld < 7) {
                insights.push(`📅 ${daysOld} days old.`);
            } else if (daysOld < 30) {
                const weeks = Math.floor(daysOld / 7);
                insights.push(`📅 ${weeks} week${weeks > 1 ? 's' : ''} old.`);
            }
            
            // 5. Suggestions based on performance
            if (clicks > 10) {
                if (hourData.length > 0) {
                    const popularHour = hourData[0].hour;
                    if (popularHour >= 9 && popularHour <= 17) {
                        insights.push("💡 People love your links during work hours!");
                    } else {
                        insights.push("💡 Great evening/off-hours engagement!");
                    }
                }
            }
            
            // Add one final encouraging message
            const encouraging = [
                "Keep sharing!",
                "Great work!",
                "You're doing amazing!",
                "Keep it up!",
                "Awesome progress!"
            ];
            insights.push(encouraging[Math.floor(Math.random() * encouraging.length)]);
            
            return insights.join(' ');
            
        } catch (error) {
            console.log("💭 Insights error:", error.message);
            return "📊 Checking your link's performance...";
        }
    }
    
    static formatTime(hour) {
        if (hour === 0) return "12 AM";
        if (hour < 12) return `${hour} AM`;
        if (hour === 12) return "12 PM";
        return `${hour - 12} PM`;
    }
    
    // Get basic stats for dashboard
    static async getQuickStats(userId) {
        try {
            const [stats] = await pool.execute(
                `SELECT 
                    COUNT(*) as total_urls,
                    SUM(clicks) as total_clicks,
                    AVG(clicks) as avg_clicks
                 FROM urls 
                 WHERE user_id = ?`,
                [userId]
            );
            
            return stats[0] || { total_urls: 0, total_clicks: 0, avg_clicks: 0 };
        } catch (error) {
            return { total_urls: 0, total_clicks: 0, avg_clicks: 0 };
        }
    }
}

module.exports = SimpleInsights;