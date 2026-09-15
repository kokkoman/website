$w.onReady(function () {
  // Emergency rollback: disable the custom HTML archive iframe until the
  // embedded document can autosize reliably. The iframe was trapping scroll
  // inside a small viewport and breaking the page layout.
  $w('#html1').collapse();

  // Restore the original Wix-native hero/content that existed before the
  // custom archive replacement. Native Wix sections remain in the normal page
  // flow and use the site's existing desktop/mobile layouts.
  $w('#image143').expand();
});
