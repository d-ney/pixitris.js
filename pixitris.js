//Create a Pixi Application
const options = {
    backgroundColor: 0xFFE6DB,
    resizeTo: window,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    eventMode: 'passive'
}


PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
const app = new PIXI.Application(options);

//var target = new PIXI.DisplayObjectContainer();
//target.setInteractive(true);
//app.stage.addChild(target);


document.body.appendChild(app.view);
app.ticker.add(update);


const field_width = 12;
const field_height = 22;

let screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
let screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
let scale = Math.min(screenWidth / window.innerHeight, screenHeight / window.innerWidth);
console.log("scale = " + scale);

const bounding_box = new PIXI.Graphics();
bounding_box.beginFill(0xFFFFFF);
bounding_box.drawRect(0, 0, screenWidth, screenHeight);
bounding_box.endFill();
bounding_box.alpha = 0;
bounding_box.interactive = true;
app.stage.addChild(bounding_box);

// listen for the browser telling us that the screen size changed
window.addEventListener("resize", resize());

function resize() {
    app.resize(screenWidth, screenHeight);
     // current screen size
      screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

     // uniform scale for our game
      scale = Math.min(screenWidth / window.innerHeight, screenHeight / window.innerWidth);
}

let block_queue = [];

let field = Array(field_width+1 * (field_height+1));
for(let x = 0; x < field_width; x++)
    for(y = 0; y < field_height; y++)
        field[x + y*field_width] = 
            ( x == 0 || x == field_width - 1
                || y == field_height - 1 ? 9: -1 )

//Create a constant string array to contain patterns for the six main tetronimos
//NOTE: This array is one-dimensional. This allows the patterns in the array to be easily 'rotated' by changing the
//formula used to access the elements of the array.

const tetrominos = [
                // Larry the long tetromino
                    "..X."+
                    "..X."+
                    "..X."+
                    "..X.",
                
                // Zulu the Z tetromino
                    "..X."+
                    ".XX."+
                    ".X.."+
                    "....",

                // Sully the S tetromino    
                    ".X.."+
                    ".XX."+
                    "..X."+
                    "....",

                // Stan the square tetromino
                    "...."+
                    ".XX."+
                    ".XX."+
                    "....",

                //Wah the reverse L tetromino
                    "...."+
                    ".XX."+
                    "..X."+
                    "..X.",
                
                //Luigi the L tetromino
                    "...."+
                    ".X.."+
                    ".X.."+
                    ".XX.",
                    
                //Terry the T tetromino
                    "...."+
                    ".XXX"+
                    "..X."+
                    "...."];





//rotate(): emulates rotating a tetronimo by accessing its pattern array by using a modified indexing formula.
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


function check_piece_collision(tetr_type, curr_rotation, x_pos, y_pos) {
    
    //for each field in the tetronimo template
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
                    if(tetrominos[tetr_type][tetr_index] == 'X' && field[field_index] != -1)                      
                        return false; 
                }
            }

        }
    }
    
    return true;

}


//load an image and run the `setup` function when it's done
PIXI.Loader.shared
 .add("assets/bg.png")
 .load(setup);


//GAME VARIABLES=================================
let game_over = false;
let total_cycles = 0;
let total_pieces = 0;
let gravity_interval = 40;
let rotates = 0;
let cleared_lines = [];

let stashed_piece = -1;
let stashed_this_turn = 0;

let score= 0;
let score_offset_x = 3*(screenWidth + scale)/4;
let score_offset_y = screenHeight/8;

let score_text = new PIXI.Text(score,{fontFamily : 'Arial', fontSize: 24, fill : 0xff1010, align : 'right'});
app.stage.addChild(score_text);

let current_piece_index = Math.floor(Math.random()  * 100) % 7;
let current_rotation_index = 0;
let current_piece_x = field_width / 2 - 2; //represents default position where pieces will be spawned
let current_piece_y = 1;

let input = [0,0,0,0,0,0,0];



