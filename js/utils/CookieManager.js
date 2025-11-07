/**
 * CookieManager.js - Utility for managing cookies in Kalida
 * 
 * Handles reading, writing, and managing cookies for game preferences
 * and state persistence.
 */
class CookieManager {
    constructor() {
        // Cookie names used by the application
        this.cookieNames = {
            CONSENT: 'kalida_cookie_consent',
            TUTORIAL_COMPLETED: 'kalida_tutorial_completed',
            GAME_MODE: 'kalida_game_mode',
            ROUND_SCORES: 'kalida_round_scores',
            MATCH_SCORES: 'kalida_match_scores',
            RULE_PREFERENCES: 'kalida_rule_preferences',
            LAST_ROOM: 'kalida_last_room'
        };
        
        // Default expiration: 30 days from now
        this.defaultExpireDays = 30;
    }
    
    /**
     * Check if user has consented to cookies
     * @returns {boolean|null} - true if consented, false if declined, null if not set
     */
    hasConsent() {
        const consent = this.getCookie(this.cookieNames.CONSENT);
        if (consent === null) return null;
        return consent === 'true';
    }
    
    /**
     * Set cookie consent status
     * @param {boolean} consented - Whether user consented
     */
    setConsent(consented) {
        // Store consent for 1 year
        this.setCookie(this.cookieNames.CONSENT, consented.toString(), 365);
    }
    
    /**
     * Save tutorial completion status
     * @param {boolean} completed - Whether tutorial was completed
     */
    saveTutorialCompleted(completed) {
        if (!this.hasConsent()) return false;
        this.setCookie(this.cookieNames.TUTORIAL_COMPLETED, completed.toString());
        return true;
    }
    
    /**
     * Check if tutorial was completed
     * @returns {boolean} - Whether tutorial was completed
     */
    wasTutorialCompleted() {
        if (!this.hasConsent()) return false;
        const completed = this.getCookie(this.cookieNames.TUTORIAL_COMPLETED);
        return completed === 'true';
    }
    
    /**
     * Save game mode preference
     * @param {string} gameMode - Selected game mode ('human', 'level1', etc.)
     */
    saveGameMode(gameMode) {
        if (!this.hasConsent()) return false;
        this.setCookie(this.cookieNames.GAME_MODE, gameMode);
        return true;
    }
    
    /**
     * Get saved game mode
     * @returns {string|null} - Saved game mode or null if not set/no consent
     */
    getSavedGameMode() {
        if (!this.hasConsent()) return null;
        return this.getCookie(this.cookieNames.GAME_MODE);
    }
    
    /**
     * Save round scores
     * @param {Object} scores - Scores object {X: number, O: number}
     */
    saveRoundScores(scores) {
        if (!this.hasConsent()) return false;
        this.setCookie(this.cookieNames.ROUND_SCORES, JSON.stringify(scores));
        return true;
    }
    
    /**
     * Get saved round scores
     * @returns {Object|null} - Saved scores or null if not set/no consent
     */
    getSavedRoundScores() {
        if (!this.hasConsent()) return null;
        const scoresStr = this.getCookie(this.cookieNames.ROUND_SCORES);
        if (!scoresStr) return null;
        
        try {
            return JSON.parse(scoresStr);
        } catch (error) {
            console.error('Error parsing saved round scores:', error);
            return null;
        }
    }
    
    /**
     * Save match scores
     * @param {Object} matchScores - Match scores object {X: number, O: number}
     */
    saveMatchScores(matchScores) {
        if (!this.hasConsent()) return false;
        this.setCookie(this.cookieNames.MATCH_SCORES, JSON.stringify(matchScores));
        return true;
    }
    
    /**
     * Get saved match scores
     * @returns {Object|null} - Saved match scores or null if not set/no consent
     */
    getSavedMatchScores() {
        if (!this.hasConsent()) return null;
        const scoresStr = this.getCookie(this.cookieNames.MATCH_SCORES);
        if (!scoresStr) return null;
        
        try {
            return JSON.parse(scoresStr);
        } catch (error) {
            console.error('Error parsing saved match scores:', error);
            return null;
        }
    }
    
