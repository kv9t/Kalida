/**
 * PlayerMarkerRenderer.js - Handles drawing SVG markers for players
 * 
 * This utility class is responsible for creating SVG representations
 * of player markers (X and O) and rendering them into game cells.
 * 
 * Separation of concerns:
 * - BoardUI.js handles board updates and game state
 * - PlayerMarkerRenderer.js handles visual marker creation
 */
class PlayerMarkerRenderer {
    /**
     * Create a new player marker renderer
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Default configuration
        this.config = {
            size: options.size || 24,
            strokeWidth: options.strokeWidth || 1.5,
            className: options.className || 'player-marker',
            // Animation options
            enableHoverEffect: options.enableHoverEffect !== false,
            enableAppearAnimation: options.enableAppearAnimation !== false,
            ...options
        };
    }
    
    /**
     * Render a player marker into a cell element
     * @param {HTMLElement} cellElement - The cell to render into
     * @param {string} player - Player marker ('X', 'O', or '')
     * @param {Object} options - Optional rendering options
     */
    renderMarker(cellElement, player, options = {}) {
        // Clear the cell first
        cellElement.innerHTML = '';
        
        // Remove old marker classes
        cellElement.classList.remove('has-marker', 'marker-x', 'marker-o');
        
        if (player === '') {
            // Empty cell - nothing to render
            return;
        }
        
        // Create the appropriate marker
        let markerElement;
        
        if (player === 'X') {
            markerElement = this.createStarMarker(options);
            cellElement.classList.add('marker-x');
        } else if (player === 'O') {
            markerElement = this.createCircleMarker(options);
            cellElement.classList.add('marker-o');
        } else {
            console.warn(`Unknown player: ${player}`);
            return;
        }
        
        // Add common marker class
        cellElement.classList.add('has-marker');
        
        // Insert the marker
        cellElement.appendChild(markerElement);
        
        // Add appear animation if enabled
        if (this.config.enableAppearAnimation) {
            this.addAppearAnimation(markerElement);
        }
    }
    
    /**
     * Create an SVG star marker for Player X
     * @param {Object} options - Override options for this marker
     * @returns {SVGElement} - SVG star element
     */
    createStarMarker(options = {}) {
        const config = { ...this.config, ...options };
        const size = config.size;
        
        // Create SVG element
        const svg = this.createBaseSVG(size, config);
        
        // Star shape coordinates (5-pointed star)
        const starPoints = "12,2 15,9 22,9 17,14 19,22 12,18 5,22 7,14 2,9 9,9";
        
        // Create star polygon
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        star.setAttribute('points', starPoints);
        star.setAttribute('fill', 'currentColor');
        star.setAttribute('stroke', 'currentColor');
        star.setAttribute('stroke-width', config.strokeWidth);
        star.setAttribute('stroke-linejoin', 'round'); // Smoother corners
        
        svg.appendChild(star);
        
        return svg;
    }
    
    /**
     * Create an SVG circle marker for Player O
     * @param {Object} options - Override options for this marker
     * @returns {SVGElement} - SVG circle element
     */
    createCircleMarker(options = {}) {
        const config = { ...this.config, ...options };
        const size = config.size;
        
        // Create SVG element
        const svg = this.createBaseSVG(size, config);
        
        // Circle parameters
        const radius = (size * 0.35); // 35% of size for nice proportions
        const center = size / 2;
        
        // Create circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', center);
        circle.setAttribute('cy', center);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', 'none'); // Hollow circle
        circle.setAttribute('stroke', 'currentColor');
        circle.setAttribute('stroke-width', config.strokeWidth * 1.5); // Slightly thicker for visibility
        
        svg.appendChild(circle);
        
        return svg;
    }
    
    /**
     * Create a base SVG element with common attributes
     * @param {number} size - Size of the SVG
     * @param {Object} config - Configuration object
     * @returns {SVGElement} - Base SVG element
     */
    createBaseSVG(size, config) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', `0 0 24 24`); // Fixed viewBox for consistent scaling
        svg.setAttribute('class', config.className);
        
        // Add accessibility
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-hidden', 'true'); // Decorative, screen readers will use game state
        
        return svg;
    }
    
    /**
     * Add appear animation to a marker
     * @param {HTMLElement} markerElement - The marker element to animate
     */
    addAppearAnimation(markerElement) {
        // Start invisible and small
        markerElement.style.opacity = '0';
        markerElement.style.transform = 'scale(0.1)';
        markerElement.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        
        // Animate to full size
        requestAnimationFrame(() => {
            markerElement.style.opacity = '1';
            markerElement.style.transform = 'scale(1)';
        });
    }
    
    /**
     * Create a marker preview (useful for UI elements like score boards)
     * @param {string} player - Player marker ('X' or 'O')
     * @param {number} size - Size of the preview
     * @returns {HTMLElement} - Marker element ready for insertion
     */
    createMarkerPreview(player, size = 16) {
        const tempDiv = document.createElement('div');
        tempDiv.style.display = 'inline-flex';
        tempDiv.style.alignItems = 'center';
        tempDiv.style.justifyContent = 'center';
        
        this.renderMarker(tempDiv, player, { 
            size, 
            enableAppearAnimation: false 
        });
        
        return tempDiv.firstChild; // Return just the SVG
    }
    
    /**
     * Update configuration options
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    
    /**
     * Get different star styles for customization
     * @param {string} style - Style name ('default', 'outline', 'detailed')
     * @returns {Object} - Configuration for the style
     */
    static getStarStyle(style) {
        const styles = {
            default: {
                strokeWidth: 1,
                fill: 'currentColor'
            },
            outline: {
                strokeWidth: 2,
                fill: 'none'
            },
            detailed: {
                strokeWidth: 0.5,
                fill: 'currentColor'
            }
        };
        
        return styles[style] || styles.default;
    }
    
    /**
     * Get different circle styles for customization
     * @param {string} style - Style name ('default', 'thick', 'thin')
     * @returns {Object} - Configuration for the style
     */
    static getCircleStyle(style) {
        const styles = {
            default: {
                strokeWidth: 1.5
            },
            thick: {
                strokeWidth: 2.5
            },
            thin: {
                strokeWidth: 1
            }
        };
        
        return styles[style] || styles.default;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerMarkerRenderer;
}