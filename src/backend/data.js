import wixData from 'wix-data';

/**
 * EcoCute CMS public-view synchronizer.
 *
 * Single Source of Truth: EcoCuteCases
 * Public-facing projection: EcoCuteCasesPublic
 *
 * Only fields explicitly listed in PUBLIC_FIELDS are copied to the public
 * collection. When an item is unpublished or removed from the source
 * collection, the matching public item is removed as well.
 */
const PUBLIC_COLLECTION = 'EcoCuteCasesPublic';

const PUBLIC_FIELDS = [
  'constructionDate',
  'blogUrl',
  'attributes',
  'systemType',
  'capacity',
  'constructionComment',
  'title',
  'city',
  'area',
  'beforeManufacturer',
  'beforeModel',
  'afterManufacturer',
  'afterModel',
  'beforeImageUrl',
  'afterImageUrl'
];

function toPublicItem(item) {
  const publicItem = { _id: item._id };

  PUBLIC_FIELDS.forEach((field) => {
    const value = item[field];
    if (value !== undefined && value !== null && value !== '') {
      publicItem[field] = value;
    }
  });

  return publicItem;
}

async function removePublicItem(itemId) {
  try {
    await wixData.remove(PUBLIC_COLLECTION, itemId, {
      suppressAuth: true,
      suppressHooks: true
    });
  } catch (error) {
    // A public row may legitimately not exist for an unpublished source item.
    // Keep the source CMS operation successful while leaving a diagnostic log.
    console.warn(`[EcoCute CMS sync] public remove skipped: ${itemId}`, error);
  }
}

async function syncSourceItemToPublic(item) {
  if (!item || !item._id) {
    console.error('[EcoCute CMS sync] source item has no _id');
    return;
  }

  try {
    if (item.published === true) {
      await wixData.save(PUBLIC_COLLECTION, toPublicItem(item), {
        suppressAuth: true,
        suppressHooks: true
      });
      return;
    }

    await removePublicItem(item._id);
  } catch (error) {
    console.error(`[EcoCute CMS sync] failed: ${item._id}`, error);
  }
}

export async function EcoCuteCases_afterInsert(item) {
  await syncSourceItemToPublic(item);
  return item;
}

export async function EcoCuteCases_afterUpdate(item) {
  await syncSourceItemToPublic(item);
  return item;
}

export async function EcoCuteCases_afterRemove(item) {
  await removePublicItem(item._id);
  return item;
}
