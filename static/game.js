// Initial setup

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const pieceImages = {}; // Preloaded images
const maxPieces = 9;
const pieceSize = 30; 
const pieceGap = 5; 

const isPC = !('ontouchstart' in window || navigator.maxTouchPoints > 0);
const piecePadding = isPC ? 0 : 10;

let initialized = false;

let whiteArray = []; 
let blackArray = [];

let replacementIndex = 0;

let whiteOnBoard = 0;
let blackOnBoard = 0;

let blackStreaksCount = 0;
let whiteStreaksCount = 0;

let blackStreakSet = new Set();
let whiteStreakSet = new Set();

let blackScore = 0;
let whiteScore = 0;

let sandClock = false;

let nineStepsDone = false;
let stepsDone = 0;

let possibleThreats = [];
let possibleMoves = [];
let moveMap = {}; // possible restricted moves for black (1 step into an empty spot / from-to pairs)

let isSelecting = false;
let isDragging = false;
let draggedPiece = null;
let mouseOffset = { x: 0, y: 0 };
let oldNode = null;
let newNode = null;
let startX = 0;
let startY = 0;

// Preload images for performance
function preloadImages(imagesLoaded) {
    const whiteImg = new Image();
    const blackImg = new Image();

    whiteImg.src = 'static/images/whitePc.png';
    blackImg.src = 'static/images/blackPc.png';

    whiteImg.onload = () => {
        pieceImages['white'] = whiteImg;
        checkImagesLoaded(imagesLoaded);
    };
    blackImg.onload = () => {
        pieceImages['black'] = blackImg;
        checkImagesLoaded(imagesLoaded);
    };
}

function checkImagesLoaded(imagesLoaded) {
    if (pieceImages['white'] && pieceImages['black']) {
        imagesLoaded();
    }
}

function drawGrid() {

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)"; 
    ctx.shadowOffsetX = 3;  
    ctx.shadowOffsetY = 3;  
    ctx.shadowBlur = 5;

    // Clear canvas before drawing grid and pieces
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3 squares
    for (let i = 0; i < 3; i++) {
        const offset = i * gridStep;
        const squareSize = gridSize - offset * 2;
        const halfSquare = squareSize / 2;

        ctx.strokeRect(
            centerX - gridSize / 2 + offset,
            centerY - gridSize / 2 + offset,
            squareSize,
            squareSize
        );

        // 8 nodes per square, excluding the center
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                const posX = centerX - halfSquare + halfSquare * x;
                const posY = centerY - halfSquare  + halfSquare * y;

                if (x === 1 && y === 1) continue; // Skip the center

                ctx.beginPath();
                ctx.arc(posX, posY, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "black"; 
                ctx.fill();
            }
        }
    }

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - gridStep);  
    ctx.lineTo(centerX, centerY - gridStep * 3); 

    ctx.moveTo(centerX, centerY + gridStep);  
    ctx.lineTo(centerX, centerY + gridStep * 3);  

    ctx.moveTo(centerX - gridStep, centerY);  
    ctx.lineTo(centerX - gridStep * 3, centerY);  

    ctx.moveTo(centerX + gridStep, centerY); 
    ctx.lineTo(centerX + gridStep * 3, centerY); 
    
    ctx.stroke();
}

function drawPieces(player) {
    const playerArray = player === "black" ? blackArray : whiteArray;
    const img = pieceImages[player];
    
    playerArray.forEach(piece => {
        if (piece !== draggedPiece) {
            ctx.drawImage(img, piece.x, piece.y, pieceSize, pieceSize);
        }
    });

    if (draggedPiece) {
        const whiteImg = pieceImages["white"];
        ctx.drawImage(whiteImg, draggedPiece.x, draggedPiece.y, pieceSize, pieceSize);
    }
}



function drawBoard() {
    drawGrid();
    drawPieces("white"); 
    drawPieces("black");
}

