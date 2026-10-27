const { deflateRawSync } = require('zlib');

const columns = [
    ['created_at', 'Date/time (UTC)'], ['category', 'Report type'], ['event_type', 'Event'], ['severity', 'Severity'],
    ['outcome', 'Outcome'], ['actor', 'Administrator / actor'], ['actor_type', 'Actor type'], ['source', 'Source'],
    ['action', 'Action'], ['target_type', 'Target type'], ['target_id', 'Target ID'], ['target_label', 'Target'],
    ['method', 'HTTP method'], ['path', 'API path'], ['status_code', 'HTTP status'], ['ip_address', 'IP address'],
    ['user_agent', 'Browser / client'], ['details', 'Details (safe metadata)']
];

function cellText(value) {
    if (value == null) return '';
    if (value instanceof Date) return value.toISOString();
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function csvCell(value) {
    let text = cellText(value);
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function csvFor(rows) {
    const lines = rows.map((row) => columns.map(([key]) => csvCell(row[key])).join(';'));
    return `\uFEFFsep=;\r\n${columns.map(([, label]) => csvCell(label)).join(';')}\r\n${lines.join('\r\n')}`;
}

function xmlEscape(value) {
    const valid = [];
    let length = 0;
    for (const character of String(value)) {
        const point = character.codePointAt(0);
        const allowed = point === 0x9 || point === 0xa || point === 0xd || (point >= 0x20 && point <= 0xd7ff) || (point >= 0xe000 && point <= 0xfffd) || (point >= 0x10000 && point <= 0x10ffff);
        if (!allowed) continue;
        const units = character.length;
        if (length + units > 32767) break;
        valid.push(character);
        length += units;
    }
    return valid.join('').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function columnName(index) {
    let name = '';
    while (index > 0) { const remainder = (index - 1) % 26; name = String.fromCharCode(65 + remainder) + name; index = Math.floor((index - 1) / 26); }
    return name;
}

function worksheetXml(rows, widths = [], selected = false) {
    const body = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
        const ref = `${columnName(columnIndex + 1)}${rowIndex + 1}`;
        const style = rowIndex === 0 ? ' s="1"' : value instanceof Date ? ' s="2"' : '';
        if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${style}><v>${value}</v></c>`;
        if (typeof value === 'boolean') return `<c r="${ref}" t="b"${style}><v>${value ? 1 : 0}</v></c>`;
        if (value instanceof Date && Number.isFinite(value.getTime())) {
            const serial = value.getTime() / 86400000 + 25569;
            return `<c r="${ref}"${style}><v>${serial}</v></c>`;
        }
        return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(cellText(value))}</t></is></c>`;
    }).join('')}</row>`).join('');
    const cols = widths.length ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>` : '';
    const tabSelected = selected ? ' tabSelected="1"' : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0"${tabSelected} workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${body}</sheetData><autoFilter ref="A1:${columnName(rows[0]?.length || 1)}${rows.length}"/></worksheet>`;
}

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function zip(files) {
    const local = [];
    const central = [];
    let offset = 0;
    const stamp = new Date();
    const time = (stamp.getHours() << 11) | (stamp.getMinutes() << 5) | Math.floor(stamp.getSeconds() / 2);
    const date = ((Math.max(1980, stamp.getFullYear()) - 1980) << 9) | ((stamp.getMonth() + 1) << 5) | stamp.getDate();
    for (const [name, source] of Object.entries(files)) {
        const filename = Buffer.from(name, 'utf8');
        const raw = Buffer.from(source, 'utf8');
        const compressed = deflateRawSync(raw);
        const crc = crc32(raw);
        const header = Buffer.alloc(30);
        header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6);
        header.writeUInt16LE(8, 8); header.writeUInt16LE(time, 10); header.writeUInt16LE(date, 12);
        header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(raw.length, 22);
        header.writeUInt16LE(filename.length, 26);
        local.push(header, filename, compressed);
        const directory = Buffer.alloc(46);
        directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6);
        directory.writeUInt16LE(0x0800, 8); directory.writeUInt16LE(8, 10); directory.writeUInt16LE(time, 12); directory.writeUInt16LE(date, 14);
        directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(compressed.length, 20); directory.writeUInt32LE(raw.length, 24);
        directory.writeUInt16LE(filename.length, 28); directory.writeUInt32LE(0, 38); directory.writeUInt32LE(offset, 42);
        central.push(directory, filename);
        offset += header.length + filename.length + compressed.length;
    }
    const centralBuffer = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files ? Object.keys(files).length : 0, 8); end.writeUInt16LE(files ? Object.keys(files).length : 0, 10);
    end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...local, centralBuffer, end]);
}

