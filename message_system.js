/**
 * message_system.js - A customizable message display system for PixiJS games
 * 
 * This module creates message objects that can be displayed on the game screen
 * with various styling options, animations, and durations.
 */

class MessageSystem {
    /**
     * Create a new MessageSystem
     * @param {PIXI.Container} container - The container to add messages to
     * @param {Object} defaultOptions - Default styling options
     */
    constructor(container, defaultOptions = {}) {
        this.container = container;
        this.activeMessages = [];
        this.defaultOptions = {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xFFFFFF,
            align: 'center',
            stroke: 0x000000,
            strokeThickness: 0,
            dropShadow: false,
            dropShadowColor: 0x000000,
            dropShadowBlur: 0,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 0,
            x: 400,
            y: 300,
            anchorX: 0.5,
            anchorY: 0.5,
            duration: 3000,
            fadeIn: 500,
            fadeOut: 500,
            background: false,
            backgroundAlpha: 0.5,
            backgroundPadding: 10,
            backgroundRadius: 5,
            backgroundFill: 0x000000,
            maxWidth: null,
            ...defaultOptions
        };
    }

    /**
     * Create and display a message on the screen
     * @param {string} text - Message text content
     * @param {Object} options - Optional styling and behavior settings
     * @returns {Object} Message object with control methods
     */
    showMessage(text, options = {}) {
        // Combine default options with provided options
        const settings = { ...this.defaultOptions, ...options };
        
        // Create text style object
        const textStyle = new PIXI.TextStyle({
            fontFamily: settings.fontFamily,
            fontSize: settings.fontSize,
            fill: settings.fill,
            align: settings.align,
            stroke: settings.stroke,
            strokeThickness: settings.strokeThickness,
            dropShadow: settings.dropShadow,
            dropShadowColor: settings.dropShadowColor,
            dropShadowBlur: settings.dropShadowBlur,
            dropShadowAngle: settings.dropShadowAngle,
            dropShadowDistance: settings.dropShadowDistance,
            wordWrap: settings.maxWidth !== null,
            wordWrapWidth: settings.maxWidth
        });
        
        // Create message container
        const messageContainer = new PIXI.Container();
        messageContainer.x = settings.x;
        messageContainer.y = settings.y;
        messageContainer.alpha = settings.fadeIn > 0 ? 0 : 1;
        
        // Create text object
        const textObject = new PIXI.Text(text, textStyle);
        textObject.anchor.set(settings.anchorX, settings.anchorY);
        
        // Add background if needed
        let background = null;
        if (settings.background) {
            background = new PIXI.Graphics();
            background.beginFill(settings.backgroundFill, settings.backgroundAlpha);
            background.drawRoundedRect(
                -settings.backgroundPadding - textObject.width * settings.anchorX,
                -settings.backgroundPadding - textObject.height * settings.anchorY,
                textObject.width + (settings.backgroundPadding * 2),
                textObject.height + (settings.backgroundPadding * 2),
                settings.backgroundRadius
            );
            background.endFill();
            messageContainer.addChild(background);
        }
        
        // Add text to container
        messageContainer.addChild(textObject);
        
        // Add message to stage
        this.container.addChild(messageContainer);
        
        // Message data object
        const messageData = {
            container: messageContainer,
            text: textObject,
            background: background,
            settings: settings,
            createdAt: Date.now(),
            timers: {
                hide: null,
                remove: null
            },
            isVisible: true
        };
        
        // Add to active messages
        this.activeMessages.push(messageData);
        
        // Handle animations and duration
        this._animateMessage(messageData);
        
        // Return message control object
        return {
            text: text,
            hide: () => this._hideMessage(messageData),
            update: (newText) => this._updateMessage(messageData, newText),
            remove: () => this._removeMessage(messageData),
            isVisible: () => messageData.isVisible
        };
    }
    
    /**
     * Handle message animations and timing
     * @param {Object} messageData - Message data object
     * @private
     */
    _animateMessage(messageData) {
        const { settings } = messageData;
        
        // Fade in animation
        if (settings.fadeIn > 0) {
            const fadeInTween = (delta) => {
                const elapsedTime = Date.now() - messageData.createdAt;
                if (elapsedTime < settings.fadeIn) {
                    messageData.container.alpha = elapsedTime / settings.fadeIn;
                } else {
                    messageData.container.alpha = 1;
                    app.ticker.remove(fadeInTween);
                }
            };
            app.ticker.add(fadeInTween);
        }
        
        // Set hide timer if duration is provided
        if (settings.duration > 0) {
            messageData.timers.hide = setTimeout(() => {
                this._hideMessage(messageData);
            }, settings.duration - settings.fadeOut);
        }
    }
    