function updateCoordinates() {
    const newCoordinates = (playerArray, startX, startY, pieceSize, pieceGap) => {
        playerArray.forEach((piece, index) => {
            playerArray[index] = {
                ...piece, // Keep other properties
                x: startX + index * (pieceSize + pieceGap),
                y: startY
            };
        });
    };
    
    const matchGrid = (playerArray, playerMap, grid) => {
        for (let row = 0; row < grid.length; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const pieceIndex = [...playerMap.values()].findIndex(p => p.row === row && p.col === col);
                
                if (pieceIndex !== -1) {
                    const piece = playerArray[pieceIndex];

                    if (piece.row !== null && piece.col !== null) {
                        const { x, y } = calculateCoordinates(row, col);
                        playerArray[pieceIndex] = { ...piece, x, y };
                        playerMap.set(pieceIndex, { x, y, row, col });
                    }
                }
            }
        }
    };

    const widthArray = maxPieces * pieceSize + (8 * pieceGap);
    
    const startXWhite = centerX - widthArray / 2;
    const startYWhite = centerY + gridSize / 2 + gridStep;
    newCoordinates(whiteArray, startXWhite, startYWhite, pieceSize, pieceGap);

    const startXBlack = centerX - widthArray / 2;
    const startYBlack = centerY - gridSize / 2 - pieceSize - gridStep;
    newCoordinates(blackArray, startXBlack, startYBlack, pieceSize, pieceGap);

    matchGrid(whiteArray, whiteMap, grid);
    matchGrid(blackArray, blackMap, grid);
}



function resizeCanvas() {    
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight;

    centerX = canvas.width / 2;
    centerY = canvas.height / 2;

    gridSize = Math.min(canvas.width, canvas.height) / 2;
    gridStep = gridSize / 6;

    if (initialized) {
        console.log("Updating coordinates...");
        updateCoordinates();
    }

    console.log("Updating coordinates...");
    updateCoordinates();
    
    console.log("black after :", blackArray);
    console.log("black after :", blackMap);
    console.log("Redrawing board...");

    ///////////////////////////////////////
    drawBoard();
}

window.addEventListener('resize', resizeCanvas);

// Grid setup (matrix)

let grid = [
    [0, 'x', 'x', 0, 'x', 'x', 0],
    ['x', 0, 'x', 0, 'x', 0, 'x'],
    ['x', 'x', 0, 0, 0, 'x', 'x'],
    [0, 0, 0, 'x', 0, 0, 0],
    ['x', 'x', 0, 0, 0, 'x', 'x'],
    ['x', 0, 'x', 0, 'x', 0, 'x'],
    [0, 'x', 'x', 0, 'x', 'x', 0]
  ];
  
function isEmpty(row, col) {
    return grid[row][col] === 0;
}
    
function isBlocked(row, col) {
    return grid[row][col] === 'x';
}

function isWhite(row, col) {
    return grid[row][col] === 1;
}

function isBlack(row, col) {
    return grid[row][col] === -1;
}

function isValid(r, c) {
    return isWithinBounds(r, c) && !isBlocked(r, c) && (r !== 3 || c !== 3);
}

function printMatrix(matrix) {
    matrix.forEach(row => {
        console.log(row.join(' ')); // Join each row into a string and print it
    });
}

const directions = {
    up: [-1, 0],    // 1 step up
    down: [1, 0],   // 1 step down
    left: [0, -1],  // 1 step left
    right: [0, 1]   // 1 step right
    };

const directionsSimple = {
    down: [1, 0],   // 1 step down
    right: [0, 1]   // 1 step right
    };

function isWithinBounds(r, c) {
    console.log(`Checking bounds: row=${r}, col=${c}`);
    return !(r < 0 || r >= 7 || c < 0 || c >= 7);
}

// Calculate x, y based on grid(row, col)
function calculateCoordinates(row, col) {
    const x = centerX - gridSize / 2 + col * gridStep - pieceSize / 2;
    const y = centerY - gridSize / 2 + row * gridStep - pieceSize / 2;
    return { x, y };
}

// Check if a spot(x,y) is a valid node in the grid(row, col)
function checkNode(x, y) {

    const row = Math.round((y - (centerY - gridSize / 2)) / gridStep);
    const col = Math.round((x - (centerX - gridSize / 2)) / gridStep);

     if (isWithinBounds(row, col)) {
    
        const nodeX = centerX - gridSize / 2 + col * gridStep;
        const nodeY = centerY - gridSize / 2 + row * gridStep;

        // console.log(`Calculated row: ${row}, col: ${col}, x: ${nodeX - pieceSize / 2}, y: ${nodeY - pieceSize / 2}`); //
        return { row, col, x: nodeX - pieceSize / 2, y: nodeY - pieceSize / 2 };
    }
    return null; // Not a valid spot
    console.log("Invalid spot.")
}

function updateGrid() {
    grid.forEach((row, rowIndex) => {
        row.forEach((col, colIndex) => {
            if (col !== 'x') grid[rowIndex][colIndex] = 0; // Reset
        });
    });

    const updateSpot = (playerArray, value) => {
        playerArray.forEach(piece => {
            const spot = checkNode(piece.x, piece.y);
            if (spot && grid[spot.row] && grid[spot.row][spot.col] !== null) {
                grid[spot.row][spot.col] = value;
            }
        });
    };

    updateSpot(blackArray, -1);
    updateSpot(whiteArray, 1);
}



