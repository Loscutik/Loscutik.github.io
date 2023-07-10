// TODO fix bug: when the pause is pressed at the moment of animation removing of lines, a tetromino continue to fall
import { tetrominoesData, HEART_TIME } from "./data.js";
import { Tetromino } from "./tetrominoclass.js";
import { gamebox } from "./gamebox.js"
import { currentStatus, pauseResumeToggle, restartGame, toggleMessageBox, msToMinutesSecondsString, blinkHeart, removeHeart, pickAndShowNextTetromino, updateScore, refillHeart, updateLines, updateLevel } from "./gameStatus.js"

//Option to disable start screen for development:
// 1) style.css: #startBox -> display: none; & #startScreenOverlay -> display: none;
// 2) gameStatus.js: currentStatus.startScreen = false;
// 3) script.js: on the bottom decomment "tetromino = ..." & "animate()"

window.addEventListener("DOMContentLoaded", function () {
    buttonListener("startButton", startGame);
    buttonListener("pauseButton", pauseResumeToggle);
    buttonListener("restartButton", renewGame);
});

window.addEventListener("runAnimation", (event) => animate(event.timeStamp));

//Helper function to handle button clicks
function buttonListener(buttonId, callback) {
    const button = document.getElementById(buttonId);
    button.addEventListener("click", callback);
}

function renewGame() {
    gamebox.resetGrid();
    tetromino = restartGame();
    animate(performance.now());
    // cancelAnimationFrame(currentStatus.frame.animationId)
}

function startGame() {

    document.getElementById("startBox").style.display = "none";
    document.getElementById("startScreenOverlay").style.display = "none";
    const now = performance.now()
    currentStatus.startInit();
    tetromino = new Tetromino(tetrominoesData[currentStatus.nextTetromino]);
    pickAndShowNextTetromino();
    animate(now);
}

let tetromino;

class InputHandler {
    constructor() {
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
        };
        this.keysDownTimes = {}
        window.addEventListener('keydown', e => {
            switch (e.key) {
                case "ArrowLeft":
                case "ArrowRight":
                case "ArrowDown":
                case "ArrowUp":
                    this.keys[e.key] = true;
                    break;
                case " ":
                    if (!currentStatus.startScreen) pauseResumeToggle(e);
                    break;
                case "r":
                case "R":
                    if (!currentStatus.startScreen) renewGame();
                    break;
                case "Enter":
                    if (currentStatus.startScreen) startGame();

                    break;
            }
        });

        window.addEventListener('keyup', e => {
            if (e.key === "ArrowLeft" ||
                e.key === "ArrowRight" ||
                e.key === "ArrowDown" ||
                e.key === "ArrowUp"
            ) {
                this.keys[e.key] = false;
            }
        });
    }
}

const input = new InputHandler();