    /**
     * Hide message with fade out animation
     * @param {Object} messageData - Message data object
     * @private
     */
    _hideMessage(messageData) {
        if (!messageData.isVisible) return;
        
        const { settings } = messageData;
        messageData.isVisible = false;
        
        // Clear timers
        if (messageData.timers.hide) {
            clearTimeout(messageData.timers.hide);
        }
        
        // Start time for fade out
        const fadeStartTime = Date.now();
        
        // Fade out animation
        if (settings.fadeOut > 0) {
            const fadeOutTween = (delta) => {
                const elapsedTime = Date.now() - fadeStartTime;
                if (elapsedTime < settings.fadeOut) {
                    messageData.container.alpha = 1 - (elapsedTime / settings.fadeOut);
                } else {
                    messageData.container.alpha = 0;
                    app.ticker.remove(fadeOutTween);
                    this._removeMessage(messageData);
                }
            };
            app.ticker.add(fadeOutTween);
        } else {
            // Instant hide
            messageData.container.alpha = 0;
            this._removeMessage(messageData);
        }
    }
    
    /**
     * Update message text content
     * @param {Object} messageData - Message data object
     * @param {string} newText - New text content
     * @private
     */
    _updateMessage(messageData, newText) {
        messageData.text.text = newText;
        
        // Update background if present
        if (messageData.background && messageData.settings.background) {
            const { settings, text } = messageData;
            
            messageData.background.clear();
            messageData.background.beginFill(settings.backgroundFill, settings.backgroundAlpha);
            messageData.background.drawRoundedRect(
                -settings.backgroundPadding - text.width * settings.anchorX,
                -settings.backgroundPadding - text.height * settings.anchorY,
                text.width + (settings.backgroundPadding * 2),
                text.height + (settings.backgroundPadding * 2),
                settings.backgroundRadius
            );
            messageData.background.endFill();
        }
        
        // Reset timers
        if (messageData.timers.hide) {
            clearTimeout(messageData.timers.hide);
        }
        
        if (messageData.settings.duration > 0) {
            messageData.timers.hide = setTimeout(() => {
                this._hideMessage(messageData);
            }, messageData.settings.duration - messageData.settings.fadeOut);
        }
    }
    
    /**
     * Remove message from display
     * @param {Object} messageData - Message data object
     * @private
     */
    _removeMessage(messageData) {
        // Clear any remaining timers
        if (messageData.timers.hide) {
            clearTimeout(messageData.timers.hide);
        }
        
        // Remove from container
        this.container.removeChild(messageData.container);
        
        // Remove from active messages array
        const index = this.activeMessages.indexOf(messageData);
        if (index > -1) {
            this.activeMessages.splice(index, 1);
        }
    }
    
    /**
     * Hide and remove all active messages
     */
    clearAllMessages() {
        // Make a copy of the array to avoid issues while iterating
        const messagesToRemove = [...this.activeMessages];
        messagesToRemove.forEach(message => {
            this._hideMessage(message);
        });
    }
    
    /**
     * Update all messages (called in game loop)
     * @param {number} delta - Time since last update
     */
    update(delta) {
        // Future implementation for animated messages or special effects
    }
}

/**
 * Creates a pre-configured MessageSystem for use in a game
 * @param {PIXI.Container} container - Container to add messages to
 * @param {Object} options - Default options for all messages
 * @returns {MessageSystem} Configured message system
 */
function createMessageSystem(container, options = {}) {
    return new MessageSystem(container, options);
}

// Example message presets
const MessagePresets = {
    ALERT: {
        fill: 0xFF0000,
        fontSize: 32,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowDistance: 3,
        background: true,
        backgroundFill: 0x000000,
        duration: 2000
    },
    INFO: {
        fill: 0x00FFFF,
        fontSize: 24,
        background: true,
        backgroundFill: 0x333333,
        duration: 4000
    },
    SCORE: {
        fill: 0xFFFF00,
        fontSize: 28,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowDistance: 2,
        duration: 1500,
        fadeOut: 800
    },
    TUTORIAL: {
        fill: 0xFFFFFF,
        fontSize: 20,
        background: true,
        backgroundFill: 0x000000,
        backgroundAlpha: 0.7,
        duration: 8000
    }
};

// // Export what's needed
// export { MessageSystem, createMessageSystem, MessagePresets };
