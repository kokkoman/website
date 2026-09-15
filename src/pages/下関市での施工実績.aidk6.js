import wixData from 'wix-data';
import { formFactor } from 'wix-window-frontend';

// Public, city-specific projection managed by the existing CMS workflow.
// Querying this view prevents unpublished source records from appearing here.
const SHIMONOSEKI_CASES_COLLECTION = 'ickkr9fygsfo792a91dl7vmz1d';
const ARCHIVE_MIN_HEIGHT = 860;
const ARCHIVE_MAX_HEIGHT = 16000;
// The HTML component's saved document is intentionally independent of the
// page code. Reserve enough room even before it reports its rendered height.
const ARCHIVE_FALLBACK_HEIGHT = formFactor === 'Mobile' ? 13000 : 6200;

$w.onReady(async function () {
  $w('#html1').height = ARCHIVE_FALLBACK_HEIGHT;
  const heroImageSrc = $w('#image143').src;
  $w('#image143').collapse();

  $w('#html1').onMessage((event) => {
    if (event.data?.type === 'shimonosekiArchiveHeight') {
      const measuredHeight = Number(event.data.height);
      if (Number.isFinite(measuredHeight)) {
        $w('#html1').height = Math.min(
          ARCHIVE_MAX_HEIGHT,
          Math.max(ARCHIVE_MIN_HEIGHT, Math.ceil(measuredHeight) + 8)
        );
      }
    }

    if (event.data?.type === 'shimonosekiReady') {
      $w('#html1').postMessage({ type: 'heroImage', src: heroImageSrc });
      loadCases();
    }
  });

  await loadCases();
});

async function loadCases() {
  try {
    const result = await wixData
      .query(SHIMONOSEKI_CASES_COLLECTION)
      .descending('_createdDate')
      .limit(100)
      .find();

    $w('#html1').postMessage({
      type: 'shimonosekiCases',
      items: result.items.map(toArchiveCase)
    });
  } catch (error) {
    console.error('[Shimonoseki case archive] CMS load failed', error);
  }
}

function toArchiveCase(item) {
  const values = Object.values(item);
  const textValues = values.filter((value) => typeof value === 'string');
  const imageValues = values.filter((value) => {
    const source = typeof value === 'string' ? value : value?.src;
    return typeof source === 'string' && source.startsWith('wix:image://');
  });
  const title = textValues.find((value) => value.includes('｜') && value.includes('エコキュート'))
    || textValues.find((value) => value.includes('エコキュート'))
    || '下関市 エコキュート施工実績';
  const body = textValues.find((value) => value.includes('にて') && value.length > 40)
    || textValues.find((value) => value.length > 40)
    || '';

  return {
    title,
    mainText: body,
    area: title.match(/^下関市[^｜｜]+/)?.[0] || '下関市',
    beforeImage: wixImageUrl(imageValues[0]),
    afterImage: wixImageUrl(imageValues[1])
  };
}

function wixImageUrl(value) {
  const source = typeof value === 'string' ? value : value?.src || '';
  const match = source.match(/^wix:image:\/\/v1\/([^/]+)/);
  return match ? `https://static.wixstatic.com/media/${match[1]}` : '';
}
