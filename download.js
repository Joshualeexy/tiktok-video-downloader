const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const sanitize = require('sanitize-filename');
const { chromium } = require('playwright');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// ==================== CONFIGURATION ====================
const ApiUrl = "https://www.tikwm.com/api/";
const failLogPath = path.join(__dirname, 'download-failures.log');
const downloadsRoot = path.join(os.homedir(), 'Downloads');
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const USE_AUTHENTICATION = false; // Set to true to enable cookie-based auth

// ==================== SCRAPER FUNCTIONS ====================

async function scrapeTikTokProfile(username, targetCount) {
  console.log(`\n🔍 Starting scraper for @${username}...`);
  
  const storagePath = path.resolve(__dirname, 'cookies.json');
  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });

  // Load cookies if authentication is enabled
  if (USE_AUTHENTICATION && fs.existsSync(storagePath)) {
    const raw = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    const rawCookies = Array.isArray(raw) ? raw : raw.cookies;
    
    if (Array.isArray(rawCookies)) {
      const cookies = rawCookies.map(({ name, value, domain, path, secure, httpOnly, expirationDate, expires }) => ({
        name,
        value,
        domain,
        path: path || '/',
        secure: !!secure,
        httpOnly: !!httpOnly,
        expires: expires || (expirationDate ? Math.floor(expirationDate) : -1)
      }));

      await context.addCookies(cookies);
      console.log('🔐 Loaded saved session from cookies.json');
    }
  }

  const page = await context.newPage();

  // Handle login if authentication is required and no cookies exist
  if (USE_AUTHENTICATION && !fs.existsSync(storagePath)) {
    await page.goto('https://www.tiktok.com/login', {
      waitUntil: 'networkidle',
      referer: 'https://www.tiktok.com/'
    });

    console.log('🧑‍💻 Please log in manually... Waiting for /foryou redirect.');
    await page.waitForURL('**/foryou', { timeout: 0 });

    const cookies = await context.cookies();
    fs.writeFileSync(storagePath, JSON.stringify({ cookies }, null, 2));
    console.log('✅ Session saved to cookies.json');
  }

  // Navigate to profile
  await page.goto(`https://www.tiktok.com/@${username}`, {
    waitUntil: 'domcontentloaded',
    referer: 'https://www.tiktok.com/'
  });

  await page.waitForSelector('a[href*="/video/"], a[href*="/photo/"]', { timeout: 0 });

  let lastCount = 0;
  let stagnantScrolls = 0;
  const MAX_STAGNANT_SCROLLS = 5; // Allow 5 scrolls with no new content before giving up
  
  console.log('🔄 Scrolling page to load more videos and photos...');

  for (let i = 0; i < 100; i++) {
    // Scroll to bottom
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for network to be idle (better than fixed timeout)
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (err) {
      // If network doesn't idle in 5s, continue anyway
      await page.waitForTimeout(2000);
    }

    const currentCount = await page.$eval('a[href*="/video/"], a[href*="/photo/"]', els => els.length);
    // console.log(`🔍 Scroll ${i + 1}: ${currentCount} posts found (target: ${targetCount})`);

    // Check if we've reached the target
    if (currentCount >= targetCount) {
      console.log('✅ Target reached!');
      break;
    }

    // Check if content is loading
    if (currentCount === lastCount) {
      stagnantScrolls++;
      console.log(`⏳ No new content (${stagnantScrolls}/${MAX_STAGNANT_SCROLLS} attempts)`);
      
      if (stagnantScrolls >= MAX_STAGNANT_SCROLLS) {
        console.log('⛔ No more posts loading after multiple attempts — stopping scroll');
        break;
      }
      
      // Wait longer when stagnant (network might be slow)
      await page.waitForTimeout(3000);
    } else {
      // Reset stagnant counter when new content loads
      stagnantScrolls = 0;
      lastCount = currentCount;
    }
  }

  const videoLinks = await page.$$eval('a[href*="/video/"], a[href*="/photo/"]', links =>
    Array.from(new Set(links.map(link => link.href)))
  );

  await browser.close();

  console.log(`✅ Found ${videoLinks.length} video/photo URLs`);
  return videoLinks.reverse();
}

// ==================== DOWNLOADER FUNCTIONS ====================

