import wixData from 'wix-data';

/**
 * EcoCute CMS public-view synchronizer.
 *
 * Single Source of Truth: EcoCuteCases
 * Public-facing projection: EcoCuteCasesPublic
 *
 * Existing public image URLs are intentionally preserved because the public
 * collection may contain optimized/canonical media variants. Other public
 * fields follow the source item. When an item is unpublished or removed from
 * the source collection, the matching public item is removed as well.
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

const PRESERVE_EXISTING_FIELDS = new Set([
  'beforeImageUrl',
  'afterImageUrl'
]);

function isPresent(value) {
  return value !== undefined && value !== null && value !== '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!isPresent(value)) return '';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function buildFallbackConstructionComment(item) {
  const location = [item.city, item.area].filter(isPresent).join('');
  const before = [item.beforeManufacturer, item.beforeModel].filter(isPresent).join(' ');
  const after = [item.afterManufacturer, item.afterModel].filter(isPresent).join(' ');
  const date = formatDate(item.constructionDate);

  const parts = [];
  if (location) parts.push(`${location}で`);
  if (before && after) {
    parts.push(`${before}から${after}へエコキュートを交換した施工記録です。`);
  } else if (after) {
    parts.push(`${after}を設置した施工記録です。`);
  } else {
    parts.push('エコキュートの施工記録です。');
  }
  if (date) parts.push(`施工日は${date}です。`);

  return `<p>${escapeHtml(parts.join(''))}</p>`;
}

function buildPublicItem(sourceItem, existingPublicItem) {
  const publicItem = existingPublicItem
    ? { ...existingPublicItem, _id: sourceItem._id }
    : { _id: sourceItem._id };

  PUBLIC_FIELDS.forEach((field) => {
    if (existingPublicItem && PRESERVE_EXISTING_FIELDS.has(field)) return;

    const value = sourceItem[field];
    if (isPresent(value)) {
      publicItem[field] = value;
    } else {
      delete publicItem[field];
    }
  });

  if (!isPresent(sourceItem.constructionComment)) {
    publicItem.constructionComment = buildFallbackConstructionComment(sourceItem);
  }

  return publicItem;
}

async function findPublicItem(itemId) {
  const result = await wixData
    .query(PUBLIC_COLLECTION)
    .eq('_id', itemId)
    .limit(1)
    .find({ suppressAuth: true });

  return result.items[0] || null;
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
      const existingPublicItem = await findPublicItem(item._id);
      const publicItem = buildPublicItem(item, existingPublicItem);

      await wixData.save(PUBLIC_COLLECTION, publicItem, {
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
