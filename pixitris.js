//Create a Pixi Application
const options = {
    backgroundColor: 0xFFE6DB,
    resizeTo: window,
    //resolution: window.devicePixelRatio,
    //autoResize: true,

    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    eventMode: 'static'
    

}


PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
const app = new PIXI.Application(options);
app.renderer.view.style.display = "block";




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

let x_offset = screenWidth / 2;
let y_offset = screenHeight / 2;


// listen for the browser telling us that the screen size changed
window.addEventListener("resize", resize());

function resize() {
    
     // current screen size
      screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      screenHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

      app.resize(screenWidth, screenHeight);

      // uniform scale for our game
      if(screenHeight > screenWidth)
        scale = Math.max(screenWidth / window.innerHeight , screenHeight / window.innerWidth);
      else
        scale = Math.min(screenWidth / window.innerHeight , screenHeight / window.innerWidth);
      
      x_offset *= scale;
      y_offset *= scale;
}

let block_queue = [];
let smiley_queue = [];

let field = Array(field_width+1 * (field_height+1));
for(let x = 0; x < field_width; x++)
    for(y = 0; y < field_height; y++)
        field[x + y*field_width] = 
            ( x == 0 || x == field_width - 1
                || y == field_height - 1 ? -2: -1 )

//Create a constant string array to contain patterns for the six main tetronimos
//NOTE: This array is one-dimensional. This allows the patterns in the array to be easily 'rotated' by changing the
//formula used to access the elements of the array.

