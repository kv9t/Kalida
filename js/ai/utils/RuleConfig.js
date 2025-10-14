/**
 * RuleConfig.js - Configuration object for game rules
 *
 * Consolidates all rule parameters into a single configuration object
 * to simplify function signatures and make the code more maintainable.
 */

class RuleConfig {
    /**
     * Create a new rule configuration
     * @param {boolean} bounceRuleEnabled - Whether bounce rule is enabled
     * @param {boolean} missingTeethRuleEnabled - Whether missing teeth rule is enabled
     * @param {boolean} wrapRuleEnabled - Whether wrap rule is enabled
     */
    constructor(bounceRuleEnabled = true, missingTeethRuleEnabled = true, wrapRuleEnabled = true) {
        this.bounce = bounceRuleEnabled;
        this.missingTeeth = missingTeethRuleEnabled;
        this.wrap = wrapRuleEnabled;
    }

    /**
     * Create a RuleConfig from individual boolean values
     * @param {boolean} bounce - Whether bounce rule is enabled
     * @param {boolean} missingTeeth - Whether missing teeth rule is enabled
     * @param {boolean} wrap - Whether wrap rule is enabled
     * @returns {RuleConfig} - New rule configuration
     */
    static create(bounce = true, missingTeeth = true, wrap = true) {
        return new RuleConfig(bounce, missingTeeth, wrap);
    }

    /**
     * Create a copy of this configuration
     * @returns {RuleConfig} - Copy of this configuration
     */
    copy() {
        return new RuleConfig(this.bounce, this.missingTeeth, this.wrap);
    }

    /**
     * Convert to a plain object for serialization
     * @returns {Object} - Plain object representation
     */
    toObject() {
        return {
            bounce: this.bounce,
            missingTeeth: this.missingTeeth,
            wrap: this.wrap
        };
    }

    /**
     * Create from a plain object
     * @param {Object} obj - Plain object with rule settings
     * @returns {RuleConfig} - New rule configuration
     */
    static fromObject(obj) {
        return new RuleConfig(
            obj.bounce ?? true,
            obj.missingTeeth ?? true,
            obj.wrap ?? true
        );
    }
}

export default RuleConfig;
