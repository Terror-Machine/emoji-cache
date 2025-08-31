const fs = require("fs");
const path = require("path");

const emojiImageByBrandPromise = (async () => {
  const emojiJFilesDir = path.join(__dirname, "./emoji/");
  let emojiImageByBrand = { apple: {} };
  const emojiJsonByBrand = { apple: 'emoji-apple-image.json' };
  for (const brand in emojiJsonByBrand) {
    const emojiJsonFile = path.resolve(__dirname, emojiJFilesDir + emojiJsonByBrand[brand]);
    try {
      if (fs.existsSync(emojiJsonFile)) {
        const fileContent = await fs.promises.readFile(emojiJsonFile);
        emojiImageByBrand[brand] = JSON.parse(fileContent);
      }
    } catch (error) {
      console.log(`Tidak dapat memuat file cache emoji: ${emojiJsonFile}`, error);
    }
  }
  return emojiImageByBrand;
})();

module.exports = emojiImageByBrandPromise;