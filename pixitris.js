/*TODO:
Game over screen
hold piece indicator
***refactor
level indicator text
***fix resizing algo to work on both big and small screens
***fix smileys not spawning on long block
new level notification
better score font
***BUG: Pushing a piece left when there's something blocking it from completing move to left, piece gets stuck

*/
/*============================
  PIXI APPLICATION CONFIGURATION
=============================*/

// Initialize PIXI application with responsive settings
const options = {
    backgroundColor: 0xFFE6DB,
    resizeTo: window,
    
    //resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    eventMode: 'static',
    antialias: false,
    ROUND_PIXELS: true
};



// Initialize fonts
window.WebFontConfig = {
    google: {
        families: ['Pixelify Sans'],
    },
};


/* eslint-disable */
// include the web-font loader script
(function() {
    const wf = document.createElement('script');
    wf.src = `${document.location.protocol === 'https:' ? 'https' : 'http'
    }://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js`;
    wf.type = 'text/javascript';
    wf.async = 'true';
    const s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
}());
/* eslint-enabled */


/*============================
  GAME CONSTANTS & INITIAL STATE
=============================*/

// Configure global PIXI settings
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
const app = new PIXI.Application(options);
app.renderer.view.style.display = "block";
document.body.appendChild(app.view);
app.ticker.add(update);


const state = {
    TITLE: 'title',
    PLAYING: 'playing',
    OPTIONS: 'options',
    GAME_OVER: 'gameOver'
};


const score_font = new PIXI.TextStyle( {
    fontFamily: "Pixelify Sans",
    fill: "#F6F3F4",
    fontSize: 32,
    dropShadow: true,
    dropShadowColor: "#9D8189",
    dropShadowBlur: 0
    
  });

// Loading constant assets
//load static assets
PIXI.Loader.shared
 .add("assets/bg.png")
 .add("assets/titlescreen.png")
 .add("assets/block/block_g.png")
 .add("assets/block/block_db.png")
 .add("assets/block/block_b.png")
 .add("assets/block/block_l.png")
 .add("assets/block/block_o.png")
 .add("assets/block/block_p.png")
 .add("assets/block/block_pi.png")
 .add("assets/block/block_r.png");


//const titlescreen = PIXI.Sprite.from('assets/titlescreen.png');
const bg = PIXI.Sprite.from('assets/bg.png');


let currentState = state.TITLE;

// Game container to hold different elements
const gameContainer = new PIXI.Container();
gameContainer.isLayer = true;
gameContainer.zIndex = 1;
app.stage.addChild(gameContainer);

// UI container for buttons and text
const uiContainer = new PIXI.Container();
uiContainer.isLayer = true;
uiContainer.zIndex = 0;

const messageSystem = createMessageSystem(uiContainer);

app.stage.addChild(uiContainer);



let hold_visual = PIXI.Sprite.from("assets/tetronimos/Larry.png");

// Visual constants and derived constants
const field_width = 12;
const field_height = 22;

let screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
let screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

let scale = Math.min(screenWidth / window.innerWidth, screenHeight / window.innerHeight);
//console.log("scale = " + scale);

let x_offset = (screenWidth);
let y_offset = (screenHeight);

let block_queue = [];
let smiley_queue = [];


//initialize field and field borders
let field = Array(field_width+1 * (field_height+1));

initialize_field(field);

setupTitle();

function initialize_field(field) {
for(let x = 0; x < field_width; x++)
    for(y = 0; y < field_height; y++)
        field[x + y*field_width] = 
            ( x == 0 || x == field_width - 1
                || y == field_height - 1 ? -9: -8 )
            }

 // Constant string array to contain patterns for the six main tetrominos
