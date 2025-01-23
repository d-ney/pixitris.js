// Tetris Clone using Pixi.js
// Refactored for clarity, readability, and maintainability

// Application options
const options = {
    backgroundColor: 0xFFE6DB,
    resizeTo: window,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    eventMode: 'static',
    antialias: false,
    ROUND_PIXELS: true
};

// Load Google Fonts
window.WebFontConfig = {
    google: {
        families: ['Pixelify Sans'],
    },
};
(function loadWebFont() {
    const wf = document.createElement('script');
    wf.src = `${document.location.protocol === 'https:' ? 'https' : 'http'}://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js`;
    wf.type = 'text/javascript';
    wf.async = 'true';
    const s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
})();

// Pixi.js setup
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
const app = new PIXI.Application(options);
app.renderer.view.style.display = "block";
document.body.appendChild(app.view);
app.ticker.add(update);

// Game field dimensions
const FIELD_WIDTH = 12;
const FIELD_HEIGHT = 22;

// Screen and scale variables
let screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
let screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
let scale = Math.min(screenWidth / window.innerHeight, screenHeight / window.innerWidth);
let x_offset = screenWidth / 2;
let y_offset = screenHeight / 2;

// Resize event listener
window.addEventListener("resize", resize);
function resize() {
    screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    app.resize(screenWidth, screenHeight);

    scale = screenHeight > screenWidth
        ? Math.max(screenWidth / window.innerHeight, screenHeight / window.innerWidth)
        : Math.min(screenWidth / window.innerHeight, screenHeight / window.innerWidth);
    scale = Math.min(scale, 1.5);
    x_offset *= scale;
    y_offset *= scale;
}

// Initialize the playing field with border walls and empty cells
let field = Array(FIELD_WIDTH * FIELD_HEIGHT).fill(-8);
for (let x = 0; x < FIELD_WIDTH; x++) {
    for (let y = 0; y < FIELD_HEIGHT; y++) {
        if (x === 0 || x === FIELD_WIDTH - 1 || y === FIELD_HEIGHT - 1) {
            field[x + y * FIELD_WIDTH] = -9; // Border walls
        }
    }
}

// Tetromino patterns (1D strings)
const tetrominos = [
    "..X...X...X...X.",
    "..X..XX...X.....",
    "..X..XX..X......",
    "....XX..XX......",
    "...X..X..XX.....",
    "..X...X..XX.....",
    "..X..XX...X....."
];

// Rotate tetrominos (helper function)
function rotate(x, y, r) {
    switch (r % 4) {
        case 0: return 4 * y + x; // 0 degrees
        case 1: return 12 + y - 4 * x; // 90 degrees
        case 2: return 15 - 4 * y - x; // 180 degrees
        case 3: return 3 - y + 4 * x; // 270 degrees
    }
    return 0;
}

