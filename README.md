# TikTok Scraper & Downloader with FFmpeg Slideshow Converter

A sophisticated automation tool that combines browser automation, API integration, and video processing to archive TikTok content. This tool scrapes TikTok profiles using Playwright, fetches high-quality media through the tikwm.com unofficial API, and converts photo slideshows into synchronized video files using FFmpeg.

## 🏗️ Architecture Overview

This tool is composed of three integrated systems:

1. **Web Scraper Engine** - Playwright-based browser automation for profile crawling
2. **Media Downloader** - Axios-powered HTTP client interfacing with tikwm.com API
3. **Video Processor** - FFmpeg pipeline for slideshow-to-video conversion with audio synchronization

## ✨ Core Capabilities

- 🎥 **HD Video Downloading** - Fetches videos in highest available quality via tikwm.com API
- ✨ **Watermark-Free Downloads** - All videos downloaded without TikTok watermarks
- 📸 **Slideshow Video Conversion** - Transforms photo carousels into MP4 videos with FFmpeg
- 🔍 **Intelligent Profile Scraping** - Browser automation with stagnation detection and smart scrolling
- 🔄 **Resilient Retry Logic** - Exponential backoff and automatic retry on failures
- ⏭️ **Duplicate Detection** - Filesystem-based deduplication using video ID matching
- 🎵 **Audio Synchronization** - FFprobe duration analysis for perfect image-to-audio timing
- 📊 **Real-time Progress Tracking** - Live stats with download/skip/fail counters
- 🔐 **Session Persistence** - Cookie-based authentication for private/restricted profiles
- 📝 **Comprehensive Logging** - Timestamped failure logs for debugging and analysis

## 🎬 FFmpeg Slideshow Features

The script automatically detects photo posts (slideshows) and:
1. Downloads all images in the slideshow
2. Downloads the audio track (if available)
3. Calculates proper timing to sync images with audio duration
4. Uses FFmpeg to create a smooth video with transitions
5. Cleans up temporary files automatically

## 🔌 API Integration: tikwm.com

**Important:** This tool uses the **unofficial tikwm.com API** for downloading TikTok media, NOT TikTok's official API.

### Why tikwm.com?

The tikwm.com API is a third-party service that provides:
- **Watermark-free video downloads** - Removes TikTok branding and overlays
- Direct access to HD video streams (`hdplay` and `play` endpoints)
- Photo slideshow image arrays with music tracks
- Metadata extraction (titles, usernames, IDs)
- No authentication required for public content
- Bypass of TikTok's download restrictions

### API Endpoint Structure

```javascript
const response = await axios.get("https://www.tikwm.com/api/", {
  params: { 
    url: tiktokUrl,  // Full TikTok URL
    hd: 1            // Request HD quality
  }
});
```

### Response Structure

**For Videos:**
```json
{
  "data": {
    "title": "Video caption text",
    "play": "https://...",      // Standard quality URL
    "hdplay": "https://...",    // HD quality URL (preferred)
    "music": "https://..."      // Audio track URL
  }
}
```

**For Photo Slideshows:**
```json
{
  "data": {
    "title": "Slideshow caption",
    "images": [
      "https://image1.jpg",
      "https://image2.jpg",
      "https://image3.jpg"
    ],
    "music": "https://audio.mp3"
  }
}
```

### API Considerations

- ⚠️ **Unofficial Service**: tikwm.com is not affiliated with TikTok/ByteDance
- 🌐 **Rate Limits**: The API may impose undocumented rate limits
- 🔒 **SSL Verification**: Script uses `rejectUnauthorized: false` for HTTPS
- 🔄 **Availability**: Service uptime is not guaranteed
- 📜 **Terms of Service**: Using this API may violate TikTok's ToS

You can configure the API URL via environment variables if tikwm.com becomes unavailable:

```env
API_URL=https://alternative-api.com/endpoint/
```

## 📋 System Requirements

### Core Dependencies

**Runtime Environment:**
- **Node.js** v14.0.0+ (v16+ recommended for optimal performance)
- **FFmpeg** 4.0+ with libx264 and aac codec support
- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 20.04+)

**Required Node.js Packages:**
```bash
npm install axios playwright sanitize-filename dotenv
```

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.x | HTTP client for API requests and file streaming |
| `playwright` | ^1.x | Chromium automation for profile scraping |
| `sanitize-filename` | ^1.x | Filesystem-safe filename generation |
| `dotenv` | ^16.x | Environment variable management |