//NOTE: This array is one-dimensional. This allows the patterns in the array to be easily 'rotated' by changing the
//formula used to access the elements of the array.
const tetrominos = [
    // Larry the long tetromino
        "..X."+
        "..X."+
        "..X."+
        "..x.",
    
    // Zulu the Z tetromino
        "..x."+
        ".XX."+
        ".X.."+
        "....",

    // Sully the S tetromino    
        ".x.."+
        ".XX."+
        "..X."+
        "....",

    // Stan the square tetromino
        "...."+
        ".Xx."+
        ".XX."+
        "....",

    //Wah the reverse L tetromino
        "...."+
        ".xX."+
        "..X."+
        "..X.",
    
    //Luigi the L tetromino
        "...."+
        ".Xx."+
        ".X.."+
        ".X..",
        
    //Terry the T tetromino
        ".x.."+
        ".XX."+
        ".X.."+
        "...."];



/*============================
  GAME INITIALIZATION
=============================*/

function setupTitle() {

    const titlescreen = PIXI.Sprite.from('assets/titlescreen.png');
    titlescreen.anchor.set(0.5);

    titlescreen.x =  screenWidth / 2;
    titlescreen.y = screenHeight / 2;

    

    titlescreen.scale.set(scale / 3);
    titlescreen.interactive = true;
    titlescreen.on('pointerdown', (pointer) => transitionToPlaying());
    gameContainer.addChild(titlescreen);
    
}

function setupPlayfield() {

    // Clear containers
    gameContainer.removeChildren();
    uiContainer.removeChildren();

   // draw static elements of the playing field

   bg.anchor.set(0.5);

   bg.x =  screenWidth / 2;
   bg.y = screenHeight / 2;
   //console.log( "scale = " + scale);

   bg.scale.set(scale / 3);
   //bg.scale.set(0.25, 0.25 * scale);

   let l = screenWidth / 2;
   let z = screenHeight / 2;
   let w = bg.width;
   let h = bg.height;

   x_offset = l - w/2;
   y_offset = z - h/2;

   score_text.position.set(bg.position);
   level_text.position.set(bg.position);

  

   gameContainer.addChild(bg);

   score_offset_x = w * 1/4 + bg.position.x;
   highscore_offset_y = bg.position.y - h * 1.97/5;
   score_offset_y = bg.position.y - h * 1.025/5;
   level_offset_y = bg.position.y - h * 0.1/5;

   hold_button = new PIXI.Graphics();
   hold_button.beginFill(0x000000, 1);
   hold_button.drawRect(0, 0, 250 * scale, 250 * scale);
   let hv_pos_x = (screenWidth - x_offset - (w/4));
   let hv_pos_y = (screenHeight - y_offset - (h/4.5));
   hold_button.position.x = hv_pos_x - (hold_button.width/2);
   hold_button.position.y = hv_pos_y - (hold_button.height/2);

   hold_button.endFill();
  // hold_button.position.x -= hold_button.width/2;
  // hold_button.position.y -= hold_button.height/2;
   
   


   hold_button.renderable = false;
   hold_button.interactive = true;
   hold_button.buttonMode = true;
   hold_button.on('pointerdown', () => {input[5] = 1});
   uiContainer.addChild(hold_button);

   
   hold_visual.anchor.set(0.5);
   hold_visual.position.x = hv_pos_x;
   hold_visual.position.y = hv_pos_y + hold_button.height/8;
   hold_visual.renderable = false;
   uiContainer.addChild(hold_visual);
   messageSystem.showMessage("Game Start!", MessagePresets.SCORE);
   update_score();
   update_level();
 

}

