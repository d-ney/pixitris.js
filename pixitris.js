// PIXI Application Configuration
// This section defines options for the PIXI application, including resolution and scaling.
const options = {
    backgroundColor: 0xFFE6DB,
    resizeTo: window,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    eventMode: 'static',
    antialias: false,
    ROUND_PIXELS: true
};

// Google Font Loader Configuration
// Dynamically loads the Pixelify Sans font from Google Fonts.
window.WebFontConfig = {
    google: {
        families: ['Pixelify Sans'],
    },
};

// Include the Web Font Loader script dynamically.
(function() {
    const wf = document.createElement('script');
    wf.src = `${document.location.protocol === 'https:' ? 'https' : 'http'}://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js`;
    wf.type = 'text/javascript';
    wf.async = true;
    const s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
}());

// PIXI Setup
// Configures the PIXI renderer and appends it to the document body.
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
const app = new PIXI.Application(options);
app.renderer.view.style.display = "block";
document.body.appendChild(app.view);
app.ticker.add(update);

// Field Dimensions and Scaling
// Defines the game field dimensions and calculates scaling for different screen sizes.
const field_width = 12;
const field_height = 22;
let screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
let screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
let scale = Math.min(screenWidth / window.innerHeight, screenHeight / window.innerWidth);
let x_offset = screenWidth / 2;
let y_offset = screenHeight / 2;

// Log initial scale for debugging purposes
console.log("scale = " + scale);

// Screen Resize Listener
// Updates application scaling and offsets when the screen size changes.
window.addEventListener("resize", resize);
function resize() {
    screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    app.resize(screenWidth, screenHeight);

    if (screenHeight > screenWidth) {
        scale = Math.max(screenWidth / window.innerHeight, screenHeight / window.innerWidth);
    } else {
        scale = Math.min(screenWidth / window.innerHeight, screenHeight / window.innerWidth);
    }
    scale = Math.min(scale, 1.5);
    x_offset *= scale;
    y_offset *= scale;
}

// Game Field Initialization
// Initializes the game field array and sets boundary values.
let field = Array(field_width * (field_height + 1)).fill(-8);
for (let x = 0; x < field_width; x++) {
    for (let y = 0; y < field_height; y++) {
        field[x + y * field_width] = (x === 0 || x === field_width - 1 || y === field_height - 1) ? -9 : -8;
    }
}

// Tetromino Definitions
// Defines patterns for the six main tetromino shapes in a single-dimensional array.
const tetrominos = [
    "..X..X..X..X.", // Long Tetromino
    "..X.XX.X....",
    ".X..XX..X....",
    "....XX..XX....",
    "....X..XX..X..",
    "....XX..X..X..",
    ".X..XX..X....."  // T Tetromino
];

// Function: rotate
// Rotates a tetromino pattern based on the rotation index (0-3).
function rotate(x, y, r) {
    switch (r % 4) {
        case 0: return 4 * y + x;           // 0 degrees
        case 1: return 12 + y - 4 * x;      // 90 degrees
        case 2: return 15 - 4 * y - x;      // 180 degrees
        case 3: return 3 - y + 4 * x;       // 270 degrees
    }
    return 0;
}

// Function: check_piece_collision
// Checks for collisions between a tetromino and the field.
function check_piece_collision(tetr_type, curr_rotation, x_pos, y_pos) {
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            let tetr_index = rotate(x, y, curr_rotation);
            let field_index = (y + y_pos) * field_width + (x + x_pos);
            if (x + x_pos >= 0 && x + x_pos < field_width && y + y_pos >= 0 && y + y_pos < field_height) {
                if (tetrominos[tetr_type][tetr_index].toUpperCase() === 'X' && field[field_index] !== -8) {
                    return false;
                }
            }
        }
    }
    return true;
}

// PIXI Loader and Game Setup
// Loads assets and initializes the game when ready.
PIXI.Loader.shared
    .add("assets/bg.png")
    .add("assets/titlescreen.png")
    .load(setup)
    .load(title);

