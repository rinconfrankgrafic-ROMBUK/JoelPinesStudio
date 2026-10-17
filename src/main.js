import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import './style.css';
import JSZip from 'jszip';
import { removeBackground } from '@imgly/background-removal';

const $ = id => document.getElementById(id);
const fileInput = $('fileInput'), photoList = $('photoList'), editImage = $('editImage'), previewArea = $('previewArea');
let items = [], activeId = null, cropper = null, currentRotation = 0, processing = false;

function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 5000);
}
function active() { return items.find(item => item.id === activeId); }
function revoke(url) { if (url) URL.revokeObjectURL(url); }
function safeName(name) { return name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 100) || 'producto'; }
function outputExtension() { return $('outputFormat').value === 'image/png' ? 'png' : 'webp'; }
function setDownloadLabel() { const item = active(); $('downloadBtn').textContent = `Descargar ${(item?.done ? item.extension : outputExtension()).toUpperCase()}`; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

function renderList() {
  $('count').textContent = items.length; photoList.innerHTML = '';
  if (!items.length) { photoList.innerHTML = '<p class="muted empty">Añade las fotos de tus pines para comenzar.</p>'; return; }
  items.forEach(item => {
    const row = document.createElement('div'); row.className = 'photo-item' + (item.id === activeId ? ' active' : '');
    row.innerHTML = `<img src="${item.originalUrl}" alt=""><div class="photo-meta"><strong title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</strong><small>${item.done ? '✓ Procesada' : 'Pendiente'}</small></div>`;
    row.onclick = () => selectItem(item.id); photoList.appendChild(row);
  });
}
function updateProgress() {
  const done = items.filter(item => item.done).length;
  $('progress').textContent = `${done} procesadas de ${items.length}`;
  $('zipBtn').disabled = done === 0 || processing;
  $('downloadBtn').disabled = !active()?.done || processing; setDownloadLabel();
  $('nextBtn').disabled = !items.some(item => !item.done) || processing;
  $('processBtn').disabled = !active() || processing;
  $('resetBtn').disabled = !active() || processing;
  $('status').textContent = active()?.done ? '✓ Procesada' : '';
}
function selectItem(id) {
  if (processing) return;
  if (cropper) { cropper.destroy(); cropper = null; }
  activeId = id; currentRotation = 0;
  const item = active(); if (!item) return;
  $('activeName').textContent = item.name;
  $('angleRange').value = 0; $('angleNumber').value = 0; $('angleLabel').textContent = '0°';
  $('emptyState').hidden = true; editImage.hidden = false;
  editImage.style.background = ''; editImage.style.objectFit = '';
  previewArea.classList.add('checkerboard');
  editImage.onload = () => {
    cropper = new Cropper(editImage, {
      viewMode: 1, dragMode: 'move', aspectRatio: 1, autoCropArea: .72,
      background: false, responsive: true, restore: false, rotatable: true, zoomable: true,
      ready() { updateProgress(); }
    });
  };
  editImage.src = item.originalUrl;
  renderList(); updateProgress();
}
function rotateTo(degrees) {
  currentRotation = Math.max(-180, Math.min(180, Number(degrees) || 0));
  $('angleRange').value = currentRotation; $('angleNumber').value = currentRotation; $('angleLabel').textContent = `${currentRotation}°`;
  if (cropper) cropper.rotateTo(currentRotation);
}
function resetActive() {
  if (!active() || processing) return;
  currentRotation = 0; $('angleRange').value = 0; $('angleNumber').value = 0; $('angleLabel').textContent = '0°';
  cropper?.reset(); toast('Encuadre y rotación restablecidos.');
}
function canvasBlob(canvas, type) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo exportar la imagen.')), type, type === 'image/webp' ? .96 : undefined));
}
function createCropCanvas() {
  if (!cropper) throw new Error('Selecciona una fotografía primero.');
  const size = Number($('exportSize').value);
  const canvas = cropper.getCroppedCanvas({ width: size, height: size, fillColor: 'rgba(0,0,0,0)', imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
  if (!canvas) throw new Error('No se pudo generar el encuadre cuadrado.');
  return canvas;
}
async function processCurrent() {
  const item = active(); if (!item || processing) return;
  processing = true; $('processBtn').textContent = 'Procesando…'; $('status').textContent = 'Procesando…'; updateProgress();
  try {
    const cropped = createCropCanvas();
    const inputBlob = await canvasBlob(cropped, 'image/png');
    toast('La IA está eliminando el fondo. La primera vez puede tardar mientras descarga el modelo.');
    const noBackgroundBlob = await removeBackground(inputBlob, {
      output: { format: 'image/png' },
      progress: (key, current, total) => {
        if (total) $('status').textContent = `${key}: ${Math.round(current / total * 100)}%`;
      }
    });
    const transparentBitmap = await createImageBitmap(noBackgroundBlob);
    const size = cropped.width, finalCanvas = document.createElement('canvas'); finalCanvas.width = size; finalCanvas.height = size;
    const ctx = finalCanvas.getContext('2d');
    if ($('outputBg').value !== 'transparent') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size); }
    ctx.drawImage(transparentBitmap, 0, 0, size, size); transparentBitmap.close?.();
    const mime = $('outputFormat').value, blob = await canvasBlob(finalCanvas, mime);
    if (item.processedUrl) revoke(item.processedUrl);
    item.processedUrl = URL.createObjectURL(blob); item.blob = blob; item.done = true; item.extension = outputExtension();
    renderList(); updateProgress(); showResult(item);
    toast('Procesamiento completado. Descarga la imagen o continúa con la siguiente del lote.');
  } catch (error) {
    console.error(error); $('status').textContent = active()?.done ? '✓ Resultado anterior' : '';
    toast(`No se pudo eliminar el fondo. Comprueba tu conexión e inténtalo de nuevo. ${error?.message || ''}`);
  } finally {
    processing = false; $('processBtn').textContent = 'Eliminar fondo y procesar'; updateProgress();
  }
}
function showResult(item) {
  if (cropper) { cropper.destroy(); cropper = null; }
  editImage.hidden = false; editImage.onload = () => { editImage.style.maxWidth = '100%'; editImage.style.maxHeight = '100%'; editImage.style.objectFit = 'contain'; };
  editImage.src = item.processedUrl; previewArea.classList.toggle('checkerboard', $('outputBg').value === 'transparent');
  $('status').textContent = '✓ Resultado procesado';
}
function nextPending() {
  const item = items.find(entry => !entry.done);
  if (!item) { toast('Todas las fotografías están procesadas.'); return; }
  selectItem(item.id);
}
function downloadCurrent() {
  const item = active(); if (!item?.blob) return;
  const a = document.createElement('a'); a.href = item.processedUrl; a.download = `${safeName(item.name)}.${item.extension}`; a.click();
}
async function downloadZip() {
  const done = items.filter(item => item.done && item.blob); if (!done.length || processing) return;
  const zip = new JSZip(), nameCounts = new Map();
  done.forEach(item => {
    const base = safeName(item.name), ext = item.extension || 'webp', count = (nameCounts.get(base) || 0) + 1;
    nameCounts.set(base, count); zip.file(`${base}${count > 1 ? `_${count}` : ''}.${ext}`, item.blob);
  });
  $('zipBtn').textContent = 'Preparando ZIP…'; $('zipBtn').disabled = true;
  try {
    const blob = await zip.generateAsync({ type: 'blob' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'JoelPines_fotografias_procesadas.zip'; a.click(); setTimeout(() => revoke(url), 10000);
  } catch (error) { console.error(error); toast('No se pudo crear el ZIP.'); }
  finally { $('zipBtn').textContent = 'Descargar ZIP'; updateProgress(); }
}
fileInput.addEventListener('change', event => {
  [...event.target.files].filter(file => ['image/jpeg','image/png','image/webp'].includes(file.type)).forEach(file => {
    const originalUrl = URL.createObjectURL(file);
    items.push({ id: crypto.randomUUID(), name: file.name, originalUrl, done: false, processedUrl: null, blob: null, extension: null });
  });
  renderList(); updateProgress();
  if (!active() && items.length) selectItem(items[0].id);
  if (event.target.files.length && !items.length) toast('Elige una imagen JPG, PNG o WebP.');
  fileInput.value = '';
});
$('zoomIn').onclick = () => cropper?.zoom(.08);
$('zoomOut').onclick = () => cropper?.zoom(-.08);
$('fitBtn').onclick = () => cropper?.reset();
$('rotateLeft').onclick = () => rotateTo(currentRotation - 90);
$('rotateRight').onclick = () => rotateTo(currentRotation + 90);
$('angleRange').oninput = event => rotateTo(event.target.value);
$('angleNumber').onchange = event => rotateTo(event.target.value);
$('outputFormat').onchange = () => { setDownloadLabel(); };
$('resetBtn').onclick = resetActive;
$('processBtn').onclick = processCurrent;
$('nextBtn').onclick = nextPending;
$('downloadBtn').onclick = downloadCurrent;
$('zipBtn').onclick = downloadZip;
renderList(); updateProgress();