### FFmpeg - The Video Processing Engine

FFmpeg is the cornerstone of the slideshow conversion pipeline. This tool requires a full FFmpeg installation with:

### FFmpeg - The Video Processing Engine

FFmpeg is the cornerstone of the slideshow conversion pipeline. This tool requires a full FFmpeg installation with:

**Required Codecs:**
- `libx264` - H.264 video encoding (for MP4 output)
- `aac` - AAC audio encoding (for audio streams)

**Required Tools:**
- `ffmpeg` - Main video processing binary
- `ffprobe` - Audio duration analysis and metadata extraction

#### Installation by Platform

**Windows:**
```powershell
# Option 1: Using Chocolatey package manager (recommended)
choco install ffmpeg

# Option 2: Manual installation
# 1. Download from https://ffmpeg.org/download.html#build-windows
# 2. Extract to C:\ffmpeg
# 3. Add C:\ffmpeg\bin to System PATH
```

**macOS:**
```bash
# Using Homebrew package manager
brew install ffmpeg

# Verify installation includes required codecs
ffmpeg -codecs | grep -E "libx264|aac"
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt update
sudo apt install ffmpeg

# For RHEL/CentOS/Fedora
sudo dnf install ffmpeg
```

#### Verify Installation

Run these commands to confirm FFmpeg is properly configured:

```bash
# Check FFmpeg version and build configuration
ffmpeg -version

# Verify libx264 codec availability
ffmpeg -codecs | grep libx264

# Verify AAC codec availability  
ffmpeg -codecs | grep aac

# Test FFprobe (used for audio duration detection)
ffprobe -version
```

Expected output should show FFmpeg 4.x or higher with libx264 and aac support.

## 📦 Installation

1. Clone or download this script
2. Install dependencies:
```bash
npm install axios playwright sanitize-filename dotenv
```

3. (Optional) Create a `.env` file for configuration:
```env
API_URL=https://www.tikwm.com/api/
DOWNLOADS_ROOT=/path/to/downloads
USE_AUTHENTICATION=false
```

## 🚀 Usage Modes

This tool operates in two distinct modes, each optimized for different workflows.

### Mode 1: Full Pipeline (Scrape → Download)

Execute complete profile archival with a single command:

```bash
node tiktok-scraper-downloader-enhanced.js <username> [target_count]
```

**Parameters:**
- `username` - TikTok username without @ symbol
- `target_count` - Number of posts to scrape (default: 50)

**Execution Flow:**
1. **Browser Launch** - Playwright spawns Chromium instance
2. **Profile Navigation** - Loads `https://www.tiktok.com/@{username}`
3. **Intelligent Scrolling** - Dynamically loads content until target reached
4. **URL Extraction** - Parses all `/video/` and `/photo/` links
5. **JSON Serialization** - Saves URLs to `videos.json` for persistence
6. **Batch Download** - Iterates through URLs, routing to video/slideshow handlers
7. **Statistics Report** - Outputs download/skip/fail metrics

**Examples:**

```bash
# Archive 50 most recent posts from @example_user
node tiktok-scraper-downloader-enhanced.js example_user

# Deep archive: 500 posts from @viral_account
node tiktok-scraper-downloader-enhanced.js viral_account 500

# Exhaustive scrape: 1000 posts (will take considerable time)
node tiktok-scraper-downloader-enhanced.js content_creator 1000
```

**Performance Characteristics:**
- Scraping: ~2-5 seconds per scroll iteration
- Download: ~5-15 seconds per video (network dependent)
- Slideshow processing: ~10-30 seconds per slideshow (image count dependent)

### Mode 2: Download Only (Skip Scraping)

Resume downloads or process pre-existing URL collections:

```bash
node tiktok-scraper-downloader-enhanced.js --download-only
```

**Prerequisites:**
- Requires `videos.json` in working directory
- JSON must contain array of TikTok URLs

**Use Cases:**
- Resume interrupted downloads
- Process URLs from external sources
- Re-download after clearing output directory
- Retry failed downloads after fixing network issues

**Example `videos.json` structure:**
```json
[
  "https://www.tiktok.com/@user/video/1234567890123456789",
  "https://www.tiktok.com/@user/photo/9876543210987654321",
  "https://www.tiktok.com/@user/video/5555555555555555555"
]
```

## 📂 Output Structure

