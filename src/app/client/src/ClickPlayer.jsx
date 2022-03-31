let context;
let audioBuffer;

// Initialize immediately to avoid delay on first click
const loadedSound = init();

async function init() {
    context = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioBuffer) {
        await loadSound("button-click.mp3").then(x => audioBuffer = x);
    }
}

function loadSound(url) {
    return window.fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
            return new Promise((resolve, reject) => {
                context.decodeAudioData(arrayBuffer, (buffer) => {
                    resolve(buffer);
                }, (e) => { reject(e); });
            })
        });
}

export default async function playClick() {
    // Make sure initialization finished
    await init();
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    source.start(0);
}

export { playClick };