function setup() {

   // draw_current_piece();
   // print_field();

   // draw static elements of the playing field
   const bg = PIXI.Sprite.from('assets/bg.png');
   //bg.anchor.set(0.5);
   bg.x =  screenWidth / 3;
   bg.y = screenHeight / 8;
   console.log( "scale = " + scale);
   bg.scale.set(0.25 * scale);

//    const block = PIXI.Sprite.from('assets/block/block.png');
//    block.anchor.set(0.5);
//    block.x = app.screen.width / 2;
//    block.y = app.screen.height / 2;
   //block.scale.set(0.25);
   


   app.stage.addChild(bg);
  // app.stage.addChild(block);




}

function update(delta) {

//INPUT===========================================
    
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
    
    })

    bounding_box.on("pointerdown", () => {input[4] = 1});


//LOGIC===========================================


   if(game_over) {
        app.stop();
        console.log("game over! final score: " + score);
   }

   total_cycles++;
    
   //Piece movement
        if (input[0]){
            while(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x, current_piece_y + 1)){
                current_piece_y += 1;
                //console.log("left pressed");
            }
            input[0] = 0;
        }
        if(input[1]){
            if(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x, current_piece_y + 1)){
                current_piece_y += 1;
                //console.log("left pressed");
                input[1] = 0;
            }
        }
        if(input[2]){
                if(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x - 1, current_piece_y)){
                    current_piece_x -= 1;
                    //console.log("left pressed");
                    input[2] = 0;
                }
        }
        if(input[3]){
            if(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x + 1, current_piece_y)){
                current_piece_x += 1;
                //console.log("right pressed");
                input[3] = 0;
            }
        }
        if(input[4]){
           current_rotation_index = current_rotation_index + (check_piece_collision(current_piece_index, current_rotation_index + 1, current_piece_x, current_piece_y) || 3 * check_piece_collision(current_piece_index, current_rotation_index + 3, current_piece_x, current_piece_y));
           input[4] = 0;
        }
        if(input[5] && !stashed_this_turn){
           console.log("in stash piece");

           console.log("stash piece = " + stashed_piece + ", current piece = " + current_piece_index);
           
           let temp_index = stashed_piece;

           if(temp_index == -1)
            temp_index = Math.floor(Math.random() * 100) % 7;

           stashed_piece = current_piece_index;
           current_piece_index = temp_index;
           stashed_this_turn = 1;

           current_piece_x = field_width / 2 - 2; //reset current piece vars to prep for new piece
           current_piece_y = 1;
           current_rotation_index = 0;
            
            
           input[5] = 0;
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
          
          //increase the difficulty by decrementing the gravity interval,
          if(total_pieces % 10 == 0)
            if(gravity_interval > 10)
                gravity_interval--;


          //check if any lines have been completed,
          for(let y = 0; y < 4; y++) {     //lines will have only been completed near the most recently locked in piece, so just check those rows.
            if(current_piece_y + y < field_height - 1) {
                let line_completed_flag = true;
                for(let x = 1; x < field_width - 1; x++) 
                    line_completed_flag &= (field[(current_piece_y + y) * field_width + x] != -1)

                if(line_completed_flag) {
                        for(let x = 1; x < field_width - 1; x++) {
                            field[(current_piece_y + y) * field_width + x] = "=";
                        }
                    

                    //console.log("cleared lines = " + cleared_lines.length);
                    cleared_lines.push(current_piece_y + y);
                }
            }
          }

          //manage score,
          score += 25;
          if(cleared_lines.length > 0) score += Math.pow(2, cleared_lines.length) * 100
        

          if(cleared_lines.length > 0) {
            cleared_lines.forEach(line => {
                for(let x = 1; x < field_width - 1; x++) {
                    for(let y = line; y > 0; y--) {
                        field[y * field_width + x] = field[(y-1) * field_width + x];
                        field[x] = -1;
                    }
                }
                
            });

            cleared_lines = [];
          }
          
          //choose the next piece,
          current_piece_index = Math.floor(Math.random()  * 100) % 7;

          current_piece_x = field_width / 2 - 2; //reset current piece vars to prep for new piece
          current_piece_y = 1;
          current_rotation_index = 0;
          

          //and check for game over if appropriate.
          game_over = !(check_piece_collision(current_piece_index, current_rotation_index,
                                                            current_piece_x, current_piece_y));
    
          //reset flags
          stashed_this_turn = 0;
        }