Downloads are organized by username:
```
~/Downloads/
  ├── @johndoe/
  │   ├── Video_Caption_12345678.mp4
  │   ├── Slideshow_Caption_87654321.mp4
  │   └── Another_Video_11223344.mp4
  └── @janedoe/
      └── ...
```

## 🎨 Slideshow Video Conversion Pipeline

The slideshow conversion is a multi-stage process leveraging FFmpeg's concat demuxer and encoding capabilities.

### Technical Workflow

**Stage 1: Detection & Extraction**
```javascript
// URL pattern matching identifies photo posts
if (tiktokUrl.includes('/photo/')) {
  // Route to slideshow handler
}
```

**Stage 2: Asset Acquisition**
```javascript
// Fetch slideshow metadata from tikwm.com API
const response = await axios.get(ApiUrl, {
  params: { url: tiktokUrl, hd: 1 }
});

// Response contains:
// - images: Array of image URLs
// - music: Audio track URL (optional)
// - title: Caption text for filename generation
```

**Stage 3: Parallel Image Downloads**
- Downloads all images to temporary directory (`/tmp/tiktok_{timestamp}/`)
- Sequential downloads with validation (zero-byte check)
- Filename format: `img_001.jpg`, `img_002.jpg`, etc.

**Stage 4: Audio Processing**
```bash
# FFprobe extracts precise audio duration
ffprobe -v error -show_entries format=duration \
        -of default=noprint_wrappers=1:nokey=1 "audio.mp3"

# Duration calculation for perfect sync
duration_per_image = total_audio_duration / image_count
```

**Stage 5: FFmpeg Concat Demuxer**

Creates a concat file with precise image timings:
```
file 'img_001.jpg'
duration 1.91  # Calculated from audio length
file 'img_002.jpg'
duration 1.91
file 'img_003.jpg'
duration 1.91
...
file 'img_008.jpg'  # Last frame repeated for proper ending
```

**Stage 6: Video Encoding**

FFmpeg command breakdown:
```bash
ffmpeg \
  -f concat -safe 0 -i concat.txt \    # Input: Image sequence
  -i audio.mp3 \                        # Input: Audio track
  -c:v libx264 \                        # Codec: H.264
  -tune stillimage \                    # Optimize for static images
  -c:a aac -b:a 192k \                 # Audio: AAC @ 192kbps
  -pix_fmt yuv420p \                    # Pixel format (universal compatibility)
  -shortest \                           # Match shortest stream (audio)
  -y output.mp4                         # Overwrite output
```

**Encoding Parameters Explained:**
- `libx264` - Industry-standard H.264 codec for broad compatibility
- `tune stillimage` - Optimizes encoding for minimal motion (slideshows)
- `yuv420p` - Ensures compatibility with older players and mobile devices
- `shortest` - Terminates when audio ends (prevents silent extension)
- `192k` - High-quality audio bitrate preserving original fidelity

**Stage 7: Cleanup**
- Deletes temporary image files
- Removes audio file
- Removes concat.txt manifest
- Deletes temporary directory
- Only final MP4 remains in output directory

## 🔐 Authentication (Optional)

For private profiles or to avoid rate limits:

1. Set `USE_AUTHENTICATION=true` in `.env`
2. On first run, a browser will open for manual login
3. Login credentials are saved to `cookies.json`
4. Future runs will use saved session

## ⚙️ Configuration & Environment Variables

The tool supports configuration through `.env` file or environment variables.

### Configuration File Setup

Create a `.env` file in the project root:

```env
# API Configuration
API_URL=https://www.tikwm.com/api/

# Download Settings
DOWNLOADS_ROOT=/path/to/your/downloads

# Authentication (set to 'true' to enable cookie-based sessions)
USE_AUTHENTICATION=false
```

### Configuration Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `API_URL` | String | `https://www.tikwm.com/api/` | tikwm.com API endpoint URL |
| `DOWNLOADS_ROOT` | Path | `~/Downloads` | Root directory for organized downloads |
| `USE_AUTHENTICATION` | Boolean | `false` | Enable Playwright cookie persistence |

### Runtime Constants (in-code configuration)

These constants can be modified directly in the script:

```javascript
const MAX_RETRIES = 2;              // Download retry attempts per URL
const RETRY_DELAY = 1000;           // Base delay (ms) between retries (exponential backoff)
const MAX_STAGNANT_SCROLLS = 5;     // Scroll attempts before stopping scrape
```

**Retry Behavior:**
- Retry 1: Waits 1000ms (1 second)
- Retry 2: Waits 2000ms (2 seconds)
- Total attempts: 3 (1 initial + 2 retries)