// Global Game Variables
let game_over = false;
let total_cycles = 0;
let total_pieces = 0;
let gravity_interval = 50;
let rotates = 0;
let cleared_lines = [];
let stashed_piece = -1;
let stashed_this_turn = 0;
let score = 0;
let highscore = localStorage.getItem("highscore") || 0;
localStorage.setItem("highscore", highscore);

// Bitmap Font Setup for Score Display
PIXI.BitmapFont.from("ScoreFont", {
    fontFamily: "Pixelify Sans",
    fill: "#F6F3F4",
    fontSize: 32
});
let score_text = new PIXI.BitmapText("" + score, { fontName: 'ScoreFont' });
let highscore_text = new PIXI.BitmapText("" + highscore, { fontName: 'ScoreFont' });
app.stage.addChild(score_text);
app.stage.addChild(highscore_text);

// Game State Variables
let current_piece_index = Math.floor(Math.random() * 7);
let current_rotation_index = 0;
let current_piece_x = field_width / 2 - 2;
let current_piece_y = 1;
let grace_period = 0;
let input = [0, 0, 0, 0, 0, 0, 0];
let pointer_down_pos = { x: 0, y: 0 };
let is_dragging = false;
let start = false;
const titlescreen = PIXI.Sprite.from('assets/titlescreen.png');
const bg = PIXI.Sprite.from('assets/bg.png');

// Function: title
// Displays the title screen and sets up initial UI.
function title() {
    titlescreen.anchor.set(0.5);
    titlescreen.x = screenWidth / 2;
    titlescreen.y = screenHeight / 2;
    titlescreen.eventMode = 'static';
    titlescreen.scale.set(scale * 0.25);
    app.stage.addChild(titlescreen);
}

// Function: setup
// Initializes the game background and static elements.
function setup() {
    bg.anchor.set(0.5);
    bg.x = screenWidth / 2;
    bg.y = screenHeight / 2;
    bg.scale.set(scale * 0.25);
    x_offset = screenWidth / 2 - bg.width / 2;
    y_offset = screenHeight / 2 - bg.height / 2;
    app.stage.addChild(bg);
    update_score();
}

// Function: update
// Main game loop that handles input, logic, and rendering.
function update(delta) {
    if (!start) {
        app.renderer.plugins.interaction.on('pointerdown', () => {
            start = true;
            app.stage.removeChild(titlescreen);
        });
        return;
    }

    // Input Handling
    window.addEventListener("keydown", event => {
        switch (event.key) {
            case ' ': input[0] = 1; break;
            case 's': input[1] = 1; break;
            case 'a': input[2] = 1; break;
            case 'd': input[3] = 1; break;
            case 'r': input[4] = 1; break;
            case 'e': input[5] = 1; break;
            default: break;
        }
    });

    // Logic and Rendering
    if (game_over) {
        if (score > highscore) localStorage.setItem("highscore", score);
        app.stop();
        return;
    }

    total_cycles++;
    if (total_cycles % gravity_interval === 0) {
        if (check_piece_collision(current_piece_index, current_rotation_index, current_piece_x, current_piece_y + 1)) {
            current_piece_y++;
        } else {
            draw_current_piece();
            total_pieces++;
            if (total_pieces % 10 === 0 && gravity_interval > 10) gravity_interval--;
            handle_line_clear();
            reset_piece();
            game_over = !check_piece_collision(current_piece_index, current_rotation_index, current_piece_x, current_piece_y);
        }
    }
    render();
}

// Function: render
// Handles rendering of the game field and pieces.
function render() {
    // Add the canvas that Pixi automatically created for you to the HTML document
    // document.body.appendChild(app.view);
    // app.renderer.backgroundColor = 0x061639;
    // app.renderer.view.style.position = "relative";

    // print_field();
    draw_pieces();
    // draw_current_piece();
}