//GRAPHICS========================================
    
        render();
    

}

function render() {
    
    //Add the canvas that Pixi automatically created for you to the HTML document
    // document.body.appendChild(app.view);
    // app.renderer.backgroundColor = 0x061639;
     //app.renderer.view.style.position = "relative";
     app.renderer.view.style.display = "block";


    //print_field();
    draw_pieces();
    update_score();
   // draw_current_piece();
}

function update_score() {
    
    app.stage.removeChild(score_text);
    score_text = new PIXI.Text(score,{fontFamily : "Helvetica", fontSize: 24, fill : 0xF6F3F4, stroke : 0xCAB9BF, strokeThickness: 5, align : 'right'});  
    score_text.position.x = score_offset_x;
    score_text.position.y = score_offset_y;  
    //console.log(score);
    app.stage.addChild(score_text);
}

function draw_pieces() {
    let x_offset = screenWidth / 3;
    let y_offset = screenHeight / 8;

    block_queue.forEach(block => {
        app.stage.removeChild(block);
    });

    draw_current_piece();

    for(let x = 1; x < field_width - 1; x++) {
        for(let y = 1; y < field_height - 1; y++) {
            if(field[y*field_width + x] !=-1) {

                let block = choose_block_sprite(field[y*field_width + x]);//PIXI.Sprite.from('assets/block/block.png');
                // console.log(field[y*field_width + x]);
                // switch (field[y*field_width + x]) {
                //     case 1: PIXI.Sprite.from('assets/block/block_g.png',);
                //     break;

                //     case 2: PIXI.Sprite.from('assets/block/block_g.png',);
                //     break;

                //     case 3: PIXI.Sprite.from('assets/block/block_g.png',);
                //     break;
                // }
                block.alpha = 0.75;

                block_queue.push(block);
                //block.anchor.set(0.5);
                block.scale.set(0.25 * scale);
                block.x = (x-1)*30*scale + x_offset;
                block.y = (y-1)*30*scale + y_offset;

                app.stage.addChild(block);
                //console.log("block x: " + x + ", y: " + y);
            }
        }
    }
    
    erase_current_piece(); 
}

function choose_block_sprite(block_type) {
    switch(block_type) {
        case 0: return new PIXI.Sprite.from('assets/block/block_g.png',);

        case 1: return new PIXI.Sprite.from('assets/block/block_p.png',);

        case 2: return new PIXI.Sprite.from('assets/block/block_r.png',);

        case 3: return new PIXI.Sprite.from('assets/block/block_db.png',);

        case 4: return new PIXI.Sprite.from('assets/block/block_l.png',);

        case 5: return new PIXI.Sprite.from('assets/block/block_pi.png',);

        case 6: return new PIXI.Sprite.from('assets/block/block_o.png',);
    }

    return new PIXI.Sprite.from('assets/block/block.png');

}


function draw_current_piece() {
    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            if(tetrominos[current_piece_index][(rotate(x,y, current_rotation_index))] == 'X') {
                field[(current_piece_y + y) * field_width + (current_piece_x + x)] = current_piece_index;
            }
        }
    }
}

function erase_current_piece() {
    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            if(tetrominos[current_piece_index][(rotate(x,y, current_rotation_index))] == 'X') {
                field[(current_piece_y + y) * field_width + (current_piece_x + x)] = -1;
            }
        }
    }
}

function print_field() {
    let c_field = "";
    draw_current_piece();
    field.forEach((e, i) => {
        if( i % (field_width) == 0)
            c_field+='\n';
            //console.log(e);
        let x = (e == -1 ? " " : e)
        c_field+=x; 
    })
    console.log(c_field);
    erase_current_piece();
}