### Advanced Configuration

**Custom API Endpoint:**
If tikwm.com becomes unavailable, you can configure an alternative:

```env
API_URL=https://alternative-tiktok-api.com/endpoint/
```

**Custom Download Location:**
```env
# Windows
DOWNLOADS_ROOT=C:\Users\YourName\TikTok_Archive

# macOS/Linux
DOWNLOADS_ROOT=/mnt/storage/tiktok_backup
```

**Enable Authentication:**
```env
USE_AUTHENTICATION=true
```
- First run: Browser opens for manual login
- Credentials saved to `cookies.json`
- Subsequent runs: Auto-authenticated

## 🏛️ Technical Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                            │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │   Scraper     │  │   Downloader  │  │  FFmpeg Engine  │ │
│  │  (Playwright) │→ │    (Axios)    │→ │  (Child Proc)   │ │
│  └───────────────┘  └───────────────┘  └─────────────────┘ │
│         ↓                   ↓                    ↓          │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │ videos.json   │  │  tikwm.com    │  │  Temp Storage   │ │
│  │  (URL Cache)  │  │     API       │  │  (/tmp/tiktok_) │ │
│  └───────────────┘  └───────────────┘  └─────────────────┘ │
│                                                 ↓            │
│                                        ┌─────────────────┐  │
│                                        │  Final Output   │  │
│                                        │ ~/Downloads/@u  │  │
│                                        └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Scraper** → Playwright navigates profile → Extracts URLs → Saves to `videos.json`
2. **Downloader** → Reads URLs → Calls tikwm.com API → Gets media metadata
3. **Video Path** → Downloads video stream → Saves directly to output
4. **Slideshow Path** → Downloads images + audio → Passes to FFmpeg Engine
5. **FFmpeg Engine** → Processes images → Encodes video → Outputs MP4
6. **Cleanup** → Removes temp files → Updates statistics

### File System Structure

```
project/
├── tiktok-scraper-downloader-enhanced.js   # Main executable
├── .env                                     # Configuration (optional)
├── cookies.json                             # Session storage (auto-generated)
├── videos.json                              # Scraped URLs cache
├── download-failures.log                    # Error log
└── ~/Downloads/                             # Output root
    ├── @username1/
    │   ├── Video_Title_12345678.mp4
    │   └── Slideshow_Caption_87654321.mp4
    └── @username2/
        └── ...
```

## 📊 Output Examples

```
🔍 Starting scraper for @johndoe...
🔄 Scrolling page to load more videos and photos...
✅ Found 127 video/photo URLs
✅ Saved 127 URLs to videos.json

📥 Starting batch download...
📁 Download location: /Users/you/Downloads

📸 [1/127] Downloading 8 images from slideshow...
🎵 Downloaded audio (15.3s)
🎬 Creating slideshow video...
✅ [1/127] Created slideshow video: Beautiful_Sunset_87654321.mp4 (12.45 MB)

✅ [2/127] Downloaded: Funny_Dance_12345678.mp4 (8.23 MB)
⏭️  [3/127] Already exists: 11223344

🎉 Download complete!
📊 Stats: 125 downloaded, 2 skipped, 0 failed
```

## 🐛 Troubleshooting Guide

### FFmpeg Issues

**Error: "FFmpeg is not installed or not in PATH"**

*Diagnosis:* FFmpeg binary not found in system PATH

*Solutions:*
```bash
# Verify FFmpeg location
which ffmpeg        # macOS/Linux
where ffmpeg        # Windows

# Add to PATH (Linux/macOS - add to ~/.bashrc or ~/.zshrc)
export PATH="/path/to/ffmpeg/bin:$PATH"

# Add to PATH (Windows - System Properties → Environment Variables)
# Add C:\ffmpeg\bin to System PATH variable
```

**Error: "FFmpeg failed: Unknown encoder 'libx264'"**

*Diagnosis:* FFmpeg compiled without H.264 support

*Solution:*
```bash
# Reinstall FFmpeg with full codec support
# macOS
brew reinstall ffmpeg --with-libx264

# Linux (ensure ffmpeg-full package)
sudo apt install ffmpeg ubuntu-restricted-extras

# Verify codec availability
ffmpeg -codecs | grep libx264
```

**Error: "Concat demuxer error"**

*Diagnosis:* Malformed concat file or path issues

*Solution:*
- Check temp directory permissions: `ls -la /tmp/tiktok_*`
- Verify concat.txt contents (should be in temp directory during processing)
- Ensure no special characters in image filenames