function xlsxFor(rows, overview, metadata) {
    const report = [columns.map(([, label]) => label), ...rows.map((row) => columns.map(([key]) => row[key]))];
    const overviewRows = [
        ['Activity report overview', 'Value'],
        ['Report type', metadata.reportLabel], ['From (inclusive)', metadata.from || 'All dates'], ['To (inclusive)', metadata.to || 'All dates'],
        ['Generated at (UTC)', metadata.generatedAt], ['Events in selected report', metadata.total], ['', ''],
        ['Activity category', 'Events in selected dates'],
        ...Object.entries(overview.counts || {}).map(([category, count]) => [category, count])
    ];
    const files = {
        '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
        '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="Activity report" sheetId="1" r:id="rId1"/><sheet name="Overview" sheetId="2" r:id="rId2"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
        'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm:ss"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF243247"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>',
        'xl/worksheets/sheet1.xml': worksheetXml(report, [26, ...columns.map(() => 24)], true),
        'xl/worksheets/sheet2.xml': worksheetXml(overviewRows, [34, 28])
    };
    return zip(files);
}

function pdfEscape(value) {
    return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1');
}

function wrap(value, max = 88) {
    const words = pdfEscape(value).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
        if (!word) continue;
        if (line && `${line} ${word}`.length > max) { lines.push(line); line = word; }
        else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
}

function pdfFor(rows, overview, metadata) {
    const pages = [];
    let commands = [];
    let y = 752;
    const startPage = () => { commands = []; y = 752; };
    const finishPage = () => pages.push(commands.join('\n'));
    const line = (text, size = 9, bold = false, indent = 40) => {
        if (y < 55) { finishPage(); startPage(); textLine('Activity report (continued)', 15, true); y -= 12; }
        commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${indent} ${y} Tm (${pdfEscape(text)}) Tj ET`);
        y -= size + 5;
    };
    const textLine = (text, size = 9, bold = false, indent = 40) => {
        commands.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${indent} ${y} Tm (${pdfEscape(text)}) Tj ET`);
        y -= size + 5;
    };
    startPage();
    line('System Activity Report', 20, true);
    line(`${metadata.reportLabel} | ${metadata.from || 'All dates'} to ${metadata.to || 'All dates'}`, 10);
    line(`Generated ${metadata.generatedAt} UTC | ${metadata.total} events`, 9);
    y -= 8;
    line('Overview by activity category', 12, true);
    for (const [category, count] of Object.entries(overview.counts || {})) line(`${category}: ${count}`, 9);
    y -= 8;
    line('Activity details', 12, true);
    rows.forEach((row, index) => {
        const details = typeof row.details === 'string' ? row.details : row.details ? JSON.stringify(row.details) : '';
        const heading = `${index + 1}. ${cellText(row.created_at)} UTC | ${row.severity || ''} | ${row.outcome || ''}`;
        line(heading, 9, true);
        for (const text of [`Action: ${row.action || row.event_type || ''}`, `Actor: ${row.actor || row.actor_type || 'Unknown'} | Target: ${row.target_label || row.target_type || '—'}`, `Type: ${row.category || ''} | Source: ${row.source || ''}${row.status_code ? ` | HTTP ${row.status_code}` : ''}`, ...(details ? [`Details: ${details}`] : [])]) {
            for (const wrapped of wrap(text)) line(wrapped, 8, false, 52);
        }
        y -= 5;
    });
    finishPage();
    const objects = [];
    const add = (body) => { objects.push(body); return objects.length; };
    const catalogId = add('');
    const pagesId = add('');
    const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const pageIds = [];
    for (const page of pages) {
        const stream = Buffer.from(page, 'latin1');
        const streamId = add(`<< /Length ${stream.length} >>\nstream\n${stream.toString('latin1')}\nendstream`);
        const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${streamId} 0 R >>`);
        pageIds.push(pageId);
    }
    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let output = '%PDF-1.4\n%âãÏÓ\n';
    const offsets = [0];
    objects.forEach((body, index) => { offsets.push(Buffer.byteLength(output, 'latin1')); output += `${index + 1} 0 obj\n${body}\nendobj\n`; });
    const xrefOffset = Buffer.byteLength(output, 'latin1');
    output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets.slice(1)) output += `${String(offset).padStart(10, '0')} 00000 n \n`;
    output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(output, 'latin1');
}

module.exports = { csvFor, xlsxFor, pdfFor };
