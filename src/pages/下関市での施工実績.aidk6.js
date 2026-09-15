import wixWindowFrontend from 'wix-window-frontend';

const BEFORE_LABEL_COLOR = '#4B5563';
const AFTER_LABEL_COLOR = '#009FE3';
const LABEL_TEXT_COLOR = '#FFFFFF';

$w.onReady(function () {
  // Keep the problematic custom HTML archive disabled and preserve
  // the Wix-native page layout.
  $w('#html1').collapse();
  $w('#image143').expand();

  applyNativePagePresentation();
});

function applyNativePagePresentation() {
  try {
    const textElements = $w('Text');

    textElements.forEach((element) => {
      const text = normalizeText(element.text);
      if (!text) return;

      if (isBeforeLabel(text)) {
        applyCaseLabel(element, '施工前', BEFORE_LABEL_COLOR);
        return;
      }

      if (isAfterLabel(text)) {
        applyCaseLabel(element, '施工後', AFTER_LABEL_COLOR);
        return;
      }

      enlargeNativeText(element);
    });
  } catch (error) {
    console.error('[Shimonoseki page] presentation update failed', error);
  }
}

function isBeforeLabel(text) {
  return text === '交換前' || text === 'BEFORE' || text === 'Before' || text === '施工前';
}

function isAfterLabel(text) {
  return text === '交換後' || text === 'AFTER' || text === 'After' || text === '施工後';
}

function applyCaseLabel(element, label, backgroundColor) {
  const fontSize = wixWindowFrontend.formFactor === 'Mobile' ? 15 : 16;

  element.html = `<p style="background-color:${backgroundColor};color:${LABEL_TEXT_COLOR};font-size:${fontSize}px;font-weight:700;text-align:center;line-height:1.5;letter-spacing:0.04em">${label}</p>`;
}

function enlargeNativeText(element) {
  const html = element.html;
  if (typeof html !== 'string' || !html) return;

  const resizedHtml = html.replace(
    /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi,
    (match, sizeValue) => {
      const currentSize = Number(sizeValue);
      if (!Number.isFinite(currentSize)) return match;

      const nextSize = adjustedFontSize(currentSize);
      return nextSize === currentSize ? match : `font-size:${nextSize}px`;
    }
  );

  if (resizedHtml !== html) {
    element.html = resizedHtml;
  }
}

function adjustedFontSize(currentSize) {
  if (wixWindowFrontend.formFactor === 'Mobile') {
    if (currentSize <= 14) return currentSize + 2;
    if (currentSize <= 16) return currentSize + 1;
    return currentSize;
  }

  if (currentSize <= 13) return currentSize + 2;
  if (currentSize <= 20) return currentSize + 1;
  return currentSize;
}

function normalizeText(value) {
  return typeof value === 'string'
    ? value.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim()
    : '';
}
