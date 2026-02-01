# TikTok Scraper & Downloader with FFmpeg Slideshow Converter

A Node.js automation tool that scrapes TikTok profiles and downloads videos + photo slideshows. Uses Playwright for scraping, tikwm.com API for downloads, and FFmpeg for converting slideshows to videos.

## ✨ Features

- 🎥 **HD Watermark-Free Videos** - Downloads via tikwm.com unofficial API
- 📸 **Slideshow to Video** - Converts photo posts to MP4 with synced audio
- 🔍 **Profile Scraping** - Automated browser scrolling with Playwright
- 🔄 **Smart Retry Logic** - Automatic retries with duplicate detection
- 📊 **Progress Tracking** - Real-time stats (downloaded/skipped/failed)

## 🔌 tikwm.com API

This tool uses the **unofficial tikwm.com API** (not TikTok's official API) which provides:
- Watermark-free video streams (HD quality)
- Photo slideshow images + audio tracks
- No authentication needed for public content

**API Call Example:**
```javascript
const response = await axios.get("https://www.tikwm.com/api/", {
  params: { url: tiktokUrl, hd: 1 }
});
```

## 📋 Requirements

**Install these first:**
- Node.js v14+ (v16+ recommended)
- FFmpeg 4.0+ (for slideshow conversion)

```bash
# Install Node packages
npm install axios playwright sanitize-filename dotenv

# Install FFmpeg
# Windows: choco install ffmpeg
# macOS:   brew install ffmpeg
# Linux:   sudo apt install ffmpeg

# Verify FFmpeg
ffmpeg -version
```

## 🚀 Usage

**Mode 1: Scrape + Download**
```bash
node tiktok-scraper-downloader-enhanced.js <username> [count]

# Examples
node tiktok-scraper-downloader-enhanced.js johndoe 50
node tiktok-scraper-downloader-enhanced.js janedoe 200
```

**Mode 2: Download Only (from existing videos.json)**
```bash
node tiktok-scraper-downloader-enhanced.js --download-only
```

## 📂 Output

Downloads organized by username:
```
~/Downloads/
  ├── @johndoe/
  │   ├── Video_Caption_12345678.mp4
  │   └── Slideshow_Caption_87654321.mp4
  └── @janedoe/
      └── ...
```

## 🎬 How Slideshow Conversion Works

1. Detects `/photo/` URLs as slideshows
2. Downloads all images + audio from tikwm.com API
3. Uses FFprobe to get audio duration
4. Calculates timing: `duration_per_image = audio_duration / image_count`
5. Creates FFmpeg concat file with image timings
6. Encodes to MP4 with H.264 video + AAC audio:
```bash
ffmpeg -f concat -i concat.txt -i audio.mp3 \
       -c:v libx264 -tune stillimage \
       -c:a aac -b:a 192k -pix_fmt yuv420p \
       -shortest -y output.mp4
```
7. Cleans up temp files

## ⚙️ Configuration (Optional)

Create `.env` file:
```env
API_URL=https://www.tikwm.com/api/
DOWNLOADS_ROOT=/path/to/downloads
USE_AUTHENTICATION=false
```

**In-code constants:**
```javascript
MAX_RETRIES = 2              // Retry attempts
RETRY_DELAY = 1000           // Delay between retries (ms)
MAX_STAGNANT_SCROLLS = 5     // Stop scrolling after X attempts with no new content
```

## 🐛 Common Issues

**FFmpeg not found**
- Install FFmpeg and add to system PATH
- Verify: `ffmpeg -version`

**API errors / Empty downloads**
- tikwm.com may be rate-limited (wait 10-15 min)
- Increase retries: `MAX_RETRIES = 5`
- Check `download-failures.log`

**Scraper stops early**
- Profile may be private (enable auth: `USE_AUTHENTICATION=true`)
- Increase: `MAX_STAGNANT_SCROLLS = 10`

**Slideshow has no audio**
- Normal - not all slideshows have audio
- Creates silent 15-second video by default

## 📊 Example Output

```
🔍 Starting scraper for @johndoe...
✅ Found 127 video/photo URLs
✅ Saved 127 URLs to videos.json

📥 Starting batch download...
📸 [1/127] Downloading 8 images from slideshow...
🎵 Downloaded audio (15.3s)
🎬 Creating slideshow video...
✅ [1/127] Created slideshow video: Beautiful_Sunset_87654321.mp4 (12.45 MB)
✅ [2/127] Downloaded: Funny_Dance_12345678.mp4 (8.23 MB)
⏭️  [3/127] Already exists: 11223344

🎉 Download complete!
📊 Stats: 125 downloaded, 2 skipped, 0 failed
```

## 🎯 Key Functions

- `scrapeTikTokProfile()` - Playwright scraping with smart scrolling
- `downloadTikTokVideo()` - HD video downloads via tikwm.com
- `downloadTikTokPhotos()` - Slideshow download + FFmpeg conversion
- `createSlideshowVideo()` - FFmpeg encoding pipeline
- `isAlreadyDownloaded()` - Duplicate detection (last 8 digits of video ID)

## 📝 Notes

- Sequential downloads (no parallelism) to avoid API throttling
- Temporary files stored in OS temp directory
- Failures logged to `download-failures.log`
- Filenames sanitized and limited to 200 characters
- Last 8 digits of video ID used for duplicate detection

---

**For educational/archival purposes. Respect content creators' rights.**