// Minimal OpenType/TrueType reader: family, subfamily, weight and italic flag from the 'name' and 'OS/2'
// tables. Enough to generate @font-face rules from whatever files the DS ships, without a font library.

/** @param {Buffer} buf @param {number} offset @param {number} length */
const utf16be = (buf, offset, length) => {
  let s = '';
  for (let i = 0; i < length; i += 2) s += String.fromCharCode(buf.readUInt16BE(offset + i));
  return s;
};

/**
 * @param {Buffer} buf
 * @returns {{ family: string, subfamily: string, weight: number, italic: boolean, variable: boolean }}
 */
export function readFontInfo(buf) {
  const tag = buf.toString('latin1', 0, 4);
  if (!['\0\x01\0\0', 'OTTO', 'true'].includes(tag))
    throw new Error(`not an OpenType/TrueType font (tag ${JSON.stringify(tag)})`);
  const numTables = buf.readUInt16BE(4);
  /** @type {Record<string, number>} */
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    tables[buf.toString('latin1', rec, rec + 4)] = buf.readUInt32BE(rec + 8);
  }
  /** @type {Record<number, string>} */
  const names = {};
  const nameAt = tables.name;
  if (nameAt !== undefined) {
    const count = buf.readUInt16BE(nameAt + 2);
    const strings = nameAt + buf.readUInt16BE(nameAt + 4);
    for (let i = 0; i < count; i++) {
      const r = nameAt + 6 + i * 12;
      const platform = buf.readUInt16BE(r);
      const language = buf.readUInt16BE(r + 4);
      const id = buf.readUInt16BE(r + 6);
      const length = buf.readUInt16BE(r + 8);
      const offset = strings + buf.readUInt16BE(r + 10);
      // Windows, English (US): UTF-16BE. Prefer it; fall back to Mac Roman.
      if (platform === 3 && language === 0x409) names[id] = utf16be(buf, offset, length);
      else if (platform === 1 && names[id] === undefined)
        names[id] = buf.toString('latin1', offset, offset + length);
    }
  }
  let weight = 400;
  let italic = false;
  const os2 = tables['OS/2'];
  if (os2 !== undefined) {
    weight = buf.readUInt16BE(os2 + 4);
    italic = (buf.readUInt16BE(os2 + 62) & 1) === 1;
  }
  const subfamily = names[17] ?? names[2] ?? '';
  return {
    family: names[16] ?? names[1] ?? '',
    subfamily,
    weight,
    italic: italic || /italic|oblique/i.test(subfamily),
    variable: tables.fvar !== undefined,
  };
}