// runs at (re)start
function initializePieces() {

    blackArray = [];
    whiteArray = [];
    
    const widthArray = maxPieces * pieceSize + (8 * pieceGap);
    
    const startXWhite = centerX - widthArray / 2;
    const startYWhite = centerY + gridSize / 2 + gridStep; // below the grid

    for (let i = 0; i < maxPieces; i++) {
        whiteArray.push({ x: startXWhite + i * (pieceSize + pieceGap), y: startYWhite });
    }

    // Black pieces above the grid
    const startXBlack = centerX - widthArray / 2;
    const startYBlack = centerY - gridSize / 2 - pieceSize - gridStep; // above the grid

    for (let i = 0; i < maxPieces; i++) {
        blackArray.push({ x: startXBlack + i * (pieceSize + pieceGap), y: startYBlack });
    }

    initialized = true;
    
    console.log("Current blackArray:", blackArray);
    console.log("Current whiteArray:", whiteArray);
}

function initializeMap(playerArray) {
    const playerMap = new Map();
    playerArray.forEach((piece, index) => {
        playerMap.set(index, {
            x: piece.x,
            y: piece.y,
            row: null,
            col: null // Initially out of bounds
        });
    });
    return playerMap;
}

let blackMap = initializeMap(blackArray);
let whiteMap = initializeMap(whiteArray);

function updateMap(player) {
    const playerData = {
        black: { playerArray: blackArray, playerMap: blackMap },
        white: { playerArray: whiteArray, playerMap: whiteMap }
    };

    const { playerArray, playerMap } = playerData[player] || {};

    if (playerArray && playerMap) {
        playerArray.forEach((piece, index) => {
            const spot = checkNode(piece.x, piece.y); // Calculate row and col
            playerMap.set(index, {
                x: piece.x,
                y: piece.y,
                row: spot ? spot.row : null,
                col: spot ? spot.col : null
            });
        });

        console.log(`${player}:`, playerArray);
        console.log(`${player} Map:`, playerMap);
    }
}

function updateBoard() {
    
    whiteOnBoard = 0;
    blackOnBoard = 0;

    drawBoard();

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            if (isWhite(row, col)) {  
                whiteOnBoard++;  
            } else if (isBlack(row, col)) { 
                blackOnBoard++;  
            }
        }
    }
    checkGameOver();
}

function resetBoard() {
    console.log("Reseting the board...");
    resizeCanvas();
    preloadImages(() => {
        initializePieces();

        whiteOnBoard = 0;
        blackOnBoard = 0;
        whiteScore = 0;
        blackScore = 0;
        nineStepsDone = false;
        stepsDone = 0;
        replacementIndex = 0;

        blackMap = initializeMap(blackArray);
        whiteMap = initializeMap(whiteArray);

        updateScore();
        updateBoard();
        updateGrid();
        printMatrix(grid); 
    });
}

function startMessage() {
    const messageElement = document.getElementById('start-message');
    const startButton = document.getElementById('start-button');
    messageElement.hidden = false;
    
    startButton.addEventListener('click', function() {
        messageElement.hidden = true;
    });
}

function initializeGame() {
    resizeCanvas();
    preloadImages(() => {
        initializePieces();
        updateBoard();
        startMessage();
    });
}


// Gameplay management

function updateArray(x, y, player, oldRow = null, oldCol = null, draggedPiece = null) {
    let oldX = null, oldY = null;
    
    if (oldRow !== null && oldCol !== null) {
        const oldCoordinates = calculateCoordinates(oldRow, oldCol);
        oldX = oldCoordinates.x;
        oldY = oldCoordinates.y;
    }

    if (player === "black") {
        if (oldRow !== null && oldCol !== null) {
            const indexToUpdate = blackArray.findIndex(piece => piece.x === oldX && piece.y === oldY);
            if (indexToUpdate !== -1) {
                blackArray[indexToUpdate] = { x, y };
            }
        } else if (!nineStepsDone) { 
            blackArray[replacementIndex] = { x, y };
            //console.log(`New black piece placed at INDEX ${replacementIndex}:`, blackArray[replacementIndex]);
            replacementIndex++;
            //console.log("replacementIndex +1, new:", replacementIndex);
        }

    } else if (player === "white") {
        if (oldRow !== null && oldCol !== null) {
            const indexToUpdate = whiteArray.findIndex(piece => piece.x === oldRow && piece.y === oldCol);
            if (indexToUpdate !== -1) {
                whiteArray[indexToUpdate] = { x, y };
            }
        } else if (draggedPiece) {
            whiteArray[0] = { x: draggedPiece.x, y: draggedPiece.y };
        }
    }
}