    /**
     * Save rule preferences (for human vs human mode)
     * @param {Object} rules - Rule settings {bounce: boolean, wrap: boolean, etc.}
     */
    saveRulePreferences(rules) {
        if (!this.hasConsent()) return false;
        this.setCookie(this.cookieNames.RULE_PREFERENCES, JSON.stringify(rules));
        return true;
    }
    
    /**
     * Get saved rule preferences
     * @returns {Object|null} - Saved rule preferences or null if not set/no consent
     */
    getSavedRulePreferences() {
        if (!this.hasConsent()) return null;
        const rulesStr = this.getCookie(this.cookieNames.RULE_PREFERENCES);
        if (!rulesStr) return null;
        
        try {
            return JSON.parse(rulesStr);
        } catch (error) {
            console.error('Error parsing saved rule preferences:', error);
            return null;
        }
    }
    
    /**
     * Save last room ID
     * @param {string} roomId - Room ID
     */
    saveLastRoom(roomId) {
        if (!this.hasConsent()) return false;
        this.setCookie(this.cookieNames.LAST_ROOM, roomId);
        return true;
    }

    /**
     * Get last room ID
     * @returns {string|null} - Last room ID or null
     */
    getLastRoom() {
        if (!this.hasConsent()) return null;
        return this.getCookie(this.cookieNames.LAST_ROOM);
    }

    /**
     * Clear all game-related cookies (keep consent)
     */
    clearGameData() {
        this.deleteCookie(this.cookieNames.TUTORIAL_COMPLETED);
        this.deleteCookie(this.cookieNames.GAME_MODE);
        this.deleteCookie(this.cookieNames.ROUND_SCORES);
        this.deleteCookie(this.cookieNames.MATCH_SCORES);
        this.deleteCookie(this.cookieNames.RULE_PREFERENCES);
        this.deleteCookie(this.cookieNames.LAST_ROOM);
    }
    
    /**
     * Clear all cookies including consent
     */
    clearAllCookies() {
        Object.values(this.cookieNames).forEach(cookieName => {
            this.deleteCookie(cookieName);
        });
    }
    
    // ========== Low-level cookie operations ==========
    
    /**
     * Set a cookie
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {number} expireDays - Days until expiration (default: 30)
     */
    setCookie(name, value, expireDays = this.defaultExpireDays) {
        try {
            const date = new Date();
            date.setTime(date.getTime() + (expireDays * 24 * 60 * 60 * 1000));
            const expires = `expires=${date.toUTCString()}`;
            
            // Set cookie with path=/ so it's available throughout the site
            document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/;SameSite=Lax`;
            
            console.log(`Cookie set: ${name}=${value}`);
        } catch (error) {
            console.error('Error setting cookie:', error);
        }
    }
    
    /**
     * Get a cookie value
     * @param {string} name - Cookie name
     * @returns {string|null} - Cookie value or null if not found
     */
    getCookie(name) {
        try {
            // Parse document.cookie string to find our cookie
            const nameEQ = `${name}=`;
            const cookies = document.cookie.split(';');
            
            for (let cookie of cookies) {
                // Remove leading/trailing whitespace
                cookie = cookie.trim();
                
                // Check if this cookie starts with our name
                if (cookie.indexOf(nameEQ) === 0) {
                    const value = cookie.substring(nameEQ.length);
                    return decodeURIComponent(value);
                }
            }
            
            return null; // Cookie not found
        } catch (error) {
            console.error('Error getting cookie:', error);
            return null;
        }
    }
    
    /**
     * Delete a cookie
     * @param {string} name - Cookie name
     */
    deleteCookie(name) {
        try {
            // Set cookie with past expiration date to delete it
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/`;
            console.log(`Cookie deleted: ${name}`);
        } catch (error) {
            console.error('Error deleting cookie:', error);
        }
    }
    
    /**
     * Check if cookies are enabled in the browser
     * @returns {boolean} - Whether cookies are enabled
     */
    areCookiesEnabled() {
        try {
            // Try to set and read a test cookie
            const testCookie = 'kalida_test_cookie';
            this.setCookie(testCookie, 'test', 1);
            const isEnabled = this.getCookie(testCookie) === 'test';
            this.deleteCookie(testCookie);
            return isEnabled;
        } catch (error) {
            console.error('Error checking if cookies are enabled:', error);
            return false;
        }
    }
}

export default CookieManager;