### API & Network Issues

**Error: "No video data returned" / "No photo data returned"**

*Diagnosis:* tikwm.com API unavailable or rate-limited

*Solutions:*
```bash
# Test API manually
curl "https://www.tikwm.com/api/?url=https://www.tiktok.com/@user/video/123&hd=1"

# Check for HTTP errors (502, 503, 429)
# If rate-limited: Wait 10-15 minutes before retrying
# If offline: Configure alternative API in .env
```

**Error: "Downloaded file is empty" (0 bytes)**

*Diagnosis:* Network interruption or API returned invalid URL

*Solutions:*
- Check internet connection stability
- Increase retry count: `MAX_RETRIES = 5`
- Inspect `download-failures.log` for patterns
- Test specific URL manually with curl/wget

**Error: ECONNRESET / ETIMEDOUT**

*Diagnosis:* Network timeout or firewall blocking

*Solutions:*
```javascript
// Increase timeouts in code
timeout: 120000,  // 2 minutes instead of 60s

// Use VPN if region-blocked
// Check firewall rules for Node.js/Axios
```

### Scraper Issues

**Error: "Timeout waiting for selector"**

*Diagnosis:* Profile structure changed or content not loading

*Solutions:*
- Check if profile exists and is public
- Try with authentication enabled: `USE_AUTHENTICATION=true`
- Inspect browser manually (disable `headless: false`)
- Update selector if TikTok changed DOM structure

**Issue: Scraper stops at low post count**

*Diagnosis:* Stagnation detection triggering prematurely

*Solutions:*
```javascript
// Increase stagnation threshold
const MAX_STAGNANT_SCROLLS = 10;  // Default is 5

// Increase scroll wait time
await page.waitForTimeout(5000);  // Default is 2-3 seconds
```

**Issue: Duplicate URLs in videos.json**

*Diagnosis:* TikTok returns same posts during scrolling

*Note:* This is normal - URLs are deduplicated using `Array.from(new Set(...))`

### Slideshow Conversion Issues

**Error: "Image {N} is empty"**

*Diagnosis:* Image download failed or corrupted

*Solution:*
- Retry download (automatic retry logic should handle this)
- Check if images are accessible directly:
  ```bash
  curl -I "https://image-url-from-api.jpg"
  ```

**Issue: Slideshow video has no audio**

*Expected Behavior:* Not all slideshows have audio tracks

*Verification:*
- Check console output for: `⚠️ Could not download audio`
- Script will create silent video with 15-second default duration

**Issue: Audio/video desync in slideshow**

*Diagnosis:* FFprobe returned incorrect duration or timing calculation error

*Debug:*
```bash
# Manually check audio duration
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 audio.mp3

# Verify calculation: duration_per_image = audio_duration / image_count
```

### File System Issues

**Error: EACCES / Permission denied**

*Diagnosis:* No write permissions to download directory

*Solutions:*
```bash
# Check permissions
ls -la ~/Downloads

# Fix permissions (macOS/Linux)
chmod 755 ~/Downloads

# Use different directory
DOWNLOADS_ROOT=/tmp/tiktok_downloads
```

**Error: ENAMETOOLONG**

*Diagnosis:* Filename exceeds filesystem limit (usually 255 chars)

*Note:* Script enforces 200-char limit - this error indicates a bug

*Workaround:*
```javascript
// Reduce max caption length
const maxCaptionLength = 100;  // Instead of 200
```

### Authentication Issues

**Issue: Login prompt appears every run**

*Diagnosis:* Cookies not persisting or expired

*Solutions:*
- Verify `cookies.json` exists and is not empty
- Check file permissions: `ls -la cookies.json`
- Delete `cookies.json` and re-authenticate
- Ensure `/foryou` redirect completes after login

### Performance Issues

**Issue: Very slow downloads**

*Diagnosis:* Network bottleneck or API throttling

*Optimizations:*
```javascript
// Current: Sequential downloads (safe but slow)
// Future enhancement: Implement Promise.all with concurrency limit

// Workaround: Run multiple instances with different URL ranges
// Instance 1: videos.json[0-100]
// Instance 2: videos.json[101-200]
```

### Debugging Tips

**Enable verbose logging:**
```javascript
// Add after each major step
console.log('DEBUG:', JSON.stringify(data, null, 2));
```