function setupGameOver() {
    // Create semi-transparent overlay
    const overlay = new PIXI.Graphics();
    overlay.beginFill(0x000000, 0.7);
    overlay.drawRect(0, 0, app.screen.width, app.screen.height);
    overlay.endFill();
    uiContainer.addChild(overlay);
    
    // Create game over text
    const gameOverText = new PIXI.Text('GAME OVER', {
        fontFamily: 'Pixelify Sans',
        fontSize: 64,
        fill: 0xff0000,
        align: 'center'
    });
    gameOverText.anchor.set(0.5);
    gameOverText.x = app.screen.width / 2;
    gameOverText.y = app.screen.height / 3;
    uiContainer.addChild(gameOverText);
    
    // Create score text
    const finalScoreText = new PIXI.Text(`Final Score: ${score}`, {
        fontFamily: 'Pixelify Sans',
        fontSize: 32,
        fill: 0xffffff,
        align: 'center'
    });
    finalScoreText.anchor.set(0.5);
    finalScoreText.x = app.screen.width / 2;
    finalScoreText.y = app.screen.height / 2 - 40;
    uiContainer.addChild(finalScoreText);
    
    // Create replay button
    const replayButton = new PIXI.Graphics();
    replayButton.beginFill(0x66CCFF);
    replayButton.drawRoundedRect(0, 0, 200, 50, 15);
    replayButton.endFill();
    replayButton.x = app.screen.width / 2 - 100;
    replayButton.y = app.screen.height / 2 + 30;
    replayButton.interactive = true;
    replayButton.buttonMode = true;
    replayButton.on('pointerdown', () => {resetGame(); transitionToPlaying()});
    uiContainer.addChild(replayButton);
    
    // Replay button text
    const replayText = new PIXI.Text('Play Again', {
        fontFamily: 'Pixelify Sans',
        fontSize: 24,
        fill: 0x000000
    });
    replayText.anchor.set(0.5);
    replayText.x = replayButton.width / 2;
    replayText.y = replayButton.height / 2;
    replayButton.addChild(replayText);
    
    // Create main menu button
    const menuButton = new PIXI.Graphics();
    menuButton.beginFill(0xCCCCCC);
    menuButton.drawRoundedRect(0, 0, 200, 50, 15);
    menuButton.endFill();
    menuButton.x = app.screen.width / 2 - 100;
    menuButton.y = app.screen.height / 2 + 100;
    menuButton.interactive = true;
    menuButton.buttonMode = true;
    menuButton.on('pointerdown', transitionToTitle);
    uiContainer.addChild(menuButton);
    
    // Menu button text
    const menuText = new PIXI.Text('Main Menu', {
        fontFamily: 'Pixelify Sans',
        fontSize: 24,
        fill: 0x000000
    });
    menuText.anchor.set(0.5);
    menuText.x = menuButton.width / 2;
    menuText.y = menuButton.height / 2;
    menuButton.addChild(menuText);
}

function resetGame() {

    // Clear containers
    
    gameContainer.removeChildren();
    uiContainer.removeChildren();
    game_over = false;
    total_cycles = 0;
    total_pieces = 0;
    gravity_interval = 180;
    rotates = 0;
    cleared_lines = [];

    stashed_piece = -1;
    stashed_this_turn = 0;

    score = 0;

    initialize_field(field);
}

// listen for the browser telling us that the screen size changed
window.addEventListener("resize", resize());

/*============================
  GAME STATE FUNCTIONS
=============================*/

function transitionToTitle() {
    resetGame();
    currentState = state.TITLE;
    setupTitle();
}

function transitionToPlaying() {
    currentState = state.PLAYING;
    // Basic message
   
    setupPlayfield();
}

function transitionToPaused() {
    currentState = state.PAUSED;
    setupPause();
}

function transitionToGameOver() {
    currentState = state.GAME_OVER;
    setupGameOver();
}

/*============================
  CORE GAME FUNCTIONS
=============================*/
/**
 * Calculates rotated index for tetromino shapes
 * @param {number} x - Local X coordinate
 * @param {number} y - Local Y coordinate
 * @param {number} rotation - Rotation state (0-3)
 * @returns {number} Index in tetromino shape string
 */

