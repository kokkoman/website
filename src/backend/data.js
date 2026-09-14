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

function toPublicItem(item) {
  const publicItem = { _id: item._id };

  PUBLIC_FIELDS.forEach((field) => {
    const value = item[field];
    if (isPresent(value)) {
      publicItem[field] = value;
    }
  });

  if (!isPresent(publicItem.constructionComment)) {
    publicItem.constructionComment = buildFallbackConstructionComment(item);
  }

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