function extractUsername(tiktokUrl) {
  const match = tiktokUrl.match(/tiktok\.com\/@([^/]+)\//);
  return match ? `@${match[1]}` : 'unknown';
}

function extractVideoId(tiktokUrl) {
  const match = tiktokUrl.match(/\/(video|photo)\/(\d+)/);
  return match ? match[2] : Date.now().toString();
}

function isPhotoPost(tiktokUrl) {
  return tiktokUrl.includes('/photo/');
}

function cleanText(text) {
  return text
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function logFailure(url, errorMsg) {
  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] ❌ ${url} - ${errorMsg}\n`;
  fs.appendFileSync(failLogPath, log);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isAlreadyDownloaded(outputDir, videoId) {
  if (!fs.existsSync(outputDir)) return false;
  
  const existingFiles = fs.readdirSync(outputDir);
  const shortId = videoId.slice(-8);
  return existingFiles.some(file => {
    const match = file.match(/_([^_.]+)\.mp4$/);
    return match && match[1] === shortId;
  });
}

async function downloadFile(url, filepath) {
  const writer = fs.createWriteStream(filepath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: 60000,
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
  });

  await new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
    response.data.on('error', reject);
  });
}

async function getAudioDuration(audioPath) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    return parseFloat(stdout.trim());
  } catch (err) {
    return 15;
  }
}

async function createSlideshowVideo(imageFiles, audioFile, outputPath, audioDuration) {
  const tempDir = path.dirname(imageFiles[0]);
  const imageCount = imageFiles.length;
  const durationPerImage = audioDuration / imageCount;
  
  const concatFilePath = path.join(tempDir, 'concat.txt');
  const concatContent = imageFiles.map(img => 
    `file '${path.basename(img)}'\nduration ${durationPerImage}`
  ).join('\n') + `\nfile '${path.basename(imageFiles[imageFiles.length - 1])}'`;
  
  fs.writeFileSync(concatFilePath, concatContent);

  const ffmpegCmd = audioFile 
    ? `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -i "${audioFile}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest -y "${outputPath}"`
    : `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c:v libx264 -tune stillimage -pix_fmt yuv420p -y "${outputPath}"`;

  try {
    await execPromise(ffmpegCmd, { cwd: tempDir });
    fs.unlinkSync(concatFilePath);
    imageFiles.forEach(img => fs.unlinkSync(img));
    if (audioFile && fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
    return true;
  } catch (err) {
    throw new Error(`FFmpeg failed: ${err.message}`);
  }
}

async function downloadTikTokPhotos(tiktokUrl, index, total, retryCount = 0) {
  const tempDir = path.join(os.tmpdir(), `tiktok_${Date.now()}`);
  
  try {
    const username = extractUsername(tiktokUrl);
    const outputDir = path.join(downloadsRoot, username);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const photoId = extractVideoId(tiktokUrl);
    
    if (isAlreadyDownloaded(outputDir, photoId)) {
      console.log(`⏭️  [${index + 1}/${total}] Already exists: ${photoId} (slideshow)`);
      return { success: true, skipped: true };
    }

    const response = await axios.get(ApiUrl, {
      params: { url: tiktokUrl, hd: 1 },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 15000,
    });

    const data = response.data.data;
    if (!data || !data.images || data.images.length === 0) {
      throw new Error('No photo data returned');
    }

    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    console.log(`📸 [${index + 1}/${total}] Downloading ${data.images.length} images from slideshow...`);
    
    const imageFiles = [];
    for (let i = 0; i < data.images.length; i++) {
      const imageUrl = data.images[i];
      const imagePath = path.join(tempDir, `img_${String(i + 1).padStart(3, '0')}.jpg`);
      
      await downloadFile(imageUrl, imagePath);
      
      const stats = fs.statSync(imagePath);
      if (stats.size === 0) {
        throw new Error(`Image ${i + 1} is empty`);
      }
      imageFiles.push(imagePath);
    }

    let audioFile = null;
    let audioDuration = 15;
    
    if (data.music) {
      try {
        audioFile = path.join(tempDir, 'audio.mp3');
        await downloadFile(data.music, audioFile);
        audioDuration = await getAudioDuration(audioFile);
        console.log(`🎵 Downloaded audio (${audioDuration.toFixed(1)}s)`);
      } catch (audioErr) {
        console.log(`⚠️  Could not download audio: ${audioErr.message}`);
        audioFile = null;
      }
    }

    const caption = cleanText(data?.title || 'slideshow');
    const shortId = photoId.slice(-8);
    const extension = '.mp4';
    const maxCaptionLength = 200 - shortId.length - extension.length - 1;
    const truncatedCaption = caption.slice(0, maxCaptionLength);
    const safeCaption = sanitize(truncatedCaption) || 'slideshow';
    const filename = `${safeCaption}_${shortId}${extension}`;
    const outputPath = path.join(outputDir, filename);

    console.log(`🎬 Creating slideshow video...`);
    await createSlideshowVideo(imageFiles, audioFile, outputPath, audioDuration);

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const stats = fs.statSync(outputPath);
    console.log(`✅ [${index + 1}/${total}] Created slideshow video: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return { success: true, skipped: false };

  } catch (err) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️  [${index + 1}/${total}] Retry ${retryCount + 1}/${MAX_RETRIES} for ${tiktokUrl}`);
      await sleep(RETRY_DELAY * (retryCount + 1));
      return downloadTikTokPhotos(tiktokUrl, index, total, retryCount + 1);
    }

    logFailure(tiktokUrl, err.message);
    console.error(`❌ [${index + 1}/${total}] Failed after ${MAX_RETRIES} retries: ${tiktokUrl} - ${err.message}`);
    return { success: false, skipped: false };
  }
}

async function downloadTikTokVideo(tiktokUrl, index, total, retryCount = 0) {
  try {
    const username = extractUsername(tiktokUrl);
    const outputDir = path.join(downloadsRoot, username);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const videoId = extractVideoId(tiktokUrl);
    
    if (isAlreadyDownloaded(outputDir, videoId)) {
      console.log(`⏭️  [${index + 1}/${total}] Already exists: ${videoId}`);
      return { success: true, skipped: true };
    }

    const response = await axios.get(ApiUrl, {
      params: { url: tiktokUrl, hd: 1 },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 15000,
    });

    const data = response.data.data;
    if (!data) throw new Error('No video data returned');

    const caption = cleanText(data?.title || 'video');
    const shortId = videoId.slice(-8);
    const extension = '.mp4';
    const maxCaptionLength = 200 - shortId.length - extension.length - 1;
    const truncatedCaption = caption.slice(0, maxCaptionLength);
    const safeCaption = sanitize(truncatedCaption) || 'video';
    const filename = `${safeCaption}_${shortId}${extension}`;
    const fullPath = path.join(outputDir, filename);

    const videoUrl = data.hdplay || data.play;
    if (!videoUrl) throw new Error('No video URL available');

    const writer = fs.createWriteStream(fullPath);
    const videoStream = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream',
      timeout: 60000,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });

    await new Promise((resolve, reject) => {
      videoStream.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
      videoStream.data.on('error', reject);
    });

    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      fs.unlinkSync(fullPath);
      throw new Error('Downloaded file is empty');
    }

    console.log(`✅ [${index + 1}/${total}] Downloaded: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return { success: true, skipped: false };

  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      console.log(`⚠️  [${index + 1}/${total}] Retry ${retryCount + 1}/${MAX_RETRIES} for ${tiktokUrl}`);
      await sleep(RETRY_DELAY * (retryCount + 1));
      return downloadTikTokVideo(tiktokUrl, index, total, retryCount + 1);
    }

    logFailure(tiktokUrl, err.message);
    console.error(`❌ [${index + 1}/${total}] Failed after ${MAX_RETRIES} retries: ${tiktokUrl} - ${err.message}`);
    return { success: false, skipped: false };
  }
}

async function downloadTikTokContent(tiktokUrl, index, total) {
  if (isPhotoPost(tiktokUrl)) {
    return downloadTikTokPhotos(tiktokUrl, index, total);
  } else {
    return downloadTikTokVideo(tiktokUrl, index, total);
  }
}

async function checkFFmpeg() {
  try {
    await execPromise('ffmpeg -version');
    return true;
  } catch (err) {
    console.error('❌ FFmpeg is not installed or not in PATH.');
    console.error('   Please install FFmpeg:');
    console.error('   - Windows: choco install ffmpeg  OR  download from https://ffmpeg.org');
    console.error('   - Mac: brew install ffmpeg');
    console.error('   - Linux: sudo apt install ffmpeg');
    return false;
  }
}

async function downloadAllContent(links) {
  console.log('\n📥 Starting batch download...');
  console.log(`📁 Download location: ${downloadsRoot}`);
  
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    process.exit(1);
  }
  
  if (fs.existsSync(failLogPath)) fs.unlinkSync(failLogPath);

  let stats = {
    downloaded: 0,
    skipped: 0,
    failed: 0
  };

  for (let i = 0; i < links.length; i++) {
    const result = await downloadTikTokContent(links[i], i, links.length);
    
    if (result.success && result.skipped) {
      stats.skipped++;
    } else if (result.success) {
      stats.downloaded++;
    } else {
      stats.failed++;
    }
  }

  console.log('\n🎉 Download complete!');
  console.log(`📊 Stats: ${stats.downloaded} downloaded, ${stats.skipped} skipped, ${stats.failed} failed`);
  
  if (stats.failed > 0) {
    console.log(`📝 Check ${failLogPath} for failed downloads`);
  }
}

// ==================== MAIN ====================

(async () => {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 Usage:');
    console.log('  node script.js <username> [count]     - Scrape profile and download');
    console.log('  node script.js --download-only        - Download from existing videos.json');
    console.log('\nExamples:');
    console.log('  node script.js johndoe 150');
    console.log('  node script.js --download-only');
    process.exit(0);
  }

  if (args[0] === '--download-only') {
    // Download mode only
    if (!fs.existsSync('videos.json')) {
      console.error('❌ videos.json not found. Please scrape first.');
      process.exit(1);
    }

    const links = JSON.parse(fs.readFileSync('videos.json', 'utf-8'));
    console.log(`📦 Found ${links.length} video links in videos.json`);
    await downloadAllContent(links);
  } else {
    // Scrape and download mode
    const username = args[0];
    const targetCount = parseInt(args[1]) || 50;

    if (!username) {
      console.error('❌ Please provide a TikTok username.');
      process.exit(1);
    }

    // Step 1: Scrape
    const links = await scrapeTikTokProfile(username, targetCount);
    
    // Save to videos.json
    const outputFile = 'videos.json';
    fs.writeFileSync(outputFile, JSON.stringify(links, null, 2));
    console.log(`✅ Saved ${links.length} URLs to ${outputFile}`);

    // Step 2: Download
    await downloadAllContent(links);
  }
})();