// Check for collisions between tetromino and field
function checkPieceCollision(type, rotation, posX, posY) {
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            const index = rotate(x, y, rotation);
            const fieldIndex = (posY + y) * FIELD_WIDTH + (posX + x);

            if (tetrominos[type][index].toUpperCase() === 'X') {
                if (posX + x < 0 || posX + x >= FIELD_WIDTH || posY + y >= FIELD_HEIGHT || field[fieldIndex] !== -8) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Asset loading and game setup
PIXI.Loader.shared
    .add("assets/bg.png")
    .add("assets/titlescreen.png")
    .load(() => {
        setupGame();
        showTitleScreen();
    });

// Game variables
let gameOver = false;
let totalCycles = 0;
let totalPieces = 0;
let gravityInterval = 50;
let score = 0;
let highScore = localStorage.getItem("highscore") || 0;
let currentPiece = {
    index: Math.floor(Math.random() * 7),
    rotation: 0,
    x: FIELD_WIDTH / 2 - 2,
    y: 1
};
let stashedPiece = -1;
let stashedThisTurn = false;

// Initialize score display
PIXI.BitmapFont.from("ScoreFont", {
    fontFamily: "Pixelify Sans",
    fill: "#F6F3F4",
    fontSize: 32
});
let scoreText = createText("Score: 0", 10, 10);
let highScoreText = createText(`High Score: ${highScore}`, 10, 50);

function createText(text, x, y) {
    const bitmapText = new PIXI.BitmapText(text, { fontName: 'ScoreFont', fontSize: 32 });
    bitmapText.x = x;
    bitmapText.y = y;
    app.stage.addChild(bitmapText);
    return bitmapText;
}

// Title screen setup
function showTitleScreen() {
    const titleScreen = PIXI.Sprite.from("assets/titlescreen.png");
    titleScreen.anchor.set(0.5);
    titleScreen.x = screenWidth / 2;
    titleScreen.y = screenHeight / 2;
    titleScreen.scale.set(scale * 0.25);
    app.stage.addChild(titleScreen);
    titleScreen.interactive = true;
    titleScreen.on('pointerdown', () => {
        app.stage.removeChild(titleScreen);
    });
}

// Game setup
function setupGame() {
    const background = PIXI.Sprite.from("assets/bg.png");
    background.anchor.set(0.5);
    background.x = screenWidth / 2;
    background.y = screenHeight / 2;
    background.scale.set(scale * 0.25);
    app.stage.addChild(background);

    updateScore();
}

// Update game logic
function update(delta) {
    if (gameOver) {
        if (score > highScore) localStorage.setItem("highscore", score);
        app.stop();
        return;
    }

    // Game logic and rendering
    handleInput();
    applyGravity();
    render();
}

// Update score display
function updateScore() {
    scoreText.text = `Score: ${score}`;
    highScoreText.text = `High Score: ${highScore}`;
}

// Apply gravity to the current piece
function applyGravity() {
    totalCycles++;
    if (totalCycles % gravityInterval === 0) {
        if (checkPieceCollision(currentPiece.index, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
            currentPiece.y++;
        } else {
            lockPiece();
        }
    }
}

// Lock the current piece into the field
function lockPiece() {
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            const index = rotate(x, y, currentPiece.rotation);
            if (tetrominos[currentPiece.index][index].toUpperCase() === 'X') {
                const fieldIndex = (currentPiece.y + y) * FIELD_WIDTH + (currentPiece.x + x);
                field[fieldIndex] = currentPiece.index;
            }
        }
    }

    totalPieces++;

    // Increase difficulty
    if (totalPieces % 10 === 0 && gravityInterval > 10) {
        gravityInterval--;
    }

    // Check for completed lines
    for (let y = 0; y < 4; y++) {
        const line = currentPiece.y + y;
        if (line < FIELD_HEIGHT - 1) {
            let isLineComplete = true;
            for (let x = 1; x < FIELD_WIDTH - 1; x++) {
                if (field[line * FIELD_WIDTH + x] === -8) {
                    isLineComplete = false;
                    break;
                }
            }

            if (isLineComplete) {
                for (let x = 1; x < FIELD_WIDTH - 1; x++) {
                    field[line * FIELD_WIDTH + x] = -8;
                }

                for (let yAbove = line; yAbove > 0; yAbove--) {
                    for (let x = 1; x < FIELD_WIDTH - 1; x++) {
                        field[yAbove * FIELD_WIDTH + x] = field[(yAbove - 1) * FIELD_WIDTH + x];
                    }
                }

                score += 100;
                updateScore();
            }
        }
    }

    // Spawn a new piece
    currentPiece = {
        index: Math.floor(Math.random() * 7),
        rotation: 0,
        x: FIELD_WIDTH / 2 - 2,
        y: 1
    };

    // Check for game over
    if (!checkPieceCollision(currentPiece.index, currentPiece.rotation, currentPiece.x, currentPiece.y)) {
        gameOver = true;
    }

    stashedThisTurn = false;
}

// Handle player input
function handleInput() {
    window.addEventListener("keydown", (event) => {
        switch (event.key) {
            case ' ':
                while (checkPieceCollision(currentPiece.index, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
                    currentPiece.y++;
                }
                break;
            case 'ArrowDown':
                if (checkPieceCollision(currentPiece.index, currentPiece.rotation, currentPiece.x, currentPiece.y + 1)) {
                    currentPiece.y++;
                }
                break;
            case 'ArrowLeft':
                if (checkPieceCollision(currentPiece.index, currentPiece.rotation, currentPiece.x - 1, currentPiece.y)) {
                    currentPiece.x--;
                }
                break;
            case 'ArrowRight':
                if (checkPieceCollision(currentPiece.index, currentPiece.rotation, currentPiece.x + 1, currentPiece.y)) {
                    currentPiece.x++;
                }
                break;
            case 'ArrowUp':
                const newRotation = (currentPiece.rotation + 1) % 4;
                if (checkPieceCollision(currentPiece.index, newRotation, currentPiece.x, currentPiece.y)) {
                    currentPiece.rotation = newRotation;
                }
                break;
            case 'Shift':
                if (!stashedThisTurn) {
                    const temp = stashedPiece;
                    stashedPiece = currentPiece.index;
                    currentPiece.index = temp === -1 ? Math.floor(Math.random() * 7) : temp;
                    currentPiece.rotation = 0;
                    currentPiece.x = FIELD_WIDTH / 2 - 2;
                    currentPiece.y = 1;
                    stashedThisTurn = true;
                }
                break;
        }
    });
}

// Render the game
function render() {
    drawPieces();
}

// Draw all pieces on the field
function drawPieces() {
    app.stage.removeChildren();
    for (let x = 0; x < FIELD_WIDTH; x++) {
        for (let y = 0; y < FIELD_HEIGHT; y++) {
            const index = field[y * FIELD_WIDTH + x];
            if (index >= 0) {
                const block = PIXI.Sprite.from(chooseBlockSprite(index));
                block.x = x * 30 * scale + x_offset;
                block.y = y * 30 * scale + y_offset;
                block.scale.set(scale);
                app.stage.addChild(block);
            }
        }
    }
}

// Choose block sprite based on type
function chooseBlockSprite(type) {
    const sprites = [
        "assets/block/block_g.png",
        "assets/block/block_p.png",
        "assets/block/block_r.png",
        "assets/block/block_b.png",
        "assets/block/block_l.png",
        "assets/block/block_pi.png",
        "assets/block/block_o.png"
    ];
    return sprites[type] || "assets/block/block.png";
}