**Inspect temp files:**
```bash
# Prevent temp cleanup (comment out cleanup code)
// fs.rmSync(tempDir, { recursive: true, force: true });

# Then inspect
ls -la /tmp/tiktok_*
```

**Test individual functions:**
```javascript
// Run single download
await downloadTikTokVideo('https://...', 0, 1);
```

## 🎯 Core Functions & Code Architecture

### Slideshow Processing Functions

#### `isPhotoPost(tiktokUrl)`
URL pattern detection for routing decisions.

```javascript
function isPhotoPost(tiktokUrl) {
  return tiktokUrl.includes('/photo/');
}
// Returns: boolean
// Usage: Determines whether to call downloadTikTokPhotos() or downloadTikTokVideo()
```

#### `downloadTikTokPhotos(tiktokUrl, index, total, retryCount)`
Complete slideshow download and conversion pipeline.

```javascript
async function downloadTikTokPhotos(tiktokUrl, index, total, retryCount = 0)
```

**Process Flow:**
1. Creates isolated temp directory: `/tmp/tiktok_{timestamp}/`
2. Fetches slideshow data from tikwm.com API
3. Downloads all images sequentially with validation
4. Downloads audio track (if available) and extracts duration
5. Calls `createSlideshowVideo()` for encoding
6. Performs cleanup and returns status object

**Return Value:**
```javascript
{
  success: boolean,  // true if completed or skipped
  skipped: boolean   // true if already downloaded
}
```

#### `createSlideshowVideo(imageFiles, audioFile, outputPath, audioDuration)`
FFmpeg orchestration for video encoding.

```javascript
async function createSlideshowVideo(imageFiles, audioFile, outputPath, audioDuration)
```

**Parameters:**
- `imageFiles`: Array of absolute paths to downloaded images
- `audioFile`: Absolute path to audio.mp3 (or null for silent)
- `outputPath`: Final destination path for MP4
- `audioDuration`: Float representing audio length in seconds

**Technical Implementation:**
1. Calculates `durationPerImage = audioDuration / imageCount`
2. Generates concat demuxer manifest with precise timings
3. Executes FFmpeg with optimized parameters
4. Validates output and performs cleanup
5. Throws error if FFmpeg fails (caught by retry logic)

#### `getAudioDuration(audioPath)`
FFprobe wrapper for audio metadata extraction.

```javascript
async function getAudioDuration(audioPath)
```

**FFprobe Command:**
```bash
ffprobe -v error \
        -show_entries format=duration \
        -of default=noprint_wrappers=1:nokey=1 \
        "audio.mp3"
```

**Return Value:**
- `float` - Precise duration in seconds (e.g., 15.392)
- `15` - Default fallback if FFprobe fails

### Download Functions

#### `downloadTikTokVideo(tiktokUrl, index, total, retryCount)`
Standard video download handler.

```javascript
async function downloadTikTokVideo(tiktokUrl, index, total, retryCount = 0)
```

**Process:**
1. API call to tikwm.com for video metadata
2. Prefers `hdplay` URL over `play` (HD quality priority)
3. Streams video directly to disk (no memory buffering)
4. Validates file size (rejects 0-byte files)
5. Implements exponential backoff retry logic

#### `downloadTikTokContent(tiktokUrl, index, total)`
Routing function that delegates to appropriate handler.

```javascript
async function downloadTikTokContent(tiktokUrl, index, total) {
  if (isPhotoPost(tiktokUrl)) {
    return downloadTikTokPhotos(tiktokUrl, index, total);
  } else {
    return downloadTikTokVideo(tiktokUrl, index, total);
  }
}
```

### Scraping Functions

#### `scrapeTikTokProfile(username, targetCount)`
Playwright-based profile crawler with intelligent scrolling.

```javascript
async function scrapeTikTokProfile(username, targetCount)
```

**Algorithm:**
1. Launches Chromium with mobile user-agent
2. Loads cookies if `USE_AUTHENTICATION=true`
3. Navigates to `@{username}` profile
4. Implements stagnation detection (tracks content growth)
5. Stops when: target reached OR max stagnant scrolls exceeded
6. Deduplicates URLs using Set data structure
7. Reverses array (chronological order: oldest → newest)

**Stagnation Detection Logic:**
```javascript
if (currentCount === lastCount) {
  stagnantScrolls++;
  if (stagnantScrolls >= MAX_STAGNANT_SCROLLS) {
    break; // No more content loading
  }
} else {
  stagnantScrolls = 0; // Reset counter
  lastCount = currentCount;
}
```

