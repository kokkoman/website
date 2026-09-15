import { formFactor } from 'wix-window-frontend';

const BEFORE_LABEL_COLOR = '#4B5563';
const AFTER_LABEL_COLOR = '#009FE3';
const LABEL_TEXT_COLOR = '#FFFFFF';

$w.onReady(function () {
  // Emergency rollback remains in place: keep the previously problematic
  // custom HTML archive disabled and preserve the Wix-native page layout.
  $w('#html1').collapse();
  $w('#image143').expand();

  // Apply presentation-only refinements to the native page. Global header and
  // footer text are explicitly excluded so the site-wide design is untouched.
  applyNativePagePresentation();
});

function applyNativePagePresentation() {
  try {
    $w('Text').forEach((element) => {
      if (element.global === true) {
        return;
      }

      const text = normalizeText(element.text);
      if (!text) {
        return;
      }

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
    // Styling failure must never break the page itself.
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
  const fontSize = formFactor === 'Mobile' ? 15 : 16;

  element.html = `<h6 style="background-color:${backgroundColor};color:${LABEL_TEXT_COLOR};font-size:${fontSize}px;font-weight:700;text-align:center;line-height:1.5;letter-spacing:0.04em">${label}</h6>`;
}

function enlargeNativeText(element) {
  const html = element.html;
  if (typeof html !== 'string' || !html) {
    return;
  }

  const resizedHtml = html.replace(
    /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi,
    (match, sizeValue) => {
      const currentSize = Number(sizeValue);
      if (!Number.isFinite(currentSize)) {
        return match;
      }

      const nextSize = adjustedFontSize(currentSize);
      if (nextSize === currentSize) {
        return match;
      }

      return `font-size:${nextSize}px`;
    }
  );

  if (resizedHtml !== html) {
    element.html = resizedHtml;
  }
}

function adjustedFontSize(currentSize) {
  // Keep the hierarchy already designed in Wix. Only text that is relatively
  // small is enlarged, which improves readability without inflating large
  // headings or causing excessive wrapping in the case cards.
  if (formFactor === 'Mobile') {
    if (currentSize <= 12) return currentSize + 2;
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
