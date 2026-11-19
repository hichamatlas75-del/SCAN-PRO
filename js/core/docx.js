// =========================================================
// DocxBuilder — port de DocxBuilder.kt (Open XML, sans bibliothèque)
// Gère : gras, italique, souligné, taille, couleur, alignement.
// =========================================================
import { buildZip } from './zip.js';
import { MIME } from './files.js';

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/** Taille px (éditeur) → demi-points Word ; 15px (défaut) ≈ 24 = 12 pt comme l'app Android. */
const halfPoints = (px) => Math.min(96, Math.max(16, Math.round(px * 1.6)));

function paragraphXml(p) {
  let x = `<w:p><w:pPr><w:jc w:val="${p.align}"/></w:pPr>`;
  if (!p.runs.length) x += '<w:r><w:t></w:t></w:r>';
  for (const r of p.runs) {
    x += '<w:r><w:rPr>';
    if (r.bold) x += '<w:b/>';
    if (r.italic) x += '<w:i/>';
    if (r.underline) x += '<w:u w:val="single"/>';
    x += `<w:sz w:val="${r.size ? halfPoints(r.size) : 24}"/>`;
    if (r.color) x += `<w:color w:val="${r.color.replace('#', '')}"/>`;
    x += `</w:rPr><w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`;
  }
  return x + '</w:p>';
}

function documentXml(paras) {
  return HEAD + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">\n<w:body>'
    + paras.map(paragraphXml).join('')
    + '\n<w:sectPr>\n  <w:pgSz w:w="11906" w:h="16838"/>\n  <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>\n</w:sectPr>\n</w:body>\n</w:document>';
}

const CONTENT_TYPES = HEAD + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const ROOT_RELS = HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const DOC_RELS = HEAD + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const CORE = HEAD + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title></dc:title>
  <dc:creator>ScanPro</dc:creator>
</cp:coreProperties>`;

const STYLES = HEAD + `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="24"/><w:lang w:val="fr-FR"/></w:rPr>
  </w:style>
</w:styles>`;

/** Paragraph[] → Blob .docx */
export function buildDocx(paras) {
  return buildZip([
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: '_rels/.rels', data: ROOT_RELS },
    { name: 'docProps/core.xml', data: CORE },
    { name: 'word/_rels/document.xml.rels', data: DOC_RELS },
    { name: 'word/styles.xml', data: STYLES },
    { name: 'word/document.xml', data: documentXml(paras) },
  ], MIME.docx);
}