function clearNode(row, col) {
    if (grid[row][col] !== 0) {
        grid[row][col] = 0;
        console.log(`Cleared cell [${row}, ${col}]!`);
    } else {
        console.log(`Attempted to clear an already empty node at ${row}, col: ${col}.`);
    }
}

function movePlayer(oldRow, oldCol, newRow, newCol, player) {
    const { x, y } = calculateCoordinates(newRow, newCol); // uses new row,col to calculate new x,y
    //console.log(`Moving... Calculating: x = ${x}, y = ${y} of new spot at [${newRow}, ${newCol}].`);

    if (grid[newRow] && grid[newRow][newCol] === 0) {
        grid[newRow][newCol] = player === "black" ? -1 : 1; // updates grid with -1 or 1
        updateArray(x, y, player, oldRow, oldCol); // updates array (replaces old with new)
        //console.log(`Moved ${player} from [${oldRow}, ${oldCol}] to [${newRow}, ${newCol}]`);

        if (oldRow !== null && oldCol !== null) {
            clearNode(oldRow, oldCol, player);
        }
        return { x, y };  // new coordinates
    } else {
        console.log("Can't move, cell is already occupied or out of bounds.");
        return null;  // failed
    }
}

function messageInvalid(row, col) {
    const messageElement = document.getElementById('invalid-message');
    
    // Calculate position (e.g., use calculateCoordinates here)
    const { x, y } = calculateCoordinates(row, col);
  
    // Set the position of the message
    messageElement.style.left = `${x}px`;
    messageElement.style.top = `${y}px`;
  
    // Show the message
    messageElement.removeAttribute('hidden');
    
    setTimeout(() => {
      messageElement.setAttribute('hidden', '');
    }, 1000);
  }

// AI strategy

function findThreat(grid) {
    possibleThreats = []; // Ensure it's cleared at the start
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
            if (isEmpty(row, col)) {
                let sumNextDoor = 0;

                for (let dir in directions) {
                    const [dr, dc] = directions[dir];
                    let sumNeighbours = 0;
                    let maxSteps = 2;

                    for (let step = 1; step <= maxSteps; step++) {
                        const r = row + dr * step;
                        const c = col + dc * step;

                        if (!isWithinBounds(r, c) || (r === 3 && c === 3)) {
                            continue;
                        }

                        if (isBlocked(r, c)) {
                            maxSteps++;
                        }

                        if (isWhite(r, c)) {
                            sumNeighbours += 1;

                            if (maxSteps - step === 1) {
                                sumNextDoor += 1;
                            }
                        }
                    }

                    if (sumNeighbours > 1 || sumNextDoor > 1) {
                        possibleThreats.push({ r: row, c: col });
                        console.log(`Threat detected at (${row}, ${col})`);
                    }
                }
            }
        }
    }

    if (possibleThreats.length === 0) {
        console.log("No threats found.");
    }

    return possibleThreats.length > 0 ? possibleThreats : null; // Return all threats, or null if none
}

// Phase 1

function aiMoveFree(grid) {

    if (possibleThreats && possibleThreats.length > 0) {
        for (const move of possibleThreats) {
            if (isEmpty(move.r, move.c)) {
                movePlayer(null, null, move.r, move.c, "black");
                console.log(`AI blocked a threat at:`, move);
                return move;
            }
        }
    }

    // If no threats were blocked, do a random move
    let randomMove = null;
    let tries = 0;
    while (tries < 100) {
        const r = Math.floor(Math.random() * 7);
        const c = Math.floor(Math.random() * 7);

        if (isEmpty(r, c)) {
            randomMove = { r, c };
            movePlayer(null, null, randomMove.r, randomMove.c, "black");
            console.log(`AI made a FREE random move to`, randomMove);
            break;
        }
        tries++;
    }

    if (!randomMove) {
        console.log("No valid moves left for AI.");
        return null;
    }

    return randomMove;
}

// Phase 2

function restrictedMove(grid) {
    possibleMoves = [];
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
            if (isBlack(row, col)) {
                for (let dir in directions) {
                    const [dr, dc] = directions[dir];
                    let r = row;
                    let c = col;
                    let maxSteps = 1;

                    for (let step = 1; step <= maxSteps; step++) {
                        r = row + dr * step;
                        c = col + dc * step;

                        if (!isWithinBounds(r, c) || (r === 3 && c === 3)) {
                            continue;
                        }

                        if (isBlocked(r, c)) {
                            maxSteps++;
                        }

                        if (isEmpty(r, c)) {
                            moveMap[`${r},${c}`] = { oldRow: row, oldCol: col };
                            possibleMoves.push({ newRow: r, newCol: c });
                        }
                    }
                }
            }
        }
    }

    return possibleMoves;
}

