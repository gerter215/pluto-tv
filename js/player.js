/* =============================================
   Pluto TV — Video Player Module
   Uses Video.js
   ============================================= */

const Player = (() => {

  let videojsPlayer = null;
  let currentQualityIndex = 0;
  let currentSources = [];
  let currentItem = null;

  const overlay = () => document.getElementById('player-overlay');
  const videoEl = () => document.getElementById('video-player');
  const titleEl = () => document.getElementById('player-title');

  /**
   * Open player and start playing
   * @param {Object} item - movie/series object
   * @param {Array} sources - [{quality, type, url}, ...]
   * @param {number} qualityIndex - index into sources array
   */
  function play(item, sources, qualityIndex = 0) {
    if (!sources || sources.length === 0) {
      Toast.show('منبع پخش موجود نیست');
      return;
    }

    // Filter playable sources (skip trailers)
    const playable = sources.filter(s =>
      s.url && !s.quality.includes('تیزر') && !s.quality.includes('trailer')
    );
    const playableList = playable.length > 0 ? playable : sources;
    const idx = Math.min(qualityIndex, playableList.length - 1);

    currentSources = playableList;
    currentQualityIndex = idx;
    currentItem = item;

    const source = playableList[idx];
    titleEl().textContent = item.title || '';
    overlay().classList.remove('hidden');

    // Dispose previous
    if (videojsPlayer) {
      videojsPlayer.dispose();
    }

    // Recreate video element (Video.js needs fresh el)
    const oldVideo = videoEl();
    const newVideo = oldVideo.cloneNode(false);
    oldVideo.parentNode.replaceChild(newVideo, oldVideo);
    newVideo.id = 'video-player';
    newVideo.className = 'video-js vjs-big-pinned vjs-fluid';
    newVideo.setAttribute('controls', '');
    newVideo.setAttribute('preload', 'auto');
    newVideo.setAttribute('playsinline', '');

    // Determine MIME type
    const isMkv = source.url.toLowerCase().includes('.mkv');
    const isMp4 = source.url.toLowerCase().includes('.mp4') || source.type === 'mp4';
    const mimeType = isMkv ? 'video/x-matroska' : (isMp4 ? 'video/mp4' : 'application/x-mpegurl');

    videojsPlayer = videojs(newVideo, {
      controls: true,
      autoplay: true,
      preload: 'auto',
      fluid: true,
      playbackRates: [0.5, 1, 1.5, 2],
      html5: {
        vhs: { withCredentials: false }
      },
      textTrackSettings: false
    });

    videojsPlayer.src({
      src: source.url,
      type: mimeType
    });

    videojsPlayer.ready(() => {
      videojsPlayer.play().catch(err => {
        console.warn('[Player] autoplay failed:', err);
        Toast.show('برای پخش کلیک کنید');
      });
    });

    videojsPlayer.on('error', () => {
      const code = videojsPlayer.error();
      console.error('[Player] error:', code);
      if (code && code.code === 4) {
        // MEDIA_ERR_SRC_NOT_SUPPORTED — try next quality
        if (currentQualityIndex < currentSources.length - 1) {
          Toast.show('کیفیت بعدی امتحان می‌شود...');
          play(item, sources, currentQualityIndex + 1);
        } else {
          Toast.show('پخش این منبع پشتیبانی نمی‌شود (.mkv داره)');
        }
      }
    });

    videojsPlayer.on('ended', () => {
      console.log('[Player] ended');
    });
  }

  function close() {
    if (videojsPlayer) {
      videojsPlayer.pause();
      videojsPlayer.dispose();
      videojsPlayer = null;
    }
    overlay().classList.add('hidden');
    // Recreate video element for next time
    const container = document.querySelector('.player-overlay');
    if (container && !container.querySelector('#video-player')) {
      const v = document.createElement('video');
      v.id = 'video-player';
      v.className = 'video-js vjs-big-pinned vjs-fluid';
      v.setAttribute('controls', '');
      v.setAttribute('preload', 'auto');
      v.setAttribute('playsinline', '');
      container.appendChild(v);
    }
    currentItem = null;
    currentSources = [];
    currentQualityIndex = 0;
  }

  function getCurrentItem() { return currentItem; }

  return { play, close, getCurrentItem };
})();
