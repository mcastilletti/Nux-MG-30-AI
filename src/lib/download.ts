/** Scarica un Blob come file (solo browser). */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoca dopo il click: alcuni browser (Safari iOS) leggono l'URL in modo asincrono.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