function aiRestrictedMove(grid) {
    console.log(`Making a RESTRICTED move!`);

    for (let threat of possibleThreats) {
        for (let move of possibleMoves) {
            if (move.newRow === threat.r && move.newCol === threat.c) {
                if (moveMap[`${move.newRow},${move.newCol}`]) {
                    const { oldRow, oldCol } = moveMap[`${move.newRow},${move.newCol}`];
                    console.log(`Found a blocking move: (${oldRow}, ${oldCol}) -> (${move.newRow}, ${move.newCol})`);
                    movePlayer(oldRow, oldCol, move.newRow, move.newCol, "black");
                    return;

                } else {
                    console.error("Move not found in moveMap", move.newRow, move.newCol);
                }
            }
        }
    }

    console.log('No threat-blocking move found. Choosing a random move.');
    let validMoves = possibleMoves.filter(move => isEmpty(move.newRow, move.newCol));

    if (validMoves.length === 0) {
        console.error("No valid restricted move found.");
        return;
    }

    let randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    const { newRow, newCol } = randomMove;

    if (moveMap[`${newRow},${newCol}`]) {
        const { oldRow, oldCol } = moveMap[`${newRow},${newCol}`];
        console.log(`AI made a RESTRICTED move from (${oldRow}, ${oldCol}) to (${newRow}, ${newCol})`);
        movePlayer(oldRow, oldCol, newRow, newCol, "black");

    } else {
        console.error("Move not found in moveMap", newRow, newCol);
    }
}

// Phase 3

function blackRandom() {
    const randomIndex = Math.floor(Math.random() * blackArray.length);
    const { x, y } = blackArray[randomIndex];  // Select a random black from array
    const spot = checkNode(x, y);  // Check if the spot is valid
    if (spot) {
        const { row, col } = spot;  // Extract the row and column of the valid spot
        return { oldRow: row, oldCol: col };  // Return the coordinates of the black piece
    }
    return null;  // If the spot is not valid, return null
}


function aiJumps(grid) {

    if (possibleThreats && possibleThreats.length > 0) {
        // Iterate through all threats and block them
        for (const move of possibleThreats) {
            // Check if a move is available to block this threat
            if (isEmpty(move.r, move.c)) {
                const { oldRow, oldCol } = blackRandom();
                movePlayer(oldRow, oldCol, move.r, move.c, "black"); // Jump to block the threat
                console.log(`AI JUMPED from (${oldRow}, ${oldCol}) and blocked threat at:`, move);
                return move; // Return the move to confirm the blocking jump
            }
        }
    }

    // If no threats were blocked, do a random jump
    let randomMove = null;
    let tries = 0;
    while (tries < 100) {
        const r = Math.floor(Math.random() * 7);
        const c = Math.floor(Math.random() * 7);
        console.log(`Attempt #${tries + 1}: Trying position (${r}, ${c})`);

        if (isEmpty(r, c)) {
            randomMove = { r, c };
            const { oldRow, oldCol } = blackRandom();
            movePlayer(oldRow, oldCol, randomMove.r, randomMove.c, "black");
            console.log(`AI made a random JUMP from (${oldRow}, ${oldCol}) to`, randomMove);
            break;
        }
        tries++;
    }

    if (!randomMove) {
        console.log("No valid moves left for AI.");
        return null;
    }

    return randomMove;
}

// Selects a strategy

function aiMove() {
    findThreat(grid);
    if (!nineStepsDone && stepsDone === 9) {
        nineStepsDone = true;
    }

    if (nineStepsDone) {
        if (blackOnBoard >= 4 && blackOnBoard <= 9) {
            restrictedMove();
            aiRestrictedMove(grid);
        } else if (blackOnBoard < 4) {
            aiJumps(grid);
        }
    } else {
        aiMoveFree(grid);
    }

    stepsDone++;
    //console.log("Steps done:", stepsDone, "Nine steps done:", nineStepsDone);

    updateBoard(); // after placing/moving black
    updateMap("black");
    updateGrid();
    
    streak();
    updateMap("white");
    toggleSandClock();
}

function toggleSandClock() {
    const sandClockElement = document.getElementById('sand-clock');
    if (sandClockElement) {
        sandClock = !sandClock;
        sandClockElement.hidden = !sandClock;
    } else {
        console.error("ERROR: Sand Clock element not found!");
    }
}