async function animate(time) {
    //console.log('start ', currentStatus.frame.animationId);
    if (/*currentStatus.pause.is === true ||*/ tetromino == 0) {
        return
    }

    const frameDuration = time - currentStatus.prevAnimationTime;
    currentStatus.frame.count++;
    currentStatus.gameOneSecond += frameDuration;

    // move it at the beginning to take into account frames passed during animation of lines remove.
    if (currentStatus.gameOneSecond >= 1000) {
        //Update main timer
        let playingTime = time - currentStatus.startTime - currentStatus.pause.duration;
        document.getElementById('mainTimer').textContent = msToMinutesSecondsString(playingTime);

        //Update heart timer
        let heartTime = HEART_TIME - ((time - currentStatus.heart.startTime - currentStatus.heart.pauseDuration) / 1000).toFixed();
        if (heartTime > HEART_TIME) heartTime = HEART_TIME;

        if (heartTime < 1) {
            removeHeart();
            if (currentStatus.statistic.livesLeft === 0) {
                gameOver();
                return;
            }
        } else {
            const heartStopperCollection = document.getElementsByClassName('heartStopper');
            heartStopperCollection[currentStatus.statistic.livesLeft - 1].textContent = heartTime;
            if (heartTime === 3) {
                blinkHeart();
            }
        }

        //Calculate the average frame rate over the last 60 frames
        let averageFPS = (currentStatus.frame.count + currentStatus.frame.numbersDuringRowsRemove) / (currentStatus.gameOneSecond / 1000);
        //console.log(averageFPS);
        currentStatus.frame.numbersDuringRowsRemove=0;

        document.getElementById("fpsDisplay").innerHTML = averageFPS.toFixed(2);

        currentStatus.frame.count = 0;
        currentStatus.gameOneSecond = 0;
    }

    //let speed = currentStatus.currentTetromino.speed.current;
    let speed = Math.trunc(currentStatus.currentTetromino.speed.current * frameDuration + currentStatus.currentTetromino.speed.fraction);
    currentStatus.currentTetromino.speed.fraction = currentStatus.currentTetromino.speed.current * frameDuration - speed;
    //Speed up downward movement with Down Arrow key
    if (input.keys.ArrowDown) {
        speed = 8;
    }


    // moveDown moves the tetromino down if it is possible
    // and returns true if the movement had done and false otherwise
    currentStatus.currentTetromino.isMovingDown = tetromino.moveDown(speed);

    if (!currentStatus.currentTetromino.isMovingDown) {
        currentStatus.currentTetromino.freezeDelayTime += frameDuration;
        if (currentStatus.currentTetromino.freezeDelayTime > currentStatus.currentTetromino.delayBeforeFreeze) {
            gamebox.freezeTilesInBox(tetromino.getOccupiedCells());

            const rowsToRemove = gamebox.checkForFinishedRows();

            if (rowsToRemove.numberOfCompletedRows != 0) {
                const removeRowsStart = performance.now();
                await rowsToRemove.removeRows;
                currentStatus.frame.numbersDuringRowsRemove = Math.round((performance.now() - removeRowsStart) * (currentStatus.frame.count / (currentStatus.gameOneSecond)))
                refillHeart(time);
                updateScore(rowsToRemove.numberOfCompletedRows);
                updateLines(rowsToRemove.numberOfCompletedRows);
                updateLevel(frameDuration);
            }


            tetromino = new Tetromino(tetrominoesData[currentStatus.nextTetromino]);
            pickAndShowNextTetromino();
            //New tetromino fits fully to screen, but ends game
            if (tetromino == 0) { // if the new tetromino is empty, toString will return ''
                gameOver();
                //cancelAnimationFrame(currentStatus.frame.animationId);
                return
            }
            currentStatus.currentTetromino.freezeDelayTime = 0;
            currentStatus.currentTetromino.isMovingDown = true;
        }
    }

    //Turn tetromino with Up Arrow key
    if (input.keys.ArrowUp) {
        tetromino.rotate();
        input.keys.ArrowUp = false;
    }

    //Move tile horizontally
    if (input.keys.ArrowRight) {
        tetromino.moveRight();
        input.keys.ArrowRight = false;

    } else if (input.keys.ArrowLeft) {
        tetromino.moveLeft();
        input.keys.ArrowLeft = false;
    }

    //On every 60 frames:
    // if (currentStatus.frame.count % 60 === 0) {
    //     //Update main timer
    //     let playingTime = time - currentStatus.startTime - currentStatus.pause.duration;
    //     document.getElementById('mainTimer').textContent = msToMinutesSecondsString(playingTime);

    //     //Update heart timer
    //     let heartTime = HEART_TIME - ((time - currentStatus.heart.startTime - currentStatus.heart.pauseDuration) / 1000).toFixed();
    //     if (heartTime > HEART_TIME) heartTime = HEART_TIME;
    //     if (heartTime < 1) {
    //         removeHeart();
    //         if (currentStatus.statistic.livesLeft === 0) {
    //             toggleMessageBox("GAME OVER");
    //             currentStatus.isOver = true;
    //             return;
    //         }
    //     } else {
    //         const heartStopperCollection = document.getElementsByClassName('heartStopper');
    //         heartStopperCollection[currentStatus.statistic.livesLeft - 1].textContent = heartTime;
    //         if (heartTime === 3) {
    //             blinkHeart();
    //         }
    //     }

    //     //Calculate the average frame rate over the last 60 frames
    //     let averageFPS = 60 / ((time - currentStatus.frame.last) / 1000);
    //     document.getElementById("fpsDisplay").innerHTML = averageFPS.toFixed(2);
    //     currentStatus.frame.last = time;
    // }

    currentStatus.prevAnimationTime = time;

    // console.log('finish ', currentStatus.frame.animationId);

    //Loop the animation
    currentStatus.frame.animationId = requestAnimationFrame(animate);
    //  console.log('run new ', currentStatus.frame.animationId, performance.now());
}

function gameOver() {
    toggleMessageBox("GAME OVER");
    currentStatus.isOver = true;
}

//Decomment for running without startScreen
// tetromino = new Tetromino(tetrominoesData[Math.floor(Math.random() * 7)]);
// animate();