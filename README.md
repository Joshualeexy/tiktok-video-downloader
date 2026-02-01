# TikTok Scraper & Downloader

Automated tool for scraping TikTok profiles and downloading Videos. Combines Playwright browser automation, the tikwm.com unofficial API for watermark-free downloads, and FFmpeg for converting photo slideshows into videos with synchronized audio.

## Features

- 🎥 **Watermark-Free HD Videos** - Clean downloads without TikTok branding
- 📸 **Slideshow Conversion** - Transforms photo carousels into MP4 videos with audio sync
- 🔍 **Smart Scraping** - Automated scrolling that detects when no more content loads
- ⚡ **Batch Processing** - Downloads entire profiles with progress tracking
- 🔄 **Auto Retry** - Handles network failures with exponential backoff
- ⏭️ **Skip Duplicates** - Won't re-download existing content
- 📦 **Zip Export** - Optional automatic compression of all downloads

## tikwm.com API

This tool uses **tikwm.com**, an unofficial third-party API that provides direct access to TikTok media without watermarks. It's not affiliated with TikTok's official API.

**What tikwm.com provides:**
- HD video streams (watermark-free)
- Photo slideshow images with audio tracks  
- Video metadata (titles, captions)
- Works without authentication for public profiles

## Requirements

- **Node.js** 14+ (v16+ recommended)
- **FFmpeg** 4.0+ with libx264 and AAC codecs
- **npm packages**: axios, playwright, sanitize-filename, archiver

### Installation

```bash
# Install Node.js dependencies
npm install axios playwright sanitize-filename archiver

# Install FFmpeg
choco install ffmpeg          # Windows
brew install ffmpeg           # macOS
sudo apt install ffmpeg       # Linux

# Verify FFmpeg installation
ffmpeg -version
```

## Usage

### Scrape + Download
```bash
node download.js <username> [count] [--zip]
```

**Examples:**
```bash
# Download 50 most recent posts
node download.js username 50

# Download 200 posts and create zip file
node download.js username 200 --zip

# Download with default count (50)
node download.js username
```

### Download Only Mode
```bash
node download.js --download-only [--zip]
```

Processes an existing `videos.json` file without scraping.

**Examples:**
```bash
# Download from videos.json
node download.js --download-only

# Download and create zip
node download.js --download-only --zip
```

## How It Works

### Profile Scraping
1. Opens profile in Chromium browser (Playwright)
2. Scrolls page to load content dynamically
3. Stops when target count reached or no new posts appear
4. Extracts and deduplicates all `/video/` and `/photo/` URLs
5. Saves to `videos.json` for persistence

### Video Downloads
1. Fetches metadata from tikwm.com API
2. Streams HD video directly to disk
3. Saves as `Caption_Text_12345678.mp4` (last 8 digits = video ID)

### Slideshow Conversion
Photo posts are converted to videos using this pipeline:

1. **Download Assets** - All images + audio track from API
2. **Analyze Audio** - FFprobe extracts duration (e.g., 15.3 seconds)
3. **Calculate Timing** - `duration_per_image = audio_duration ÷ image_count`
4. **Generate Manifest** - Creates FFmpeg concat file with timings
5. **Encode Video** - Combines images + audio into MP4
6. **Cleanup** - Removes temporary files

**FFmpeg Command:**
```bash
ffmpeg -f concat -i concat.txt -i audio.mp3 \
       -c:v libx264 -tune stillimage \
       -c:a aac -b:a 192k \
       -pix_fmt yuv420p -shortest \
       -y output.mp4
```

### Zip Creation
When using `--zip` flag:
- Creates compressed archive of all downloaded content
- Named as `username.zip` or `tiktok_downloads_timestamp.zip`
- Saved in Downloads folder alongside content
- Uses compression level 6 (balance of speed/size)

## Configuration

Optional settings in script:
```javascript
const ApiUrl = "https://www.tikwm.com/api/";
const downloadsRoot = path.join(os.homedir(), 'Downloads');
const MAX_RETRIES = 2;              // Retry failed downloads
const RETRY_DELAY = 1000;           // Wait 1s, then 2s, then 3s...
const MAX_STAGNANT_SCROLLS = 5;     // Stop after 5 scrolls with no new content
const USE_AUTHENTICATION = false;   // Set true for private profiles
```

## Output Structure

```
~/Downloads/
  ├── @username/
  │   ├── Funny_Video_12345678.mp4
  │   ├── Beach_Sunset_87654321.mp4  (converted slideshow)
  │   └── Dance_Challenge_11223344.mp4
  └── username.zip  (if --zip flag used)
```

## Troubleshooting

**FFmpeg not found**
- Ensure FFmpeg is installed and in your system PATH
- Test: `ffmpeg -version`

**API returns no data**
- tikwm.com may be rate-limited or down
- Wait 10-15 minutes and retry
- Verify the profile/video is still public

**Scraper stops too early**
- Profile might be private → Set `USE_AUTHENTICATION = true`
- Increase stagnation threshold in script: `MAX_STAGNANT_SCROLLS = 10`

**Slideshow has no audio**
- This is normal - not all slideshows have music
- Script creates a silent 15-second video by default

**Empty file downloads (0 bytes)**
- Network issue during download
- Will auto-retry up to MAX_RETRIES times
- Check `download-failures.log` for details

**Zip file creation fails**
- Ensure you have write permissions in Downloads folder
- Check available disk space
- Verify archiver package is installed: `npm install archiver`

## Authentication (Optional)

For private profiles or to avoid rate limits:

1. Set `USE_AUTHENTICATION = true` in script
2. Browser opens on first run for manual login
3. Session saved to `cookies.json`
4. Future runs use saved cookies automatically

## Example Output

```
🔍 Starting scraper for @username...
🔄 Scrolling page to load more videos and photos...
✅ Found 127 video/photo URLs
✅ Saved 127 URLs to videos.json

📥 Starting batch download...
📁 Download location: /Users/you/Downloads

📸 [1/127] Downloading 8 images from slideshow...
🎵 Downloaded audio (15.3s)
🎬 Creating slideshow video...
✅ [1/127] Created slideshow video: Beach_Sunset_87654321.mp4 (12.45 MB)

✅ [2/127] Downloaded: Dance_Video_12345678.mp4 (8.23 MB)
⏭️  [3/127] Already exists: 11223344

📦 Creating zip file of all downloads...
✅ Zip file created: username.zip (245.67 MB)

🎉 Download complete!
📊 Stats: 125 downloaded, 2 skipped, 0 failed
📦 Zip file: 245.67 MB
```

## Key Functions

| Function | Purpose |
|----------|---------|
| `scrapeTikTokProfile()` | Playwright automation with intelligent scrolling |
| `downloadTikTokVideo()` | Streams HD video from tikwm.com |
| `downloadTikTokPhotos()` | Downloads slideshow images + audio |
| `createSlideshowVideo()` | FFmpeg encoding pipeline |
| `createZipFile()` | Compresses downloads into archive |
| `isAlreadyDownloaded()` | Checks if file exists by video ID |

## Technical Notes

- Downloads process sequentially to avoid API throttling
- Temporary slideshow files stored in OS temp directory (`/tmp/tiktok_*`)
- Failed downloads logged to `download-failures.log` with timestamps
- Filenames limited to 200 characters (auto-truncated)
- Duplicate detection uses last 8 digits of video ID in filename
- Zip compression uses level 6 (balanced speed/size ratio)

---

**For educational and personal archival use. Respect content creators' rights.**