// Scores

function addStreakToSet(streakSet, positions, isBlack) {
    const positionsString = JSON.stringify(positions);  // Convert the positions array to a string

    if (!streakSet.has(positionsString)) {
        streakSet.add(positionsString);  // Add the stringified positions to the set if it's not already there

        if (isBlack) {
            blackScore++;
            console.log(`blackScore++, new score: ${blackScore}`);
            removePiece("black");  // Remove a black piece
            messageScored("black");
        } else {
            whiteScore++;
            console.log(`whiteScore++, new score: ${whiteScore}`);
            removePiece("white");  // Remove a white piece
            messageScored("white");
        }
    }
}

function messageScored(player) {
    const messageElement = document.getElementById('scored-message');
    const textElement = document.getElementById('removed-text');

    if (!messageElement || !textElement) {
        console.error("Error: Missing required elements (scored-message or removed-text).");
        return;
    }

    // Set the message text based on the player
    if (player === 'black') {
        textElement.textContent = 'Black scored! White piece was removed.';
    } else if (player === 'white') {
        textElement.textContent = 'White scored! Select a black piece to remove.';
    }

    // Show the message by removing the hidden attribute
    messageElement.removeAttribute('hidden');

    // Hide the message after 2 seconds
    setTimeout(() => {
        messageElement.setAttribute('hidden', '');
    }, 5000);  // 2 seconds delay
}

// Check if all positions in the streak are valid after a move
function checkIfStreakIsValid(streakSet, player) {
    streakSet.forEach(streakString => {
        const positions = JSON.parse(streakString);  // Parse the streak positions
        let valid = true;
        
        for (let [r, c] of positions) {
            if (player === "black") {
                if (!isBlack(r, c)) {
                    valid = false; // black streak not valid (piece was removed)
                    break;
                }
            } else if (player === "white") {
                if (!isWhite(r, c)) { 
                    valid = false; // white streak not valid (piece was removed)
                    break;
                }
            }
        }
        // If the streak is no longer valid, remove it from the set
        if (!valid) {
            streakSet.delete(streakString);
        }
    });
}

function checkingIfStreak(row, col, incrementStreaks) {
    // console.log(`Checking for streaks...`);
    
    for (let dir in directionsSimple) {
        const [dr, dc] = directionsSimple[dir];
        let maxSteps = 3;
        let blackStreak = 1;
        let whiteStreak = 1;
        let positions = [[row, col]];  // Start the streak from the current position

        for (let step = 1; step <= maxSteps; step++) {
            const r = row + dr * step;
            const c = col + dc * step;

            if (!isWithinBounds(r, c) || (r === 3 && c === 3)) {
                break;
            }

            if (isBlocked(r, c)) {
                maxSteps++;
            }

            // Check if the current position matches the black or white piece
            if (isBlack(row, col) && isBlack(r, c)) {
                blackStreak++;
                positions.push([r, c]);
                //console.log(`Black Streak +1`);
            } else if (isWhite(row, col) && isWhite(r, c)) {
                whiteStreak++;
                positions.push([r, c]);
                //console.log(`White Streak +1`);
            }

            if (blackStreak === 3 || whiteStreak === 3) {
                // console.log(`Streak! For ${isBlack(row, col) ? "Black" : "White"} at [${row}, ${col}].`);
                addStreakToSet(isBlack(row, col) ? blackStreakSet : whiteStreakSet, positions, isBlack(row, col));
                
                //console.log(`blackStreak: ${blackStreak}`);
                //console.log(`whiteStreak: ${whiteStreak}`);
                incrementStreaks();
                break;  // Stops searching that direction
            }
        }
    }
}

function updateScore() {
    const whiteScoreElement = document.querySelector('.white-score');
    const blackScoreElement = document.querySelector('.black-score');
    
    whiteScoreElement.textContent = `White: ${whiteScore}`;
    blackScoreElement.textContent = `Black: ${blackScore}`;
}

// Removing 1 piece
function whiteRandom() {
    // Retry until a valid result is found
    while (true) {
        const randomIndex = Math.floor(Math.random() * whiteArray.length);
        const { x, y } = whiteArray[randomIndex];
        const spot = checkNode(x, y);

        if (spot) {
            const { row, col } = spot;
            whiteArray.splice(randomIndex, 1);  // Remove the selected piece from the array
            console.log(`Random white removed from array!`);
            return { x, y, oldRow: row, oldCol: col };  // Return the valid result immediately
        } else {
            console.log(`Spot not chosen. Retrying...`);
        }
    }
}