//rotate(): emulates rotating a tetromino by accessing its pattern array by using a modified indexing formula.
//Base formula: i = y * w + x
//w = 4
function rotate(x, y, r) {

    if(r < 1) r *= -1;
    switch(r % 4) {

        case 0: return 4*y + x; //0 degrees
        case 1: return 12 + y - 4*x; //90 degrees
        case 2: return 15 - 4*y - x; //180 degrees
        case 3: return 3 - y + 4*x; //270 degrees
    }

    return 0;
}

//check_piece_collision(): checks whether a tetronimo's current position is valid
function check_piece_collision(tetr_type, curr_rotation, x_pos, y_pos) {
    
    //for each field in the tetromino template
    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            
            //get the current index of the position in the piece template array to check for collisons
            let tetr_index = rotate(x, y, curr_rotation);

            //RECALL: index 1-d array like a 2-d array with formula = offset * y + x (offset == width of playing field)
            let field_index = (y + y_pos) * field_width + (x + x_pos);

            //if the current index being checked is within the bounds of the playing field
            if(x + x_pos >= 0 && x + x_pos < field_width) {
                if(y + y_pos >= 0 && y + y_pos < field_height) {
                    //console.log("index = " + field_index + ", " + tetrominos[tetr_type][tetr_index]);

                    //if the position of the index within the piece's template array indicates a solid block (i.e. == 'X')
                    //and the field at the equivalent position is filled, then the collision check fails and we return zero.
                   
                    //console.log(tetrominos[tetr_type][tetr_index] + " " + field[field_index])
                    if(tetrominos[tetr_type][tetr_index].toUpperCase() == 'X' && field[field_index] != -8)                      
                        return false; 
                }
            }

        }
    }
    
    return true;

}


/*============================
  GAME VARIABLES
=============================*/

// GAME STATE=================================
let game_over = false;
let total_cycles = 0;
let total_pieces = 0;
let gravity_interval = 180;
let rotates = 0;
let cleared_lines = [];
let level = 1;
let level_count = 1;

let stashed_piece = -1;
let stashed_this_turn = 0;

// SCORE HANDLING=================================
let score= 0;
let highscore = localStorage.getItem("highscore");
if(highscore == null) localStorage.setItem("highscore", 0);
//console.log(highscore);

let score_text = new PIXI.Text(`${score}` , score_font);
let highscore_text = new PIXI.Text(`${highscore}` , score_font);
let level_text = new PIXI.Text(`${level}`, score_font);


let score_offset_x = 0;
let score_offset_y = 0;
let highscore_offset_y = 0;
let level_offset_y = 0;

// CURRENT PIECE STATE=================================
let current_piece_index = Math.floor(Math.random()  * 100) % 7;
let current_rotation_index = 0;
let current_piece_x = field_width / 2 - 2; //represents default position where pieces will be spawned
let current_piece_y = 1;
let grace_period = 0;


/*============================
  INPUT HANDLING
=============================*/

let input = [0,0,0,0,0,0,0];
let pointer_down_pos = {x:0,y:0};
let is_dragging = false;
let start = false;

window.addEventListener("keydown",  event => {
    switch (event.key) {
        case ' ':
            //console.log("space pressed");
            input[0] = 1;
            break;
        
        case 's':
            //console.log("down pressed");
            input[1] = 1;
            break;
        
        case 'a':
            input[2] = 1;
            //console.log("left pressed");
            break;
        case 'd':
            input[3] = 1;
            //console.log("right pressed");
            break;
        case 'r':
            input[4] = 1;
            //console.log("rotate pressed");
            break;
        case 'e':
            input[5] = 1;
            //console.log("stash piece pressed");
            break;
        case 27:
            //console.log("escape pressed");
            break;
    }
    
    });


/*============================
  GAME LOOP
=============================*/
function update(delta) {


    switch (currentState) {
        case state.TITLE:
            updateTitleScreen(delta);
            break;
        case state.PLAYING:
            updatePlaying(delta);
            break;
        case state.PAUSED:
            // No updates during paused state
            break;
        case state.GAME_OVER:
            updateGameOver(delta);
            break;
    }

}

    // State-specific update functions
