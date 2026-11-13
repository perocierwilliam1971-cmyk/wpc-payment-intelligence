// Saving files reliably across desktop, Android, iPhone and iPad.
//
// Key iOS/iPadOS facts this code is built around:
//  * navigator.share() must be called directly inside a tap. Any `await`
//    before it (e.g. generating the PDF) loses the "user gesture" and Safari
//    throws NotAllowedError. So the UI generates files FIRST, then shows
//    Save/Share buttons that act synchronously on the ready Blob.
//  * iPadOS Safari reports itself as "Macintosh"; detect via touch points.
//  * <a download> works on iOS 13+ Safari; Chrome on iOS also supports it.
//    As a last resort we open the Blob in a new tab (user can Share › Save).

export function platform() {
  const ua = navigator.userAgent || '';
  const iPadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  const iOS = /iPhone|iPad|iPod/.test(ua) || iPadOS;
  const android = /Android/.test(ua);
  const crios = /CriOS|FxiOS|EdgiOS/.test(ua);
  return { iOS, iPadOS, android, iosChrome: iOS && crios, mobile: iOS || android };
}

export function canShareFile(file) {
  try {
    return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
  } catch {
    return false;
  }
}

export function toFile(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  try {
    return new File([blob], filename, { type: type || blob.type });
  } catch {
    blob.name = filename; // very old Safari: no File constructor
    return blob;
  }
}

/** Trigger a normal download. Must be called inside a click handler when possible. */
export function saveFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || 'download';
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000); // generous: iOS may read the blob URL late
  return true;
}

/** Share sheet (iOS "Save to Files", AirDrop, Mail...). Synchronous call required. */
export function shareFile(file, title) {
  return navigator.share({ files: [file], title: title || file.name });
}

/** Open the file in a new tab (fallback when downloads are blocked). */
export function openFile(file) {
  const url = URL.createObjectURL(file);
  const w = window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return !!w;
}