function removePiece(player) {
    if (player === "black") {
        console.log(`Black will remove 1 white piece...`);
        const { oldRow, oldCol } = whiteRandom(); // removes one randomly
        if (oldRow !== undefined && oldCol !== undefined) {
            clearNode(oldRow, oldCol); // Pass the correct values to clearNode
            removeFromArray(oldRow, oldCol, player);
        }
    } else if (player === "white") {
        console.log(`Wait for selection...`);
        isSelecting = true; // allow selection from blackArray
    }
}

function removeFromArray(oldRow, oldCol, player) {
    console.log("Running helper: removing from array...");
    const oldCoordinates = calculateCoordinates(oldRow, oldCol);
    const oldX = oldCoordinates.x;
    const oldY = oldCoordinates.y;

    if (player === "black") {
        const indexToRemove = blackArray.findIndex(piece => piece.x === oldX && piece.y === oldY);
        if (indexToRemove !== -1) {
            blackArray.splice(indexToRemove, 1);
            console.log("indexToRemove:", indexToRemove);

            replacementIndex--;
            console.log("blackArray after removal:", blackArray);
            console.log("replacementIndex updated to:", replacementIndex);
        }
    } else if (player === "white") {
        const indexToRemove = whiteArray.findIndex(piece => piece.x === oldRow && piece.y === oldCol);
        if (indexToRemove !== -1) {
            whiteArray.splice(indexToRemove, 1);
            console.log("whiteArray after removal:", whiteArray);
        }
    }
}

function streak() {
    blackStreaksCount = 0;
    whiteStreaksCount = 0; // Reset counters

    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid.length; col++) {
            if (isBlack(row, col)) {
                checkingIfStreak(row, col, () => blackStreaksCount++);
            }

            if (isWhite(row, col)) {
                checkingIfStreak(row, col, () => whiteStreaksCount++);
            }
        }
    }

    checkIfStreakIsValid(blackStreakSet, "black");
    checkIfStreakIsValid(whiteStreakSet, "white");

    // console.log(`blackStreaksCount: ${blackStreaksCount}, whiteStreaksCount: ${whiteStreaksCount}`);
    console.log(`Black Streaks Set: `, blackStreakSet);
    console.log(`White Streaks Set: `, whiteStreakSet);

    updateScore();
    updateBoard();
    updateGrid();
}

function checkGameOver() {
    if (blackArray.length === 2) {
        displayGameOver("Congratulations! White wins!");
    }

    if (whiteArray.length === 2) {
        displayGameOver("Better luck next time! Black wins!");
    }
}

function initializeFireworks() {
    if (typeof Fireworks === "undefined") {
        console.error("Fireworks.js is not loaded!");
        return;
    }

    const fireworksCanvas = document.getElementById("fireworksCanvas");
    if (!fireworksCanvas) {
        console.error("Fireworks canvas not found!");
        return;
    }

    window.fireworks = new Fireworks.default(fireworksCanvas, {
        autoresize: true,
        maxRockets: 5,
        rocketSpawnInterval: 150,
        numParticles: 100,
        explosionMinHeight: 0.2,
        explosionMaxHeight: 0.9,
        fadeOut: true
    });
}

function displayGameOver(message) {
    const gameOverMessageElement = document.getElementById('game-over-message');
    const heading = document.getElementById('game-over-heading');
    heading.textContent = message;
    gameOverMessageElement.style.display = 'block';

    if (window.fireworks) {
        window.fireworks.start();
    } else {
        console.log("Fireworks instance not found!");
    }
}

function restartGame() {
    if (window.fireworks) {
        window.fireworks.stop();
    }

    const gameOverMessageElement = document.getElementById('game-over-message');
    gameOverMessageElement.style.display = 'none';

    document.querySelector(".white-score").textContent = "White: 0";
    document.querySelector(".black-score").textContent = "Black: 0";

    resetBoard();
}


// Events

function getCoordinates(e) {
    let mouseX = 0;
    let mouseY = 0;

    const rect = canvas.getBoundingClientRect();
    console.log(`Canvas bounding rect: left=${rect.left}, top=${rect.top}, width=${rect.width}, height=${rect.height}`);

    if (e.touches && e.touches.length > 0) { // At least one touch point
        mouseX = e.touches[0].clientX - rect.left;
        mouseY = e.touches[0].clientY - rect.top;
    } 
    else if (e.clientX && e.clientY) {
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    }

    console.log(`getCoordinates: mouseX=${mouseX}, mouseY=${mouseY}`);
    return { mouseX, mouseY };
}