function updateTitleScreen(delta) {
    // Animate background or other title screen elements
    
}

function updatePlaying(delta) {


//MAIN SCENE===========================================

    //INPUT HANDLING===========================================    
    app.renderer.plugins.interaction.on("pointerdown", (pointer) => {
       
        pointer_down_pos = {
            x: pointer.data.global.x,
            y: pointer.data.global.y
        };

       is_dragging = true;

    });

    app.renderer.plugins.interaction.on('pointermove', (p) => {

        if(is_dragging && (Math.abs(pointer_down_pos.x - p.data.global.x) > 60)) {
            if(pointer_down_pos.x - p.data.global.x > 0) {

                //console.log("move left");
                input[2] = 1;
                input[0] = 0;
                pointer_down_pos.x = p.data.global.x;
               
            } else
            if((pointer_down_pos.x - p.data.global.x) < 0) {

                input[3] = 1;
                input[0] = 0;
                //console.log("move right");
                pointer_down_pos.x = p.data.global.x;
            }

            pointer_down_pos.x = p.data.global.x;
        }

        else if(is_dragging && Math.abs(pointer_down_pos.y - p.data.global.y) > 50 && Math.abs(pointer_down_pos.y - p.data.global.y) < 80) {
            input[1] = 1;
            input[0] = 0;
            //console.log("move down");
            pointer_down_pos.y = p.data.global.y;
        }

        else if(is_dragging && (Math.abs(pointer_down_pos.y - p.data.global.y) > 80)) {
            input[0] = 1;
            //console.log("move down");
            pointer_down_pos.y = p.data.global.y;
        }
    })
    
    app.renderer.plugins.interaction.on('pointerup', (p) => {

        is_dragging = false; 
        
        if(Math.abs(pointer_down_pos.x - p.data.global.x) < 2) 
            input[4] = 1;

     });

    app.renderer.plugins.interaction.on('pointerout', (p) => {

        is_dragging = false; 

        if(Math.abs(pointer_down_pos.x - p.data.global.x) < 2) 
            input[4] = 1; 
    });

 


    //MAIN LOGIC===========================================

   total_cycles++;
    
   //Piece movement
    if (input[0]){
            while(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x, current_piece_y + 1)){
                current_piece_y += 1;
            }

            input[0] = 0;
            input[4] = 0;
        }
    else if(input[1]){
            if(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x, current_piece_y + 1)){
                current_piece_y += 1;
            }

            input[1] = 0;
            input[4] = 0;
        }
    else if(input[2]){
            if(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x - 1, current_piece_y)){
                current_piece_x -= 1;    
            }

            input[2] = 0;
            input[4] = 0;
        }
    else if(input[3]){
            if(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x + 1, current_piece_y)){
                current_piece_x += 1;
            }

            input[3] = 0;
            input[4] = 0;
        }
    else if(input[4]){
           current_rotation_index = current_rotation_index + (check_piece_collision(current_piece_index, current_rotation_index + 1, current_piece_x, current_piece_y) || 3 * check_piece_collision(current_piece_index, current_rotation_index + 3, current_piece_x, current_piece_y));
           input[4] = 0;
        }
    else if(input[5]) {
        if(!stashed_this_turn){
           
           let temp_index = stashed_piece;
           
          
           

           stashed_piece = current_piece_index;

           if(temp_index == -1)
            temp_index = Math.max(Math.floor(Math.random() * 100) % 7, 1);

           current_piece_index = temp_index;
           stashed_this_turn = 1;

           console.log(stashed_piece);
           current_piece_x = field_width / 2 - 2; //reset current piece vars to prep for new piece
           current_piece_y = 1;
           current_rotation_index = 0;
        
           hold_visual.renderable = true;
           let hv_pos_x = hold_visual.position.x;
           let hv_pos_y = hold_visual.position.y;
          
           uiContainer.removeChild(hold_visual);
           const texture = (() => {
            switch (stashed_piece) {
                case 0: return 'assets/tetronimos/Larry.png';
    
                case 1: return 'assets/tetronimos/Zulu.png';
        
                case 2: return 'assets/tetronimos/Sully.png';
        
                case 3: return 'assets/tetronimos/Stan.png';
        
                case 4: return 'assets/tetronimos/Luigi.png';
        
                case 5: return 'assets/tetronimos/Wah.png';
        
                case 6: return 'assets/tetronimos/Terry.png';

                default: return 0;
               }
           })();

           hold_visual = new PIXI.Sprite.from(texture);
           hold_visual.anchor.set(0.5);
           hold_visual.position.x = hv_pos_x;
           hold_visual.position.y = hv_pos_y;

           uiContainer.addChild(hold_visual);
           
           

            }  
           input[5] = 0;
        }   

    if(grace_period > 0) {
        grace_period --;
        return;
    }

    //every time the total update cycle equals the interval decided by the game's current difficulty,
    if(!(total_cycles % gravity_interval))

        //if it's possible to move the current piece down
        if(check_piece_collision(current_piece_index, current_rotation_index,
                                             current_piece_x, current_piece_y + 1)) 
            

            current_piece_y += 1;  //do so.                                                
        else {                     //if not, 
                                                                                    
          //lock the current piece in as part of the playing field,
          draw_current_piece();
          

          total_pieces += 1;
          
          //every 10 completed lineslines, increase the difficulty by decrementing the gravity interval,
          if(level_count % 10 == 0)
            if(gravity_interval > 10)
                gravity_interval -= 10;


          //check if any lines have been completed,
          for(let y = 0; y < 4; y++) {     //lines will have only been completed near the most recently locked in piece, so just check those rows.
            if(current_piece_y + y < field_height - 1) {
                let line_completed_flag = true;
                for(let x = 1; x < field_width - 1; x++) 
                    line_completed_flag &= (field[(current_piece_y + y) * field_width + x] != -8)

                if(line_completed_flag) {
                        for(let x = 1; x < field_width - 1; x++) {
                            field[(current_piece_y + y) * field_width + x] = "=";
                        }
                    

                    
                    cleared_lines.push(current_piece_y + y);
                    console.log("cleared lines = " + cleared_lines.length);

                }
            }
          }

          //manage score
          score += 25;

          if(cleared_lines.length > 0){ 
            score += Math.pow(2, cleared_lines.length) * 100; 
            level_count += cleared_lines.length;
           
          }
          console.log(level_count)
          if(level_count % 10 == 0){
            level++;
            update_level();
          }
          update_score();
        
          //console.log(smiley_queue);

        //clear completed lines
        if(cleared_lines.length > 0) {
            cleared_lines.forEach(line => {
                for(let x = 1; x < field_width - 1; x++) {
                    for(let y = line; y > 0; y--) {
                        field[y * field_width + x] = field[(y-1) * field_width + x];
                        field[x] = -8;
                    }
                }
                
            });

            
            cleared_lines = [];
        }
          
        //choose the next piece,
        current_piece_index =Math.floor(Math.random()  * 100) % 7;

        current_piece_x = field_width / 2 - 2; //reset current piece vars to prep for new piece
        current_piece_y = 1;
        current_rotation_index = 0;
        

        //and check for game over if appropriate.
        if(!(check_piece_collision(current_piece_index, current_rotation_index,
                                                        current_piece_x, current_piece_y)))
            transitionToGameOver();

        //reset flags
        stashed_this_turn = 0;
        grace_period = 4;
    }


    //RENDERING========================================
    
        draw_pieces();
       //print_field();
    
    }

    function updateGameOver() {
        game_over = true;
        
    }


