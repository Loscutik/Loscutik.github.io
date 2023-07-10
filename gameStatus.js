import { tetrominoesData, HEART_TIME, START_SPEED } from "./data.js";
import { Tetromino } from "./tetrominoclass.js";

//TODO separate into inside objects corresponding to their objects (heart, pause, frame,...etc) 
export let currentStatus = {
    startScreen: true,
    isOver: false,
    startTime: undefined,
    prevAnimationTime: undefined,
    gameOneSecond:0,
    nextTetromino: chooseTetrominoNumber(),

    pause: {
        startTime: undefined,
        duration: 0,
        is: false,
    },

    heart: {
        startTime: undefined,
        pauseDuration: 0,
    },

    currentTetromino: {
        isMovingDown: true,
        freezeDelayTime: 0,
        delayBeforeFreeze: 300,
        speed: {
            current: START_SPEED,
            fraction: 0,
        },
    },

    frame: {
        count: 0,
        numbersDuringRowsRemove: 0,
        last: undefined,
        animationId: 0,
    },

    statistic: {
        livesLeft: 3,
        score: 0,
        completedLines: 0,
        level: 1,
    },

    startInit() {
        const now = performance.now();
        this.startScreen = false;
        this.startTime = now;
        this.heart.startTime = now;
        this.frame.last = now;
        this.prevAnimationTime = now;
    },

    reset() {
        const now = performance.now();
        this.startTime = now;
        this.isOver = false;
        this.prevAnimationTime = now;
        this.gameOneSecond = 0;
        this.pause.duration = 0;
        this.pause.is = false;
        this.heart.startTime = now;
        this.heart.pauseDuration = 0;
        this.currentTetromino.freezeDelayTime = 0;
        this.currentTetromino.isMovingDown = true;
        this.currentTetromino.speed.current = START_SPEED;
        this.currentTetromino.speed.fraction = 0;
        this.frame.count = 0;
        this.frame.last = now;
        this.statistic.livesLeft = 3;
        this.statistic.score = 0;
        this.statistic.completedLines = 0;
        this.statistic.level = 1;
    }
}

function chooseTetrominoNumber() {
    return Math.floor(Math.random() * 7)
}

export function pauseResumeToggle(event) {
    if (currentStatus.isOver === true) {
        return
    };
    const pauseBtn = document.getElementById("pauseButton");
    const pauseBtnText = document.getElementById("pauseButtonText");
    const activeHeart = document.getElementsByClassName("heart")[currentStatus.statistic.livesLeft - 1];
    if (currentStatus.pause.is === true) {
        const newPauseDuration = performance.now() - currentStatus.pause.startTime;
        currentStatus.pause.duration += newPauseDuration;
        currentStatus.heart.pauseDuration += newPauseDuration;
        // pauseBtnText.textContent = "PAUSE";
        // pauseBtn.classList.remove("pauseButtonGreen");
        // pauseBtn.classList.add("pauseButtonRed");
        togglePauseButton(pauseBtn, pauseBtnText, "PAUSE", "pauseButtonGreen", "pauseButtonRed")
        toggleMessageBox();
        activeHeart.style.animationPlayState = "running";
        currentStatus.pause.is = false;
        currentStatus.prevAnimationTime = event.timeStamp; //performance.now();
        window.dispatchEvent(new Event('runAnimation'));
    } else {
        currentStatus.pause.startTime =  event.timeStamp; //performance.now();
        //console.log('pause at ', currentStatus.pause.startTime, ' will cancel a frame ', currentStatus.frame.animationId);
        window.cancelAnimationFrame(currentStatus.frame.animationId);
        // pauseBtnText.textContent = "RESUME";
        // pauseBtn.classList.remove("pauseButtonRed");
        // pauseBtn.classList.add("pauseButtonGreen");
        togglePauseButton(pauseBtn, pauseBtnText, "RESUME", "pauseButtonRed", "pauseButtonGreen")
        toggleMessageBox("PAUSED");
        activeHeart.style.animationPlayState = "paused";
        currentStatus.pause.is = true;
    }
}

function togglePauseButton(pauseBtn, pauseBtnText, text, classToRemove, classToAdd) {
    pauseBtnText.textContent = text;
    pauseBtn.classList.remove(classToRemove);
    pauseBtn.classList.add(classToAdd);
}

export function restartGame() {
    window.cancelAnimationFrame(currentStatus.frame.animationId);
    document.getElementById('mainTimer').textContent = "00:00";
    const gameboxElement = document.getElementById("gamebox");
    const tetrominoes = gameboxElement.querySelectorAll('.tetromino');
    tetrominoes.forEach(tetromino => {
        tetromino.remove();
    });

    resetHearts();

    if (currentStatus.pause.is === true) {
        // pauseBtnText.textContent = "PAUSE";
        // pauseBtn.classList.remove("pauseButtonGreen");
        // pauseBtn.classList.add("pauseButtonRed");
        togglePauseButton(document.getElementById("pauseButton"), document.getElementById("pauseButtonText"), "PAUSE", "pauseButtonGreen", "pauseButtonRed")
    }

    const messageBox = document.getElementById("gameMessageBox");
    messageBox.style.display = "none";

    currentStatus.reset();
    displayScore(currentStatus.statistic.score);
    displayLines(currentStatus.statistic.completedLines);
    displayLevel(currentStatus.statistic.level);
    pickAndShowNextTetromino();
    //window.dispatchEvent(new Event('runAnimation'));
    return new Tetromino(tetrominoesData[chooseTetrominoNumber()]);
}

