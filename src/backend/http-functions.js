import { badRequest, ok, serverError } from 'wix-http-functions';
import { getSecret } from 'wix-secrets-backend';

const CHATWORK_ROOM_ID = '446318424';
const CHATWORK_TOKEN_SECRET = 'CHATWORK_API_TOKEN_WIX_NOTIFY';

/**
 * Receives a Wix Automation webhook and posts a concise lead alert to Chatwork.
 * This endpoint is intentionally independent from the existing Sheets workflow.
 */
export async function post_chatworkNotify(request) {
  try {
    const payload = await request.body.json();
    const fields = flattenPayload(payload);
    const message = buildChatworkMessage(fields);

    if (!message) {
      return badRequest({ body: { error: 'No form data was supplied.' } });
    }

    const token = await getSecret(CHATWORK_TOKEN_SECRET);
    const response = await fetch(
      `https://api.chatwork.com/v2/rooms/${CHATWORK_ROOM_ID}/messages`,
      {
        method: 'post',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'x-chatworktoken': token,
        },
        body: new URLSearchParams({ body: message, self_unread: '1' }).toString(),
      },
    );

    if (!response.ok) {
      console.error(`Chatwork notification failed: HTTP ${response.status}`);
      return serverError({ body: { error: 'Chatwork notification failed.' } });
    }

    return ok({ body: { delivered: true } });
  } catch (error) {
    console.error('Chatwork notification error:', error);
    return serverError({ body: { error: 'Chatwork notification failed.' } });
  }
}

function flattenPayload(payload) {
  const entries = Array.isArray(payload?.fields)
    ? payload.fields
    : Array.isArray(payload?.formSubmission?.fields)
      ? payload.formSubmission.fields
      : [];

  if (entries.length) return entries.reduce((result, field) => {
    const key = String(field?.label || field?.key || field?.fieldName || '').trim();
    const value = Array.isArray(field?.value)
      ? field.value.join(', ')
      : String(field?.value ?? field?.textValue ?? '').trim();
    if (key && value) result[key] = value;
    return result;
  }, {});

  const result = {};
  const addField = (key, value) => {
    if (!key || value === null || value === undefined) return;
    const text = Array.isArray(value) ? value.join(', ') : String(value).trim();
    if (text) result[String(key).trim()] = text;
  };
  const walk = (value, path = []) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, String(index)]));
      return;
    }
    if (typeof value === 'object') {
      const label = value.label || value.fieldLabel || value.fieldName || value.name || value.title;
      const fieldValue = value.value ?? value.fieldValue ?? value.answer ?? value.textValue;
      if (label && fieldValue !== undefined && typeof fieldValue !== 'object') addField(label, fieldValue);
      Object.entries(value).forEach(([key, item]) => walk(item, [...path, key]));
      return;
    }
    const key = path.filter((part) => !/^\\d+$/.test(part)).pop();
    const text = String(value).trim();
    if (key && text) addField(key, text);
  };
  walk(payload);
  return result;
}

function findValue(fields, candidates) {
  const key = Object.keys(fields).find((name) => candidates.some((candidate) => name.includes(candidate)));
  return key ? fields[key] : '未入力';
}

function formatJapanesePhone(value) {
  if (!value || value === '未入力') return value;
  let digits = String(value).replace(/[^0-9]/g, '');
  if (digits.startsWith('81')) digits = `0${digits.slice(2)}`;
  if (digits.length === 11 && /^0[789]0/.test(digits)) {
    return digits.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
  }
  return value;
}

function buildChatworkMessage(fields) {
  if (!Object.keys(fields).length) return '';

  const name = findValue(fields, ['氏名', 'お名前', '名前', 'name']);
  const email = findValue(fields, ['メールアドレス', 'メール', 'email', 'e-mail']);
  const phone = formatJapanesePhone(findValue(fields, ['電話', 'TEL', 'tel', 'phone']));
  const address = findValue(fields, ['住所', 'address']);
  const manufacturer = findValue(fields, ['メーカー', '製造元', 'manufacturer', 'brand']);
  const model = findValue(fields, ['機種名', '品番', '型番', 'model', 'product']);
  const considering = findValue(fields, ['検討機種', '交換を検討', '検討', 'consider']);
  const inquiry = findValue(fields, ['問い合わせ', 'お問合せ', '内容', 'message']);

  return [
    '[info][title]【要確認】Wixフォームから新規お問い合わせ[/title]',
    `氏名：${name}`,
    `メールアドレス：${email}`,
    `電話番号：${phone}`,
    `住所：${address}`,
    `メーカー：${manufacturer}`,
    `機種名・品番：${model}`,
    `検討機種：${considering}`,
    `お問い合わせ内容：${inquiry}`,
    '受付経路：Wix',
    '[/info]',
  ].join('\n');
}
