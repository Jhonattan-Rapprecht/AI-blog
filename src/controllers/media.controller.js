const fs = require('fs/promises');
const path = require('path');
const MediaModel = require('../models/media.model');
const ArticleModel = require('../models/article.model');

const MEDIA_DIR = path.resolve(__dirname, '../../uploads/media');
const MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const VIDEO_MIME = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };

function dimensions(buffer, mime) {
    try {
        if (mime === 'image/png' && buffer.length > 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
        if (mime === 'image/gif' && buffer.length > 10) return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
        if (mime === 'image/webp' && buffer.toString('ascii', 12, 16) === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
        if (mime === 'image/jpeg') {
            let offset = 2;
            while (offset < buffer.length) {
                if (buffer[offset] !== 0xff) break;
                const marker = buffer[offset + 1]; const length = buffer.readUInt16BE(offset + 2);
                if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
                offset += 2 + length;
            }
        }
    } catch { /* Dimensions are optional metadata. */ }
    return { width: null, height: null };
}

function isValidImage(buffer, mime) {
    if (!Buffer.isBuffer(buffer) || !MIME[mime]) return false;
    if (mime === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9;
    if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    if (mime === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6));
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
}

function isValidVideo(buffer, mime) {
    if (!Buffer.isBuffer(buffer) || !VIDEO_MIME[mime]) return false;
    if (mime === 'video/webm') return buffer.length > 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (buffer.length < 16 || buffer.toString('ascii', 4, 8) !== 'ftyp') return false;

    // A valid ISO-BMFF/QuickTime header alone is not playable. Require an
    // actual media-data box containing bytes, so empty placeholder MP4/MOV
    // files are rejected instead of appearing as broken players in the UI.
    let offset = 0;
    let hasFileType = false;
    let hasMediaData = false;
    while (offset + 8 <= buffer.length) {
        let boxSize = buffer.readUInt32BE(offset);
        const boxType = buffer.toString('ascii', offset + 4, offset + 8);
        let headerSize = 8;
        if (boxSize === 1) {
            if (offset + 16 > buffer.length) return false;
            const extendedSize = buffer.readBigUInt64BE(offset + 8);
            if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) return false;
            boxSize = Number(extendedSize);
            headerSize = 16;
        } else if (boxSize === 0) {
            boxSize = buffer.length - offset;
        }
        if (boxSize < headerSize || offset + boxSize > buffer.length) return false;
        if (boxType === 'ftyp') hasFileType = true;
        if (boxType === 'mdat' && boxSize > headerSize) hasMediaData = true;
        offset += boxSize;
    }
    return hasFileType && hasMediaData && offset === buffer.length;
}

function secureExternalUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return null;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password) return null;
        return url;
    } catch { return null; }
}

class MediaController {
    async list(req, res) {
        try { return res.json(await MediaModel.findAll(req.query.type || 'image')); }
        catch (error) { console.error('[Media] List failed:', error.message); return res.status(500).json({ error: 'Could not load media library.' }); }
    }

    async upload(req, res) {
        const buffer = req.body;
        const mime = req.headers['content-type']?.split(';')[0];
        const imageUpload = isValidImage(buffer, mime);
        const videoUpload = isValidVideo(buffer, mime);
        if (!imageUpload && !videoUpload) return res.status(400).json({ error: 'Upload a valid JPG, PNG, WebP, GIF, MP4, WebM, or MOV file.' });
        if (imageUpload && buffer.length > 12 * 1024 * 1024) return res.status(413).json({ error: 'Images must be 12 MB or smaller.' });
        try {
            await fs.mkdir(MEDIA_DIR, { recursive: true });
            const ext = imageUpload ? MIME[mime] : VIDEO_MIME[mime];
            const diskName = `${require('crypto').randomUUID()}${ext}`;
            const fallbackName = `${imageUpload ? 'image' : 'video'}${ext}`;
            const original = String(req.query.filename || fallbackName).replace(/[\\/\0-\x1f]/g, '').slice(0, 255) || fallbackName;
            await fs.writeFile(path.join(MEDIA_DIR, diskName), buffer, { flag: 'wx' });
            let media;
            try { media = await MediaModel.create({ filename: original, filepath: `/uploads/media/${diskName}`, mime_type: mime, file_size: buffer.length, media_type: imageUpload ? 'image' : 'video', source_type: 'upload', ...(imageUpload ? dimensions(buffer, mime) : {}), provider: 'upload' }); }
            catch (error) { await fs.unlink(path.join(MEDIA_DIR, diskName)).catch(() => {}); throw error; }
            return res.status(201).json(media);
        } catch (error) {
            console.error('[Media] Upload failed:', error.message);
            return res.status(500).json({ error: 'Could not save the uploaded media.' });
        }
    }

    async addVideoLink(req, res) {
        const url = secureExternalUrl(req.body?.url);
        if (!url) return res.status(400).json({ error: 'Enter a valid HTTPS video URL.' });
        const thumbnail = req.body?.thumbnailUrl ? secureExternalUrl(req.body.thumbnailUrl) : null;
        if (req.body?.thumbnailUrl && !thumbnail) return res.status(400).json({ error: 'Thumbnail URL must be a valid HTTPS URL.' });
        const filename = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 255) : '';
        try {
            const media = await MediaModel.create({
                filename: filename || url.hostname,
                filepath: null,
                mime_type: 'video/link',
                file_size: 0,
                media_type: 'video',
                source_type: 'link',
                source_url: url.toString(),
                thumbnail_url: thumbnail?.toString() || null,
                provider: url.hostname,
            });
            return res.status(201).json(media);
        } catch (error) {
            console.error('[Media] Video link save failed:', error.message);
            return res.status(500).json({ error: 'Could not save the video link.' });
        }
    }

    async update(req, res) {
        if (typeof req.body?.credit !== 'string') return res.status(400).json({ error: 'Photo credit/source must be text.' });
        try {
            const media = await MediaModel.updateCredit(req.params.id, req.body.credit);
            if (!media) return res.status(404).json({ error: 'Media item not found.' });
            return res.json(media);
        } catch (error) {
            console.error('[Media] Credit update failed:', error.message);
            return res.status(500).json({ error: 'Could not update photo credit/source.' });
        }
    }

    async remove(req, res) {
        try {
            await ArticleModel.ensureMediaColumn();
            const result = await MediaModel.delete(req.params.id);
            if (!result) return res.status(404).json({ error: 'Media item not found.' });
            if (result.inUse) return res.status(409).json({ error: 'This media item is used in an article. Remove it from the article before deleting.' });
            if (result.filepath) await fs.unlink(path.resolve(MEDIA_DIR, path.basename(result.filepath))).catch((error) => { if (error.code !== 'ENOENT') throw error; });
            return res.status(204).end();
        } catch (error) {
            console.error('[Media] Delete failed:', error.message);
            return res.status(500).json({ error: 'Could not delete media item.' });
        }
    }
}

module.exports = new MediaController();