### Utility Functions

#### `extractVideoId(tiktokUrl)`
Regex-based ID extraction from TikTok URLs.

```javascript
function extractVideoId(tiktokUrl) {
  const match = tiktokUrl.match(/\/(video|photo)\/(\d+)/);
  return match ? match[2] : Date.now().toString();
}
// Input:  "https://www.tiktok.com/@user/video/1234567890123456789"
// Output: "1234567890123456789"
```

#### `extractUsername(tiktokUrl)`
Username parsing for directory organization.

```javascript
function extractUsername(tiktokUrl) {
  const match = tiktokUrl.match(/tiktok\.com\/@([^/]+)\//);
  return match ? `@${match[1]}` : 'unknown';
}
// Input:  "https://www.tiktok.com/@john_doe/video/123"
// Output: "@john_doe"
```

#### `cleanText(text)`
Unicode normalization and filesystem-safe character removal.

```javascript
function cleanText(text) {
  return text
    .normalize('NFKD')                    // Normalize Unicode
    .replace(/[^\x00-\x7F]/g, '')         // Remove non-ASCII
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '') // Remove forbidden chars
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '') // Remove RTL marks
    .replace(/\s+/g, ' ')                 // Collapse whitespace
    .trim();
}
```

#### `isAlreadyDownloaded(outputDir, videoId)`
Duplicate detection using ID suffix matching.

```javascript
function isAlreadyDownloaded(outputDir, videoId) {
  if (!fs.existsSync(outputDir)) return false;
  
  const existingFiles = fs.readdirSync(outputDir);
  const shortId = videoId.slice(-8); // Last 8 digits
  
  return existingFiles.some(file => {
    const match = file.match(/_([^_.]+)\.mp4$/);
    return match && match[1] === shortId;
  });
}
```

**Filename Format:**
```
Caption_Text_12345678.mp4
             ^^^^^^^^
             Last 8 digits of video ID (unique identifier)
```

#### `logFailure(url, errorMsg)`
Append-only failure logger with timestamps.

