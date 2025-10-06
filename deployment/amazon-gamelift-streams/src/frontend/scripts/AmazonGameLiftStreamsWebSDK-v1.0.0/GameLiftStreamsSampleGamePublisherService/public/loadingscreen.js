const aspectRatio = 16/9;
const logoImage = new Image();
const backgroundImage = new Image();
let loadingFlag = false;
let startTime = new Date();

function LoadingScreenStart() {
    startTime = new Date();
    logoImage.src = "LoadingScreen/LoadingLogo.png";
    backgroundImage.src = "LoadingScreen/Background.png";

    loadingFlag = true;
    const canvas = document.getElementById("loadingScreenCanvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.aspectRatio = aspectRatio.toString();
    window.requestAnimationFrame(LoadingScreenAnimation);
}

function LoadingScreenAnimation() {
    const canvas = document.getElementById("loadingScreenCanvas");
    // Resizing so the canvas isn't stretched to fit the window.
    canvas.width = window.innerWidth;
    canvas.height = window.innerWidth / aspectRatio;
    const ctx = canvas.getContext("2d");

    // Draw background
    ctx.drawImage(
        backgroundImage,
        0,
        0,
        canvas.width,
        canvas.height);

    // Adjust logo size
    const actualImageWidth = canvas.width / 4;
    const actualImageHeight = actualImageWidth * logoImage.naturalHeight / logoImage.naturalWidth;

    // Calculate logo alpha
    const currentTime = new Date();
    const startMs = startTime.getTime();
    const currentMs = currentTime.getTime();
    const pulsePeriodMs = 3000;
    const triangleWave = Math.abs((currentMs - startMs) % pulsePeriodMs - pulsePeriodMs / 2) / pulsePeriodMs;
    // Overflow alpha to create a trapezoid wave, so that opaque time stays longer.
    ctx.globalAlpha = Math.min(0.2 + 2.0 * triangleWave, 1.0);

    // Draw image
    ctx.drawImage(
        logoImage,
        (canvas.width - actualImageWidth) / 2,
        (canvas.height - actualImageHeight) / 2,
        actualImageWidth,
        actualImageHeight);

    // Exit or continue
    if (loadingFlag) {
        window.requestAnimationFrame(LoadingScreenAnimation);
    }
}

function LoadingScreenStop() {
    loadingFlag = false;
}