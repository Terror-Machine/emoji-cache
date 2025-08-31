const fs = require('fs').promises;
const path = require('path');

async function convertEmojisToJson(folderPath, outputFile) {
    const files = await fs.readdir(folderPath);
    const emojiData = {};
    for (const file of files) {
        if (!file.endsWith('.png')) continue;
        const filePath = path.join(folderPath, file);
        const match = file.match(/^emoji_u([0-9a-fA-F\-_]+)\.png$/);
        if (!match) continue;
        const unicodeKey = match[1].toLowerCase();
        const imageBuffer = await fs.readFile(filePath);
        const base64String = Buffer.from(imageBuffer).toString('base64');
        emojiData[unicodeKey] = base64String;
    }
    await fs.writeFile(outputFile, JSON.stringify(emojiData, null, 2), 'utf8');
    console.log(`✅ Berhasil convert ${Object.keys(emojiData).length} emoji ke ${outputFile}`);
}

const folderPath = './emojipng';
const outputFile = './emoji.json';
convertEmojisToJson(folderPath, outputFile);