// Mouse Down / Touch Start Event
function handleStart(e) {
    e.preventDefault();
    const { mouseX, mouseY } = getCoordinates(e);
    console.log(`handleStart: mouseX=${mouseX}, mouseY=${mouseY}, isSelecting=${isSelecting}`);
    let clickedPiece = null;

    if (isSelecting) {
        clickedPiece = blackArray.find(piece =>
            mouseX >= piece.x &&
            mouseX <= piece.x + pieceSize + piecePadding &&
            mouseY >= piece.y &&
            mouseY <= piece.y + pieceSize + piecePadding
        );

        if (clickedPiece) {
            oldNode = checkNode(clickedPiece.x, clickedPiece.y);
            console.log(`Selected black piece, oldNode:`, oldNode);
            if (oldNode) {
                const { row, col } = oldNode;
                clearNode(row, col);
                console.log(`Removing from array...`);
                removeFromArray(row, col, "black");
                isSelecting = false;
                console.log(`Stop selecting.`);
            }
        } else {
            console.log("Error: Must select a black piece.");
        }
    } else {
        clickedPiece = whiteArray.find(piece =>
            mouseX >= piece.x &&
            mouseX <= piece.x + pieceSize + piecePadding &&
            mouseY >= piece.y &&
            mouseY <= piece.y + pieceSize + piecePadding
        );

        if (clickedPiece) {
            isDragging = true;
            draggedPiece = clickedPiece;
            mouseOffset = { x: mouseX - clickedPiece.x, y: mouseY - clickedPiece.y };
            startX = mouseX;
            startY = mouseY;

            oldNode = checkNode(clickedPiece.x, clickedPiece.y);
            console.log(`Dragging started on white piece, oldNode:`, oldNode);
        } else {
            console.log("Error: No white piece selected.");
        }
    }
    console.log(`Piece Bounds: x=${clickedPiece ? clickedPiece.x : 'N/A'}, y=${clickedPiece ? clickedPiece.y : 'N/A'}, size=${pieceSize}, padding=${piecePadding}`);
}


// Mouse Move / Touch Move Event
function handleMove(e) {
    e.preventDefault();
    if (isDragging && draggedPiece) {
        const { mouseX, mouseY } = getCoordinates(e);

        console.log(`handleMove: mouseX=${mouseX}, mouseY=${mouseY}, draggedPiece:`, draggedPiece);

        draggedPiece.x = mouseX - mouseOffset.x;
        draggedPiece.y = mouseY - mouseOffset.y;
        updateBoard(); // Redraw board with dragged piece
    }
}

// Mouse Up / Touch End Event
function handleEnd(e) {
    e.preventDefault();
    if (!isDragging || !draggedPiece) {
        console.log("handleEnd: Not dragging or no piece to release.");
        return;
    }

    isDragging = false;
    const { mouseX, mouseY } = getCoordinates(e);

    console.log(`handleEnd: mouseX=${mouseX}, mouseY=${mouseY}`);

    // Calculate the new position
    newNode = checkNode(mouseX, mouseY);
    if (!newNode) {
        console.log("Error: No valid node found for mouse release.");
        return;
    }

    const { row: newRow, col: newCol } = newNode;
    if (!isWithinBounds(newRow, newCol) || !isEmpty(newRow, newCol)) {
        console.error("Target spot is not valid or not empty.");
        messageInvalid(newRow, newCol);
        return;
    }

    console.log(`handleEnd: Moving piece from oldNode to newNode:`, oldNode, newNode);

    if (oldNode) {
        const { row: oldRow, col: oldCol } = oldNode;
        movePlayer(oldRow, oldCol, newRow, newCol, 'white');
    } else {
        movePlayer(null, null, newRow, newCol, 'white');
    }

    draggedPiece.x = newNode.x;
    draggedPiece.y = newNode.y;

    console.log(`Piece placed at new position: x=${draggedPiece.x}, y=${draggedPiece.y}`);

    updateBoard(); // After placing/moving white
    updateMap("white");
    updateGrid();
    streak();

    const waitingForSelection = setInterval(function() {
        if (!isSelecting) {
            toggleSandClock();
            clearInterval(waitingForSelection); // Stop the interval once selection is done
            setTimeout(() => {
                aiMove();
                draggedPiece = null; // Reset dragged piece
            }, 1000);
        } else {
            console.log("AI is waiting for player selection to finish...");
        }
    }, 1000);
}


document.addEventListener("DOMContentLoaded", function () {
    initializeGame();
    initializeFireworks();
});

canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('touchstart', handleStart);

canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('touchmove', handleMove);

canvas.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchend', handleEnd);

document.getElementById('restart-button').addEventListener('click', restartGame);