const tetrominos = [
                // Larry the long tetromino
                    "..x."+
                    "..X."+
                    "..X."+
                    "..X.",
                
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
                    if(tetrominos[tetr_type][tetr_index].toUpperCase() == 'X' && field[field_index] != -1)                      
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
let score_offset_x = screenWidth / 2;
let score_offset_y = screenHeight/8;
let highscore = localStorage.getItem("highscore");
if(highscore == null) localStorage.setItem("highscore", 0);
//console.log(highscore);

PIXI.BitmapFont.from("ScoreFont", {
    fill: "#333333",
    fontSize: 40,
    fontWeight: 'bold',
  });

let score_text = new PIXI.BitmapText(score,{fontName : 'ScoreFont', fontSize: 24, fill : 0xff1010, align : 'center'});
//app.stage.addChild(score_text);

let highscore_text = new PIXI.BitmapText(highscore,{fontName : 'ScoreFont', fontSize: 24, fill : 0xff1010, align : 'center'});
//app.stage.addChild(highscore_text);

let current_piece_index = Math.floor(Math.random()  * 100) % 7;
let current_rotation_index = 0;
let current_piece_x = field_width / 2 - 2; //represents default position where pieces will be spawned
let current_piece_y = 1;



let input = [0,0,0,0,0,0,0];

let pointer_down_pos = {x:0,y:0};
let is_dragging = false;



function setup() {

   // draw_current_piece();
   // print_field();

   // draw static elements of the playing field
   const bg = PIXI.Sprite.from('assets/bg.png');
   bg.anchor.set(0.5);
   bg.x =  screenWidth / 2;
   bg.y = screenHeight / 2;
   //console.log( "scale = " + scale);
   bg.scale.set(scale);
   //bg.scale.set(0.25, 0.25 * scale);

   let l = screenWidth / 2;
   let z = screenHeight / 2;
   let h = bg.width;
   let w = bg.height;

   x_offset = l - h/2;
   y_offset = z - w/2;


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

    // Create the circle
    // const circle = app.stage.addChild(new PIXI.Graphics()
    // .beginFill(0xffffff)
    // .lineStyle({ color: 0x111111, alpha: 0.87, width: 1 })
    // .drawCircle(0, 0, 8)
    // .endFill());

    //circle.position.set(app.screen.width / 2, app.screen.height / 2);
    
    
   app.renderer.plugins.interaction.on("pointerdown", (pointer) => {
       
        pointer_down_pos = {
            x: pointer.data.global.x,
            y: pointer.data.global.y
        };
        //console.log(pointer_down_pos);

       is_dragging = true;

    });



   app.renderer.plugins.interaction.on('pointermove', (p) => {

        if(is_dragging && (Math.abs(pointer_down_pos.x - p.data.global.x) > 60)) {
            if(pointer_down_pos.x - p.data.global.x > 0) {

                //console.log("move left");
                input[2] = 1;
                input[0] = 1;
                pointer_down_pos.x = p.data.global.x;
               
            } else
            if((pointer_down_pos.x - p.data.global.x) < 0) {

                input[3] = 1;
                input[0] = 1;
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



            //if( pointer_down_pos.x != p.data.global.x)
            //if(pointer_down_pos.x - p.data.global.x > 10)
               // console.log("drag");
    })
    
    app.renderer.plugins.interaction.on('pointerup', (p) => {is_dragging = false; if(Math.abs(pointer_down_pos.x - p.data.global.x) < 2) input[4] = 1; });

    app.renderer.plugins.interaction.on('pointerout', (p) => {is_dragging = false; if(Math.abs(pointer_down_pos.x - p.data.global.x) < 2) input[4] = 1; });

 


//LOGIC===========================================


   if(game_over) {
        if(score > highscore) localStorage.setItem("highscore", score);    
        app.stop();
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
                input[4] = 0;
            }
        }
        if(input[2]){
                if(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x - 1, current_piece_y)){
                    current_piece_x -= 1;
                    //console.log("left pressed");
                    input[2] = 0;
                    input[4] = 0;
                }
        }
        if(input[3]){
            if(check_piece_collision(current_piece_index, current_rotation_index, current_piece_x + 1, current_piece_y)){
                current_piece_x += 1;
                //console.log("right pressed");
                input[3] = 0;
                input[4] = 0;
            }
        }
        if(input[4]){
           current_rotation_index = current_rotation_index + (check_piece_collision(current_piece_index, current_rotation_index + 1, current_piece_x, current_piece_y) || 3 * check_piece_collision(current_piece_index, current_rotation_index + 3, current_piece_x, current_piece_y));
           input[4] = 0;
        }
        if(input[5]) {
         if(!stashed_this_turn){
           //console.log("in stash piece");

           //console.log("stash piece = " + stashed_piece + ", current piece = " + current_piece_index);
           
           let temp_index = stashed_piece;

           if(temp_index == -1)
            temp_index = Math.floor(Math.random() * 100) % 7;

           stashed_piece = current_piece_index;
           current_piece_index = temp_index;
           stashed_this_turn = 1;

           current_piece_x = field_width / 2 - 2; //reset current piece vars to prep for new piece
           current_piece_y = 1;
           current_rotation_index = 0;
            }  
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
        
          //console.log(smiley_queue);

          if(cleared_lines.length > 0) {
            cleared_lines.forEach(line => {
                for(let x = 1; x < field_width - 1; x++) {
                    for(let y = line; y > 0; y--) {
                        field[y * field_width + x] = field[(y-1) * field_width + x];
                        field[x] = -1;
                    }
                }
                
            });

            
             smiley_queue.forEach((smiley, index) => {
                //console.log("smiley coords: x = " + Math.floor((smiley.x+1)/(30*scale)) + ", y = " + Math.floor((smiley.y+1)/30))
                
                if(field[ Math.floor((smiley.x+1)/30) * field_width + Math.floor(smiley.y/30)] == -1) 
                    app.stage.removeChild(smiley);
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


    //print_field();
    draw_pieces();
    update_score();
   // draw_current_piece();
}

function update_score() {
    
    app.stage.removeChild(score_text);
    score_text = new PIXI.BitmapText("SCORE: " + score,{fontName : 'ScoreFont', fontSize: 24, fill : 0xF6F3F4, stroke : 0xCAB9BF, strokeThickness: 5, align : 'center'});  
    score_text.position.x = score_offset_x;
    score_text.position.y = 7* score_offset_y; 
    //console.log(score);
    score_text.scale.set(scale);
    app.stage.addChild(score_text);

    app.stage.removeChild(highscore_text);
    highscore_text = new PIXI.BitmapText("HIGH: " + highscore,{fontName : 'ScoreFont', fontSize: 24, fill : 0xF6F3F4, stroke : 0xCAB9BF, strokeThickness: 5, align : 'center'});  
    highscore_text.position.x = score_offset_x;
    highscore_text.position.y = score_offset_y;  
    //console.log(score);
    highscore_text.scale.set(scale);
    app.stage.addChild(highscore_text);

    

    
}

function draw_pieces() {

    block_queue.forEach(block => {
        app.stage.removeChild(block);
    });


    

    draw_current_piece(false);
    let count = 0;

    for(let x = 1; x < field_width - 1; x++) {
        for(let y = 1; y < field_height - 1; y++) {
            if(field[y*field_width + x] !=-1) {
                let block = PIXI.Sprite.from(choose_block_sprite(field[y*field_width + x]));//PIXI.Sprite.from('assets/block/block.png');
               
                //block.alpha = 0.75;

                block_queue.push(block);
                //block.anchor.set(0.5);
                block.scale.set(scale);
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


function draw_current_piece(is_locked = true) {
    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            if(tetrominos[current_piece_index][(rotate(x,y, current_rotation_index))].toUpperCase() == 'X') {
                field[(current_piece_y + y) * field_width + (current_piece_x + x)] = current_piece_index;
                // if(tetrominos[current_piece_index][(rotate(x,y, current_rotation_index))] == 'x')
                //     draw_smiley((current_piece_x + x), ((current_piece_y + y)), is_locked);

            }
        }
    }
}

function erase_current_piece() {
    for(let x = 0; x < 4; x++) {
        for(let y = 0; y < 4; y++) {
            if(tetrominos[current_piece_index][(rotate(x,y, current_rotation_index))].toUpperCase() == 'X') {
                field[(current_piece_y + y) * field_width + (current_piece_x + x)] = -1;
            }
        }
    }
}

function draw_smiley( pos_x, pos_y, is_locked = true) {


    let smiley = PIXI.Sprite.from('assets/smiley.png');
    smiley.x = (pos_x-1)*30*scale + x_offset;
    smiley.y = (pos_y-1)*30*scale + y_offset;
    //smiley.alpha = 0.75;
    smiley.scale.set(scale);
    app.stage.addChild(smiley);

     if(!is_locked) block_queue.push(smiley)
     else smiley_queue.push(smiley);
    


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
    //console.log(c_field);
    erase_current_piece();
}