function resetHearts() {
    const hearts = document.getElementsByClassName("heart");
    [...hearts].forEach(heart => {
        heart.classList.remove("removedHeart");
        heart.classList.remove("heartBlinkLastSecs");
        heart.style.opacity = "1";
    });
    const heartStopper = document.getElementsByClassName("heartStopper");
    heartStopper[0].innerHTML = "";
    heartStopper[1].innerHTML = "";
    heartStopper[2].innerHTML = HEART_TIME;
}

export function toggleMessageBox(message) {
    const messageBox = document.getElementById("gameMessageBox");
    const messageSpan = document.getElementById("gameMessage");
    if (messageBox.style.display !== "flex") {
        messageSpan.textContent = message;
        messageBox.style.display = "flex";
    } else {
        messageBox.style.display = "none";
    }
}

export function msToMinutesSecondsString(ms) {
    var minutes = Math.floor(ms / 60000);
    var seconds = ((ms % 60000) / 1000).toFixed(0);
    return (minutes < 10 ? '0' : '') + minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

//Updated score by how many rows were completed at once
export function updateScore(rowsCompleted) {
    const pointsPerRows = {
        1: 100,
        2: 300,
        3: 500,
        4: 800,
    }
    if (rowsCompleted > 4) {
        rowsCompleted = 4;
    }
    currentStatus.statistic.score += pointsPerRows[rowsCompleted];
    displayScore(currentStatus.statistic.score);
}

export function updateLines(number) {
    currentStatus.statistic.completedLines += number;
    displayLines(currentStatus.statistic.completedLines);
}

export function updateLevel() {
    if (currentStatus.statistic.completedLines > 0 && currentStatus.statistic.completedLines / 10 >= currentStatus.statistic.level) {
        currentStatus.statistic.level++;
        currentStatus.currentTetromino.speed.current += 0.5 * START_SPEED;
        currentStatus.currentTetromino.delayBeforeFreeze -= 50;
        displayLevel(currentStatus.statistic.level);
    }
}

//Add leading zeroes to score and display new score in DOM
function displayScore(newScore) {
    // const leadingZeroes = 4 - String(newScore).length;
    // let scoreString = "";
    // for (let i = 0; i < leadingZeroes; i++) {
    //     scoreString += "0"
    // }
    // scoreString += newScore;
    document.getElementById("score").innerHTML = String(newScore).padStart(4, '0');
}


function displayLines(newLines) {
    document.getElementById("lines").innerHTML = newLines;
}

function displayLevel(newLevel) {
    document.getElementById("level").innerHTML = newLevel;
}

export function blinkHeart() {
    const heartToBlink = document.getElementsByClassName("heart")[currentStatus.statistic.livesLeft - 1];
    heartToBlink.classList.add("heartBlinkLastSecs");
}

export function refillHeart(fireTime) {
    document.getElementsByClassName("heartStopper")[currentStatus.statistic.livesLeft - 1].innerHTML = HEART_TIME;
    const heartWrapper = document.getElementsByClassName("heartWrapper")[currentStatus.statistic.livesLeft - 1];
    heartWrapper.classList.remove("refillHeart");
    void heartWrapper.offsetWidth; //Force a reflow to run animation again // when this function runs in the animate function we don't need this
    heartWrapper.classList.add("refillHeart");
    currentStatus.heart.startTime = fireTime + 1000;
    currentStatus.heart.pauseDuration = 0;
}

//Remove heart if time has ran out
export function removeHeart() {
    currentStatus.statistic.livesLeft -= 1;
    document.getElementsByClassName("heartStopper")[currentStatus.statistic.livesLeft].innerHTML = "";
    const heartToRemove = document.getElementsByClassName("heart")[currentStatus.statistic.livesLeft];
    heartToRemove.classList.remove("heartBlinkLastSecs");
    heartToRemove.classList.add("removedHeart");
    if (currentStatus.statistic.livesLeft !== 0) {
        currentStatus.heart.startTime = performance.now();
        currentStatus.heart.pauseDuration = 0;
        setTimeout(function () {
            document.getElementsByClassName("heartStopper")[currentStatus.statistic.livesLeft - 1].innerHTML = HEART_TIME;
        }, 500)
    }
}

export function pickAndShowNextTetromino() {
    const tetrominoPreviews = document.getElementsByClassName("nextTetromino");
    tetrominoPreviews[currentStatus.nextTetromino].style.opacity = "0";
    currentStatus.nextTetromino = chooseTetrominoNumber();
    tetrominoPreviews[currentStatus.nextTetromino].style.opacity = "1";
}