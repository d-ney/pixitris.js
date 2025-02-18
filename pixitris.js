/*=======================
  GAME CONSTANTS
=========================*/
const FIELD_WIDTH = 12;
const FIELD_HEIGHT = 22;
const TETROMINO_SHAPES = [
    // I-piece
    "..X." + "..X." + "..X." + "..x.",
    // Z-piece
    "..x." + ".XX." + ".X.." + "....",
    // S-piece    
    ".x.." + ".XX." + "..X." + "....",
    // O-piece
    "...." + ".Xx." + ".XX." + "....",
    // L-piece (reverse)
    "...." + ".xX." + "..X." + "..X.",
    // L-piece    
    "...." + ".Xx." + ".X.." + ".X..",
    // T-piece
    ".x.." + ".XX." + ".X.." + "...."
];
const BLOCK_ASSETS = [
    'assets/block/block_g.png',
    'assets/block/block_p.png',
    'assets/block/block_r.png',
    'assets/block/block_b.png',
    'assets/block/block_l.png',
    'assets/block/block_pi.png',
    'assets/block/block_o.png'
];
const INPUT_ACTIONS = {
    HARD_DROP: 0,
    SOFT_DROP: 1,
    MOVE_LEFT: 2,
    MOVE_RIGHT: 3,
    ROTATE: 4,
    STASH: 5
};

/*=======================
  PIXI APPLICATION SETUP
=========================*/
const pixiOptions = {
    backgroundColor: 0xFFE6DB,
    resizeTo: window,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    eventMode: 'static',
    antialias: false,
    ROUND_PIXELS: true
};

// Configure PIXI settings
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
const app = new PIXI.Application(pixiOptions);
document.body.appendChild(app.view);

/*=======================
  GAME STATE MANAGEMENT
=========================*/
let gameState = {
    currentPiece: {
        type: 0,
        rotation: 0,
        x: Math.floor(FIELD_WIDTH/2) - 2,
        y: 1
    },
    stash: {
        piece: -1,
        usedThisTurn: false
    },
    field: new Array(FIELD_WIDTH * FIELD_HEIGHT).fill(-8),
    score: 0,
    highscore: localStorage.getItem("highscore") || 0,
    gameOver: false,
    gravityInterval: 50,
    gracePeriod: 0
};

// Initialize field borders
function initField() {
    for(let x = 0; x < FIELD_WIDTH; x++) {
        for(let y = 0; y < FIELD_HEIGHT; y++) {
            if(x === 0 || x === FIELD_WIDTH - 1 || y === FIELD_HEIGHT - 1) {
                gameState.field[x + y * FIELD_WIDTH] = -9;
            }
        }
    }
}
initField();

/*=======================
  CORE GAME FUNCTIONS
=========================*/

/**
 * Rotates tetromino coordinates
 * @param {number} x - Local X position
 * @param {number} y - Local Y position
 * @param {number} rotation - Current rotation state
 * @returns {number} Index in tetromino shape string
 */
function getRotatedIndex(x, y, rotation) {
    rotation = Math.abs(rotation % 4);
    switch(rotation) {
        case 0: return y * 4 + x;         // 0°
        case 1: return 12 + y - 4 * x;    // 90°
        case 2: return 15 - 4 * y - x;   // 180°
        case 3: return 3 - y + 4 * x;     // 270°
    }
    return 0;
}

/**
 * Checks for collision between current piece and game field
 * @param {number} pieceType - Tetromino type index
 * @param {number} rotation - Current rotation
 * @param {number} xPos - X position to check
 * @param {number} yPos - Y position to check
 * @returns {boolean} True if movement is valid
 */
function checkCollision(pieceType, rotation, xPos, yPos) {
    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            const shapeIndex = getRotatedIndex(x, y, rotation);
            const fieldIndex = (y + yPos) * FIELD_WIDTH + (x + xPos);
            
            if(x + xPos >= 0 && x + xPos < FIELD_WIDTH &&
               y + yPos >= 0 && y + yPos < FIELD_HEIGHT) {
                const isSolid = TETROMINO_SHAPES[pieceType][shapeIndex].toUpperCase() === 'X';
                if(isSolid && gameState.field[fieldIndex] !== -8) {
                    return false;
                }
            }
        }
    }
    return true;
}

// ... (Rest of the game functions following similar structure)

/*=======================
  INPUT HANDLING
=========================*/
function setupInputListeners() {
    // Keyboard input
    window.addEventListener("keydown", event => {
        switch(event.key.toLowerCase()) {
            case ' ': handleInput(INPUT_ACTIONS.HARD_DROP); break;
            case 's': handleInput(INPUT_ACTIONS.SOFT_DROP); break;
            case 'a': handleInput(INPUT_ACTIONS.MOVE_LEFT); break;
            case 'd': handleInput(INPUT_ACTIONS.MOVE_RIGHT); break;
            case 'r': handleInput(INPUT_ACTIONS.ROTATE); break;
            case 'e': handleInput(INPUT_ACTIONS.STASH); break;
        }
    });

    // Touch/pointer input
    // ... (structured pointer handling code)
}

/*=======================
  RENDERING SYSTEM
=========================*/
function createScoreDisplay() {
    PIXI.BitmapFont.from("ScoreFont", {
        fontFamily: "Pixelify Sans",
        fill: "#F6F3F4",
        fontSize: 32,
    });

    const scoreText = new PIXI.BitmapText("0", {
        fontName: 'ScoreFont',
        fontSize: 28,
        fill: 0xF6F3F4,
        stroke: 0xCAB9BF,
        strokeThickness: 5
    });
    
    // Position and scale setup
    return scoreText;
}

// ... (Other rendering functions)

/*=======================
  MAIN GAME LOOP
=========================*/
function gameLoop(delta) {
    if(gameState.gameOver) {
        if(gameState.score > gameState.highscore) {
            localStorage.setItem("highscore", gameState.score);
        }
        app.stop();
        return;
    }

    handleMovement();
    updateGameState();
    renderGame();
}

// Initialize game systems
setupInputListeners();
setupPIXIAssets();
app.ticker.add(gameLoop);