/*============================
  RENDERING SYSTEM 
=============================*/

function resize() {
    
    // current screen size
    screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
    screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);

    app.resize(screenWidth, screenHeight);

     // uniform scale for our game
   
    scale = Math.max(screenWidth / window.innerWidth , screenHeight / window.innerHeight);

    x_offset *= scale;
    y_offset *= scale;
}


//TEXT RENDERING========================================

function update_score() {
    
    //update current score
    uiContainer.removeChild(score_text);

    score_text = new PIXI.Text( " " + score, score_font);  
    score_text.position.x = score_offset_x;
    score_text.position.y = score_offset_y;

    score_text.scale.set(scale);
    //console.log(score);

    uiContainer.addChild(score_text);

    //update high score
    uiContainer.removeChild(highscore_text);
    
    highscore_text = new PIXI.Text(" " + highscore, score_font);  
    highscore_text.position.x = score_offset_x;
    highscore_text.position.y = highscore_offset_y;
    
    highscore_text.scale.set(scale);
    //console.log(score);

    uiContainer.addChild(highscore_text);

    

    
}

function update_level() {
     //update current level
     uiContainer.removeChild(level_text);

     level_text = new PIXI.Text( `${level}`, score_font);  
     level_text.position.x = score_offset_x;
     level_text.position.y = level_offset_y;
 
     level_text.scale.set(scale);
     console.log(level);
 
     uiContainer.addChild(level_text);

}

