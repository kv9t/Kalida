/**
 * FlaggedMoveAnalyzer - Tool for accessing and analyzing flagged AI moves
 *
 * Usage in browser console:
 *   const analyzer = new FlaggedMoveAnalyzer(window.firebaseDb);
 *   const flags = await analyzer.getAllFlags();
 *   analyzer.printSummary(flags);
 */

import {
    collection,
    query,
    getDocs,
    where,
    orderBy,
    limit,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class FlaggedMoveAnalyzer {
    constructor(db) {
        this.db = db;
        console.log('🔍 FlaggedMoveAnalyzer initialized');
    }

    /**
     * Get all flagged moves
     */
    async getAllFlags() {
        console.log('Fetching all flagged moves...');
        const flagsRef = collection(this.db, 'flaggedMoves');
        const snapshot = await getDocs(flagsRef);
        const flags = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`✓ Found ${flags.length} flagged moves`);
        return flags;
    }

    /**
     * Get specific flag by ID
     */
    async getFlagById(flagId) {
        const flagRef = doc(this.db, 'flaggedMoves', flagId);
        const flagDoc = await getDoc(flagRef);
        if (flagDoc.exists()) {
            return { id: flagDoc.id, ...flagDoc.data() };
        }
        return null;
    }

    /**
     * Get flags by reason
     */
    async getFlagsByReason(reason) {
        console.log(`Fetching flags with reason: ${reason}...`);
        const flagsRef = collection(this.db, 'flaggedMoves');
        const q = query(flagsRef, where('flagReason', '==', reason));
        const snapshot = await getDocs(q);
        const flags = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`✓ Found ${flags.length} flags with reason "${reason}"`);
        return flags;
    }

    /**
     * Get flags by AI level
     */
    async getFlagsByLevel(level) {
        console.log(`Fetching flags for AI level: ${level}...`);
        const flagsRef = collection(this.db, 'flaggedMoves');
        const q = query(flagsRef, where('aiLevel', '==', level));
        const snapshot = await getDocs(q);
        const flags = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`✓ Found ${flags.length} flags for level "${level}"`);
        return flags;
    }

    /**
     * Get recent flags
     */
    async getRecentFlags(count = 50) {
        console.log(`Fetching ${count} most recent flags...`);
        const flagsRef = collection(this.db, 'flaggedMoves');
        const q = query(flagsRef, orderBy('flaggedAt', 'desc'), limit(count));
        const snapshot = await getDocs(q);
        const flags = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`✓ Found ${flags.length} recent flags`);
        return flags;
    }

    /**
     * Get flags by rules configuration
     */
    async getFlagsByRules(rules) {
        console.log('Fetching flags by rules configuration...');
        const allFlags = await this.getAllFlags();

        // Filter by rules (Firestore doesn't support nested object queries easily)
        const filtered = allFlags.filter(flag => {
            return Object.keys(rules).every(key => {
                return flag.rules && flag.rules[key] === rules[key];
            });
        });

        console.log(`✓ Found ${filtered.length} flags matching rules`);
        return filtered;
    }

    /**
     * Analyze and print summary statistics
     */
    printSummary(flags) {
        if (!flags || flags.length === 0) {
            console.log('No flags to analyze');
            return;
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 FLAGGED MOVES ANALYSIS');
        console.log('='.repeat(60));

        // Total count
        console.log(`\n📌 Total flagged moves: ${flags.length}`);

        // By reason
        console.log('\n🎯 By Reason:');
        const byReason = this.groupBy(flags, 'flagReason');
        console.table(byReason);

        // By AI level
        console.log('\n🤖 By AI Level:');
        const byLevel = this.groupBy(flags, 'aiLevel');
        console.table(byLevel);

        // By game phase (move number)
        console.log('\n⏱️ By Game Phase:');
        const byPhase = this.groupByPhase(flags);
        console.table(byPhase);

        // By rules
        console.log('\n📜 By Rules Configuration:');
        const byRules = this.groupByRules(flags);
        console.table(byRules);

        // User participation
        console.log('\n👥 Top Flaggers:');
        const topFlaggers = this.getTopFlaggers(flags, 5);
        console.table(topFlaggers);

        // Recent flags
        console.log('\n🕐 Most Recent Flags:');
        const recent = flags
            .sort((a, b) => new Date(b.flaggedAt) - new Date(a.flaggedAt))
            .slice(0, 5)
            .map(f => ({
                flagId: f.flagId,
                date: new Date(f.flaggedAt).toLocaleString(),
                reason: f.flagReason,
                level: f.aiLevel,
                move: `[${f.aiMove.row},${f.aiMove.col}]`,
                comment: f.userComment?.substring(0, 30) || 'None'
            }));
        console.table(recent);

        console.log('\n' + '='.repeat(60));
    }

    /**
     * Group flags by a property
     */
    groupBy(flags, property) {
        const groups = {};
        flags.forEach(flag => {
            const key = flag[property] || 'unknown';
            groups[key] = (groups[key] || 0) + 1;
        });
        return groups;
    }

    /**
     * Group flags by game phase
     */
    groupByPhase(flags) {
        const phases = {
            'Opening (1-5)': 0,
            'Early (6-10)': 0,
            'Mid (11-15)': 0,
            'Late (16-20)': 0,
            'Endgame (21+)': 0
        };

        flags.forEach(flag => {
            const move = flag.moveNumber || 0;
            if (move <= 5) phases['Opening (1-5)']++;
            else if (move <= 10) phases['Early (6-10)']++;
            else if (move <= 15) phases['Mid (11-15)']++;
            else if (move <= 20) phases['Late (16-20)']++;
            else phases['Endgame (21+)']++;
        });

        return phases;
    }

    /**
     * Group flags by rules configuration
     */
    groupByRules(flags) {
        const ruleConfigs = {};
        flags.forEach(flag => {
            if (!flag.rules) return;

            const config = [
                flag.rules.bounce ? 'B' : '-',
                flag.rules.wrap ? 'W' : '-',
                flag.rules.missingTeeth ? 'M' : '-',
                flag.rules.knightMove ? 'K' : '-'
            ].join('');

            ruleConfigs[config] = (ruleConfigs[config] || 0) + 1;
        });

        return ruleConfigs;
    }

    /**
     * Get top flaggers
     */
    getTopFlaggers(flags, count = 5) {
        const flaggers = {};
        flags.forEach(flag => {
            const name = flag.userDisplayName || 'Anonymous';
            flaggers[name] = (flaggers[name] || 0) + 1;
        });

        return Object.entries(flaggers)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .reduce((obj, [name, count]) => {
                obj[name] = count;
                return obj;
            }, {});
    }

    /**
     * Export flags to JSON
     */
    exportToJSON(flags) {
        const json = JSON.stringify(flags, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flagged-moves-${Date.now()}.json`;
        a.click();
        console.log('✓ Exported to JSON file');
    }

    /**
     * Export flags to CSV
     */
    exportToCSV(flags) {
        const headers = [
            'flagId', 'flaggedAt', 'gameMode', 'flagReason',
            'moveNumber', 'aiMoveRow', 'aiMoveCol',
            'bounce', 'wrap', 'missingTeeth', 'knightMove',
            'userDisplayName', 'userComment'
        ];

        const rows = flags.map(flag => [
            flag.flagId,
            flag.flaggedAt,
            flag.gameMode,
            flag.flagReason,
            flag.moveNumber,
            flag.aiMove?.row || '',
            flag.aiMove?.col || '',
            flag.rules?.bounce || false,
            flag.rules?.wrap || false,
            flag.rules?.missingTeeth || false,
            flag.rules?.knightMove || false,
            flag.userDisplayName || 'Anonymous',
            (flag.userComment || '').replace(/"/g, '""') // Escape quotes
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flagged-moves-${Date.now()}.csv`;
        a.click();
        console.log('✓ Exported to CSV file');
    }

    /**
     * Load a flagged scenario into the game
     */
    async loadScenario(flagId) {
        const flag = await this.getFlagById(flagId);
        if (!flag) {
            console.error(`Flag not found: ${flagId}`);
            return;
        }

        console.log(`Loading scenario: ${flag.flagReason} - ${flag.userComment || 'No comment'}`);

        // Use the game's debug loader if available
        if (window.KalidaGame?.debug?.loadFlaggedScenario) {
            await window.KalidaGame.debug.loadFlaggedScenario(flagId);
        } else {
            console.error('Game debug loader not available');
            console.log('Flag data:', flag);
        }
    }

    /**
     * Compare AI performance on flagged moves
     * Tests if AI now plays the correct move
     */
    async testAIPerformance(flags) {
        console.log(`\n🧪 Testing AI performance on ${flags.length} flagged moves...`);

        const results = {
            tested: 0,
            improved: 0,
            stillBad: 0,
            errors: 0
        };

        for (const flag of flags) {
            try {
                console.log(`\nTesting flag: ${flag.flagId} (${flag.flagReason})`);

                // Load the scenario
                await this.loadScenario(flag.flagId);

                // Wait for game to load
                await new Promise(resolve => setTimeout(resolve, 500));

                // Get AI move
                // This requires the game to be in a testable state
                // Implementation depends on how game exposes AI testing

                results.tested++;

            } catch (error) {
                console.error(`Error testing ${flag.flagId}:`, error);
                results.errors++;
            }
        }

        console.log('\n📊 AI Performance Test Results:');
        console.table(results);
        return results;
    }

    /**
     * Find patterns in flagged moves
     */
    findPatterns(flags) {
        console.log('\n🔍 Analyzing patterns in flagged moves...\n');

        // Pattern 1: Common board positions
        console.log('📍 Most common positions flagged:');
        const positions = {};
        flags.forEach(flag => {
            const pos = `[${flag.aiMove.row},${flag.aiMove.col}]`;
            positions[pos] = (positions[pos] || 0) + 1;
        });
        const topPositions = Object.entries(positions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        console.table(Object.fromEntries(topPositions));

        // Pattern 2: Correlation between reason and game phase
        console.log('\n🎯 Reason by Game Phase:');
        const reasonByPhase = {};
        flags.forEach(flag => {
            const move = flag.moveNumber || 0;
            let phase;
            if (move <= 5) phase = 'Opening';
            else if (move <= 10) phase = 'Early';
            else if (move <= 15) phase = 'Mid';
            else if (move <= 20) phase = 'Late';
            else phase = 'Endgame';

            const key = `${phase}-${flag.flagReason}`;
            reasonByPhase[key] = (reasonByPhase[key] || 0) + 1;
        });
        console.table(reasonByPhase);

        // Pattern 3: Rules correlation
        console.log('\n📜 Issues by rule combinations:');
        const ruleIssues = {};
        flags.forEach(flag => {
            const rules = flag.rules || {};
            const activeRules = Object.keys(rules)
                .filter(key => rules[key])
                .join(', ') || 'Standard';

            ruleIssues[activeRules] = (ruleIssues[activeRules] || 0) + 1;
        });
        console.table(ruleIssues);
    }
}

// Make available globally for console access
if (typeof window !== 'undefined') {
    window.FlaggedMoveAnalyzer = FlaggedMoveAnalyzer;
    console.log('✓ FlaggedMoveAnalyzer available globally');
}

export default FlaggedMoveAnalyzer;
