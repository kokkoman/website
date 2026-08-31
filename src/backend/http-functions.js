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
  const walk = (value, path = []) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, String(index)]));
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => walk(item, [...path, key]));
      return;
    }
    const key = path.filter((part) => !/^\\d+$/.test(part)).pop();
    const text = String(value).trim();
    if (key && text) result[key] = text;
  };
  walk(payload);
  return result;
}

function findValue(fields, candidates) {
  const key = Object.keys(fields).find((name) => candidates.some((candidate) => name.includes(candidate)));
  return key ? fields[key] : '未入力';
}

function buildChatworkMessage(fields) {
  if (!Object.keys(fields).length) return '';

  const name = findValue(fields, ['氏名', 'お名前', '名前', 'name']);
  const phone = findValue(fields, ['電話', 'TEL', 'tel', 'phone']);
  const address = findValue(fields, ['住所', 'address']);
  const inquiry = findValue(fields, ['問い合わせ', 'お問合せ', '内容', 'message']);

  return [
    '[info][title]【要確認】Wixフォームから新規お問い合わせ[/title]',
    `氏名：${name}`,
    `電話番号：${phone}`,
    `住所：${address}`,
    `お問い合わせ内容：${inquiry}`,
    '受付経路：Wix',
    '[/info]',
  ].join('\n');
}