//PIECE RENDERING========================================

function choose_block_sprite(block_type) {
    switch(Math.abs(block_type)) {
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

function draw_pieces() {

    block_queue.forEach(block => {
        gameContainer.removeChild(block);
        block.destroy();
    });

    block_queue = [];
    block_queue.sortableChildren = true;

    draw_current_piece(false);
    let count = 0;

    for(let x = 1; x < field_width - 1; x++) {
        for(let y = 1; y < field_height - 1; y++) {
            if(field[y*field_width + x] !=-8) {
                
                let block = PIXI.Sprite.from(choose_block_sprite(field[y*field_width + x]));


                block_queue.push(block);


                block.scale.set(scale * 1.33);
                block.x = (x-1)*40 + x_offset;
                block.y = (y-1)*40 + y_offset;

                gameContainer.addChild(block);

                // render smileys on top of blocks
                if((field[y*field_width + x].toLocaleString()[0] === "-")  ) {

                    let smiley = PIXI.Sprite.from('assets/smiley.png');
                    smiley.position.set(block.x, block.y);
                    smiley.scale.set(0.25 * scale);
                    block_queue.push(smiley);
                    smiley.parent = block;
                    smiley.zIndex = 1;
                    gameContainer.addChild(smiley);
                }
            

                //console.log("block x: " + x + ", y: " + y);
            }
        }
    }
    
    erase_current_piece(); 
}


function draw_current_piece(is_locked = true) {
    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            if(tetrominos[current_piece_index][(rotate(x,y, current_rotation_index))].toUpperCase() == 'X') {
                field[(current_piece_y + y) * field_width + (current_piece_x + x)] = current_piece_index;

                 if(tetrominos[current_piece_index][(rotate(x,y, current_rotation_index))] == 'x')
                    field[(current_piece_y + y) * field_width + (current_piece_x + x)] = -1 * current_piece_index;

            }
        }
    }
}

function erase_current_piece() {
    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            if(tetrominos[current_piece_index][(rotate(x,y, current_rotation_index))].toUpperCase() == 'X') {
                field[(current_piece_y + y) * field_width + (current_piece_x + x)] = -8;
            }
        }
    }
}


/*============================
  DEBUG FUNCTIONS
=============================*/

function print_field() {
    let c_field = "";
    draw_current_piece();
    field.forEach((e, i) => {
        if( i % (field_width) == 0)
            c_field+='\n';

        let x = (e == -8 ? " " : e)
        c_field+=x; 
    })
    console.log(c_field);
    erase_current_piece();
}



