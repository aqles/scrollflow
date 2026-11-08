// ScrollFlow demo: playground controls and copy buttons.
// The animations themselves are all done by ScrollFlow (see window.scrollFlow).

const SNIPPETS = {
  cdn: '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/aqles/scrollflow@3.0.0/dist/scrollflow.css">\n<script src="https://cdn.jsdelivr.net/gh/aqles/scrollflow@3.0.0/dist/scrollflow.min.js" data-auto-init><\/script>',
  npm: 'npm install @aqles/scrollflow',
  import: "import ScrollFlow from '@aqles/scrollflow';\nimport '@aqles/scrollflow/dist/scrollflow.css';\n\nnew ScrollFlow();",
  markup: '<h2 data-sf-reveal="fade-up">Hello</h2>\n<p data-sf-reveal="fade-up" data-sf-delay="150">150 ms later, any number works.</p>\n<div data-sf-parallax="0.2">I drift, gently.</div>'
};

for (const btn of document.querySelectorAll('.copy-btn')) {
  btn.addEventListener('click', async () => {
    const text = SNIPPETS[btn.dataset.copy];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Select the code';
    }
    setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
  });
}

// Playground
const box = document.getElementById('pg-box');
const typeSelect = document.getElementById('pg-type');
const delayInput = document.getElementById('pg-delay');
const delayOut = document.getElementById('pg-delay-out');
const durationInput = document.getElementById('pg-duration');
const durationOut = document.getElementById('pg-duration-out');
const codeOut = document.getElementById('pg-code');

function syncPlaygroundLabels() {
  delayOut.textContent = `${delayInput.value} ms`;
  durationOut.textContent = `${durationInput.value} ms`;
  codeOut.textContent = `<div data-sf-reveal="${typeSelect.value}" data-sf-delay="${delayInput.value}">`;
}
typeSelect.addEventListener('change', syncPlaygroundLabels);
delayInput.addEventListener('input', syncPlaygroundLabels);
durationInput.addEventListener('input', syncPlaygroundLabels);
syncPlaygroundLabels();

// In native mode the disc is driven by a scroll-linked CSS animation,
// so there is no timed transition to replay. These keyframes mirror the
// library's start states; the replay below plays them once with WAAPI.
const PG_KEYFRAMES = {
  'fade-in': [{ opacity: 0 }, { opacity: 1 }],
  'fade-up': [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'translateY(0)' }],
  'fade-down': [{ opacity: 0, transform: 'translateY(-30px)' }, { opacity: 1, transform: 'translateY(0)' }],
  'slide-left': [{ opacity: 0, transform: 'translateX(-30px)' }, { opacity: 1, transform: 'translateX(0)' }],
  'slide-right': [{ opacity: 0, transform: 'translateX(30px)' }, { opacity: 1, transform: 'translateX(0)' }],
  'zoom-in': [{ opacity: 0, transform: 'scale(0.95)' }, { opacity: 1, transform: 'scale(1)' }],
  'zoom-out': [{ opacity: 0, transform: 'scale(1.05)' }, { opacity: 1, transform: 'scale(1)' }]
};
let pgAnimation = null;

document.getElementById('pg-replay').addEventListener('click', () => {
  if (!box) return;
  box.setAttribute('data-sf-reveal', typeSelect.value);
  box.setAttribute('data-sf-delay', delayInput.value);

  if (document.documentElement.classList.contains('sf-native')) {
    if (pgAnimation) pgAnimation.cancel();
    const anim = box.animate(PG_KEYFRAMES[typeSelect.value] || PG_KEYFRAMES['fade-up'], {
      duration: Number(durationInput.value),
      delay: Number(delayInput.value),
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
      fill: 'both'
    });
    pgAnimation = anim;
    // When the replay ends, hand the disc back to the scroll animation.
    anim.finished.then(() => {
      if (pgAnimation === anim) {
        anim.cancel();
        pgAnimation = null;
      }
    }, () => {});
    return;
  }

  // JS engine: snap back to the animation's start state with transitions
  // switched off (so the reset is instant instead of animating
  // backwards), then reveal again. Re-observing through ScrollFlow
  // cannot replay an element that is already on screen: the observer
  // would re-add the class before the hide transition starts.
  box.style.transition = 'none';
  box.classList.remove('sf-visible');
  void box.offsetWidth; // commit the start state before transitions return
  box.style.transition = '';
  // Set these after clearing the shorthand above: assigning
  // style.transition resets the delay/duration longhands with it.
  box.style.transitionDelay = `${delayInput.value}ms`;
  box.style.transitionDuration = `${durationInput.value}ms`;
  requestAnimationFrame(() => box.classList.add('sf-visible'));
});