```javascript
function logFailure(url, errorMsg) {
  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] ❌ ${url} - ${errorMsg}\n`;
  fs.appendFileSync(failLogPath, log);
}
```

**Log Format:**
```
[2024-02-01T15:30:45.123Z] ❌ https://tiktok.com/@user/video/123 - No video data returned
[2024-02-01T15:31:02.456Z] ❌ https://tiktok.com/@user/photo/456 - FFmpeg failed: ...
```

### Validation Functions

#### `checkFFmpeg()`
System dependency verification for FFmpeg.

```javascript
async function checkFFmpeg() {
  try {
    await execPromise('ffmpeg -version');
    return true;
  } catch (err) {
    console.error('❌ FFmpeg is not installed or not in PATH.');
    // ... installation instructions
    return false;
  }
}
```

**Called:** Before any download operations
**Purpose:** Fail-fast if slideshow conversion won't be possible

## 📝 Technical Notes & Best Practices

### URL Detection & Routing
- Slideshow detection: Checks for `/photo/` in URL path
- All slideshows output as `.mp4` format (never individual images)
- Video ID extraction: Last 8 digits used for duplicate detection
- Filename sanitization: Removes special characters, enforces 200-char limit

### Concurrency & Performance
- **Sequential Processing**: Downloads process one-at-a-time (prevents API throttling)
- **Network Optimization**: 60s timeout for large files, 15s for API calls
- **Memory Management**: Streaming downloads (no full-file buffering)
- **Disk I/O**: Temporary files use OS temp directory (usually tmpfs on Linux)

### Error Handling & Resilience
- **Automatic Retries**: Exponential backoff on failures
- **Graceful Degradation**: Silent slideshows created if audio unavailable
- **Validation**: Zero-byte file detection and automatic cleanup
- **Logging**: All failures timestamped in `download-failures.log`

### Duplicate Detection Algorithm
```javascript
// Matches on last 8 digits of video ID in filename
const shortId = videoId.slice(-8);
existingFiles.some(file => {
  const match = file.match(/_([^_.]+)\.mp4$/);
  return match && match[1] === shortId;
});
```

### FFmpeg Audio Fallback
- Default duration: 15 seconds (configurable in code)
- Applied when: Audio track unavailable or download fails
- Behavior: Creates silent video with evenly-timed image display

### Session Management
- Cookie storage: `cookies.json` in project root
- Persistence: Survives script restarts
- Security: Contains authentication tokens (add to `.gitignore`)
- Expiration: Follows TikTok's session lifetime

## ⚖️ Legal & Ethical Considerations

### Important Disclaimers

**⚠️ This tool is provided for educational and archival purposes only.**

### Terms of Service
- **TikTok ToS**: Downloading content may violate TikTok's Terms of Service
- **tikwm.com**: Unofficial API usage may be subject to undocumented restrictions
- **Content Rights**: Downloaded content remains property of original creators

### Responsible Use Guidelines

✅ **Acceptable Use:**
- Archiving your own content for backup
- Educational research with proper attribution
- Offline viewing of public content for personal use
- Analyzing publicly available data

❌ **Prohibited Use:**
- Redistributing downloaded content without permission
- Circumventing creator monetization or analytics
- Bulk scraping for commercial purposes
- Violating creator intellectual property rights

### Privacy & Data Protection
- Respect creator privacy and content boundaries
- Do not archive private or restricted profiles without authorization
- Be mindful of GDPR, CCPA, and regional data protection laws
- Consider ethical implications of mass content archival

### Recommendation
Always obtain explicit permission from content creators before downloading and using their work. When in doubt, respect creator rights and platform terms.

## 🔒 Security Considerations

- **SSL Verification**: Disabled for tikwm.com (`rejectUnauthorized: false`)
- **Cookie Storage**: Contains sensitive auth tokens - protect accordingly
- **API Keys**: None required (unauthenticated API access)
- **File Permissions**: Downloads created with default user permissions

## 🔮 Roadmap & Future Enhancements

### Performance Optimizations
- [ ] **Concurrent Downloads** - Implement controlled parallelism with p-limit or Promise pool
- [ ] **Resume Capability** - Track download progress and resume interrupted batches
- [ ] **Incremental Scraping** - Detect and skip already-scraped content

### Feature Additions
- [ ] **Custom Transitions** - FFmpeg xfade filters for smooth slideshow animations
- [ ] **Metadata Export** - JSON/CSV output with views, likes, comments, timestamps
- [ ] **Quality Selection** - User-configurable video quality (SD/HD/4K)
- [ ] **Format Options** - Support for WebM, MKV output formats
- [ ] **Bulk Operations** - Multi-profile scraping from username list
- [ ] **Caption Overlay** - Burn-in captions/subtitles using FFmpeg drawtext

### Technical Improvements
- [ ] **TypeScript Migration** - Type safety and better IDE support
- [ ] **CLI Framework** - Commander.js for better argument parsing
- [ ] **Progress Bars** - CLI-progress for visual download feedback
- [ ] **Database Storage** - SQLite for metadata and download history
- [ ] **Docker Support** - Containerized deployment with FFmpeg pre-installed
- [ ] **API Abstraction** - Support multiple API backends (tikwm, ssstik, etc.)

### Monitoring & Analytics
- [ ] **Webhook Notifications** - Discord/Slack alerts on completion
- [ ] **Statistics Dashboard** - Web UI for download analytics
- [ ] **Error Classification** - Categorized failure analysis and reporting

## 🤝 Contributing

Contributions are welcome! This is an educational project and improvements benefit everyone.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Guidelines

- Maintain code style consistency
- Add comments for complex logic
- Test thoroughly before submitting
- Update README if adding features
- Respect legal and ethical boundaries

### Bug Reports

When reporting bugs, please include:
- Node.js version (`node --version`)
- FFmpeg version (`ffmpeg -version`)
- Operating system and version
- Complete error message and stack trace
- Steps to reproduce
- Sample URL (if applicable)

## 📄 License & Attribution

**License:** MIT License (or appropriate open-source license)

**Attribution:**
- FFmpeg - Licensed under LGPL/GPL
- Playwright - Apache License 2.0
- Axios - MIT License
- tikwm.com API - Third-party service (no official affiliation)

**Disclaimer:** This tool is an independent project and is not affiliated with, endorsed by, or connected to TikTok, ByteDance, or any official TikTok services.

## 🙏 Acknowledgments

- **FFmpeg Team** - For the incredible video processing framework
- **Playwright Team** - For robust browser automation
- **tikwm.com** - For providing accessible API endpoints
- **Open Source Community** - For packages and inspiration

## 📧 Support & Contact

For issues, questions, or discussions:
- Open an issue on the repository
- Check existing issues for solutions
- Review troubleshooting guide above

---

**⭐ If this tool helped you, consider starring the repository!**

**Made with ❤️ for the archival and education community**