/**
 * Quick Analyze Flags - Console Script
 *
 * Paste this into the browser console when Kalida is running
 * to immediately analyze all flagged moves.
 *
 * Usage:
 *   1. Open Kalida in browser (on the multiplayer branch)
 *   2. Open browser console (F12)
 *   3. Copy and paste this entire script
 *   4. Results will be displayed in console
 */

(async function quickAnalyzeFlags() {
    console.log('🚀 Quick Analyze Flags - Starting...\n');

    try {
        // Import Firestore functions
        const { collection, getDocs } = await import(
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'
        );

        // Check if Firebase is initialized
        if (!window.firebaseDb) {
            console.error('❌ Firebase not initialized. Make sure you\'re on the multiplayer branch.');
            return;
        }

        console.log('✓ Firebase connected\n');

        // Fetch all flagged moves
        console.log('📥 Fetching flagged moves from Firestore...');
        const flagsRef = collection(window.firebaseDb, 'flaggedMoves');
        const snapshot = await getDocs(flagsRef);
        const flags = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✓ Found ${flags.length} flagged moves\n`);

        if (flags.length === 0) {
            console.log('No flagged moves yet. Start playing and flag some AI moves!');
            return;
        }

        // Analysis 1: Summary Statistics
        console.log('='.repeat(60));
        console.log('📊 SUMMARY STATISTICS');
        console.log('='.repeat(60));
        console.log(`Total Flags: ${flags.length}\n`);

        // By reason
        console.log('🎯 By Reason:');
        const byReason = {};
        flags.forEach(f => {
            const reason = f.flagReason || 'unknown';
            byReason[reason] = (byReason[reason] || 0) + 1;
        });
        console.table(byReason);

        // By AI level
        console.log('\n🤖 By AI Level:');
        const byLevel = {};
        flags.forEach(f => {
            const level = f.aiLevel || 'unknown';
            byLevel[level] = (byLevel[level] || 0) + 1;
        });
        console.table(byLevel);

        // By game phase
        console.log('\n⏱️ By Game Phase:');
        const byPhase = {
            'Opening (1-5)': 0,
            'Early (6-10)': 0,
            'Mid (11-15)': 0,
            'Late (16-20)': 0,
            'Endgame (21+)': 0
        };
        flags.forEach(f => {
            const move = f.moveNumber || 0;
            if (move <= 5) byPhase['Opening (1-5)']++;
            else if (move <= 10) byPhase['Early (6-10)']++;
            else if (move <= 15) byPhase['Mid (11-15)']++;
            else if (move <= 20) byPhase['Late (16-20)']++;
            else byPhase['Endgame (21+)']++;
        });
        console.table(byPhase);

        // Analysis 2: Most Recent Flags
        console.log('\n' + '='.repeat(60));
        console.log('🕐 5 MOST RECENT FLAGS');
        console.log('='.repeat(60));
        const recent = flags
            .sort((a, b) => new Date(b.flaggedAt) - new Date(a.flaggedAt))
            .slice(0, 5)
            .map(f => ({
                Date: new Date(f.flaggedAt).toLocaleString(),
                Reason: f.flagReason,
                Level: f.aiLevel,
                'Move #': f.moveNumber,
                'AI Move': `[${f.aiMove.row},${f.aiMove.col}]`,
                Comment: (f.userComment || 'None').substring(0, 30)
            }));
        console.table(recent);

        // Analysis 3: Pattern Detection
        console.log('\n' + '='.repeat(60));
        console.log('🔍 PATTERN ANALYSIS');
        console.log('='.repeat(60));

        // Most common positions
        console.log('\n📍 Most Flagged Positions:');
        const positions = {};
        flags.forEach(f => {
            const pos = `[${f.aiMove.row},${f.aiMove.col}]`;
            positions[pos] = (positions[pos] || 0) + 1;
        });
        const topPositions = Object.entries(positions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .reduce((obj, [pos, count]) => {
                obj[pos] = count;
                return obj;
            }, {});
        console.table(topPositions);

        // Rules correlation
        console.log('\n📜 Flags by Rule Configuration:');
        const ruleConfigs = {};
        flags.forEach(f => {
            if (!f.rules) return;
            const config = [
                f.rules.bounce ? 'Bounce' : '',
                f.rules.wrap ? 'Wrap' : '',
                f.rules.missingTeeth ? 'MissingTeeth' : '',
                f.rules.knightMove ? 'Knight' : ''
            ].filter(x => x).join('+') || 'Standard';
            ruleConfigs[config] = (ruleConfigs[config] || 0) + 1;
        });
        console.table(ruleConfigs);

        // Analysis 4: Action Items
        console.log('\n' + '='.repeat(60));
        console.log('✅ RECOMMENDED ACTIONS');
        console.log('='.repeat(60));

        const actions = [];

        // Check for missed wins
        const missedWins = byReason.missed_win || 0;
        if (missedWins > 0) {
            actions.push(`🎯 Fix ${missedWins} missed win scenarios - HIGH PRIORITY`);
        }

        // Check for missed blocks
        const missedBlocks = byReason.missed_block || 0;
        if (missedBlocks > 0) {
            actions.push(`🛡️ Fix ${missedBlocks} missed block scenarios - HIGH PRIORITY`);
        }

        // Check for weak positions
        const weakPos = byReason.weak_position || 0;
        if (weakPos > 0) {
            actions.push(`💪 Improve evaluation for ${weakPos} weak position cases`);
        }

        // Check which level needs most work
        const worstLevel = Object.entries(byLevel)
            .sort((a, b) => b[1] - a[1])[0];
        if (worstLevel) {
            actions.push(`🤖 ${worstLevel[0]} has most issues (${worstLevel[1]} flags) - focus here`);
        }

        actions.forEach((action, i) => {
            console.log(`${i + 1}. ${action}`);
        });

        // Provide next steps
        console.log('\n' + '='.repeat(60));
        console.log('📝 NEXT STEPS');
        console.log('='.repeat(60));
        console.log(`
1. Load specific scenarios:
   await window.KalidaGame.debug.loadFlaggedScenario('${flags[0]?.flagId}')

2. Use the analyzer tool for more:
   const analyzer = new FlaggedMoveAnalyzer(window.firebaseDb);
   await analyzer.getFlagsByReason('missed_win')

3. Open the dashboard:
   Open flag-analyzer.html in browser for visual interface

4. Export data for further analysis:
   analyzer.exportToJSON(flags)
   analyzer.exportToCSV(flags)

5. Test AI performance:
   await analyzer.testAIPerformance(flags)
        `);

        // Store flags globally for further use
        window.analyzedFlags = flags;
        console.log('\n✓ Flags stored in window.analyzedFlags for further analysis\n');

    } catch (error) {
        console.error('❌ Error analyzing flags:', error);
        console.error('\nMake sure you\'re running this on the multiplayer branch with Firebase initialized.');
    }
})();
