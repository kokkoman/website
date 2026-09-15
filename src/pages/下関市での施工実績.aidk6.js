import wixData from 'wix-data';

// Public, city-specific projection managed by the existing CMS workflow.
// Querying this view prevents unpublished source records from appearing here.
const SHIMONOSEKI_CASES_COLLECTION = 'ickkr9fygsfo792a91dl7vmz1d';
const ARCHIVE_HEIGHT = 3000;

$w.onReady(async function () {
  $w('#html1').height = ARCHIVE_HEIGHT;
  const heroImageSrc = $w('#image143').src;
  $w('#image143').collapse();

  $w('#html1').onMessage((event) => {
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

    console.log('[Shimonoseki case archive] field keys', Object.keys(result.items[0] || {}));

    $w('#html1').postMessage({
      type: 'shimonosekiCases',
      items: result.items
    });
  } catch (error) {
    console.error('[Shimonoseki case archive] CMS load failed', error);
  }
}