// Function: update_score
// Updates the displayed score and high score on the screen.
function update_score() {
    app.stage.removeChild(score_text);
    score_text = new PIXI.BitmapText( " " + score, {fontName : 'ScoreFont', fontSize: 28, fill : 0xF6F3F4, stroke : 0xCAB9BF, strokeThickness: 5, align : 'left'});  
    score_text.position.x = score_offset_x;
    score_text.position.y = score_offset_y; 
    score_text.scale.set(scale);
    app.stage.addChild(score_text);

    app.stage.removeChild(highscore_text);
    highscore_text = new PIXI.BitmapText(" " + highscore, {fontName : 'ScoreFont', fontSize: 28, fill : 0xF6F3F4, stroke : 0xCAB9BF, strokeThickness: 5, align : 'left'});  
    highscore_text.position.x = score_offset_x;
    highscore_text.position.y = highscore_offset_y;
    highscore_text.scale.set(scale);
    app.stage.addChild(highscore_text);
}

// Function: draw_pieces
// Renders all blocks currently in the field and the current tetromino.
function draw_pieces() {
    block_queue.forEach(block => {
        app.stage.removeChild(block);
    });

    block_queue = [];
    block_queue.sortableChildren = true;

    draw_current_piece(false);
    for (let x = 1; x < field_width - 1; x++) {
        for (let y = 1; y < field_height - 1; y++) {
            if (field[y * field_width + x] !== -8) {
                let block = PIXI.Sprite.from(choose_block_sprite(field[y * field_width + x]));
                block.scale.set(scale);
                block.x = (x - 1) * 30 * scale + x_offset;
                block.y = (y - 1) * 30 * scale + y_offset;
                app.stage.addChild(block);
                block_queue.push(block);

                if (Math.sign(field[y * field_width + x]) < 0) {
                    let smiley = PIXI.Sprite.from('assets/smiley.png');
                    smiley.position.set(block.x, block.y);
                    smiley.scale.set(0.25 * scale);
                    block_queue.push(smiley);
                    smiley.parent = block;
                    smiley.zIndex = 1;
                    app.stage.addChild(smiley);
                }
            }
        }
    }

    erase_current_piece(); 
}

// Function: choose_block_sprite
// Returns the appropriate block sprite based on the block type.
function choose_block_sprite(block_type) {
    switch (Math.abs(block_type)) {
        case 0: return 'assets/block/block_g.png';
        case 1: return 'assets/block/block_p.png';
        case 2: return 'assets/block/block_r.png';
        case 3: return 'assets/block/block_b.png';
        case 4: return 'assets/block/block_l.png';
        case 5: return 'assets/block/block_pi.png';
        case 6: return 'assets/block/block_o.png';
    }
    return 'assets/block/block.png';
}

// Function: draw_current_piece
// Draws the current tetromino onto the field.
function draw_current_piece(is_locked = true) {
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            if (tetrominos[current_piece_index][rotate(x, y, current_rotation_index)].toUpperCase() === 'X') {
                field[(current_piece_y + y) * field_width + (current_piece_x + x)] = current_piece_index;

                if (tetrominos[current_piece_index][rotate(x, y, current_rotation_index)] === 'x') {
                    field[(current_piece_y + y) * field_width + (current_piece_x + x)] = -1 * current_piece_index;
                }
            }
        }
    }
}

// Function: erase_current_piece
// Removes the current tetromino from the field.
function erase_current_piece() {
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            if (tetrominos[current_piece_index][rotate(x, y, current_rotation_index)].toUpperCase() === 'X') {
                field[(current_piece_y + y) * field_width + (current_piece_x + x)] = -8;
            }
        }
    }
}

// Function: draw_smiley
// Adds a smiley face sprite to the field at the specified position.
function draw_smiley(pos_x, pos_y, is_locked = true) {
    smiley.x = (pos_x - 1) * 30 * scale + x_offset;
    smiley.y = (pos_y - 1) * 30 * scale + y_offset;
    smiley.scale.set(scale);
    app.stage.addChild(smiley);

    if (!is_locked) {
        block_queue.push(smiley);
    } else {
        smiley_queue.push(smiley);
    }
}

// Function: print_field
// Prints the current state of the field to the console for debugging.
function print_field() {
    let c_field = "";
    draw_current_piece();
    field.forEach((e, i) => {
        if (i % field_width === 0) c_field += '\n';
        let x = (e === -8 ? " " : e);
        c_field += x;
    });
    console.log(c_field);
    erase_current_piece();
}
