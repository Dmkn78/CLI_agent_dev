let token = '';

export async function api(path, payload) {
  const response = await fetch(path, payload === undefined ? { cache: 'no-store' } : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Prisme-Token': token }, body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Erreur ${response.status}`);
  if (path === '/api/bootstrap') token = result.token;
  return result;
}

export function toast(message, isError = false) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.className = `visible${isError ? ' error' : ''}`;
  clearTimeout(element.hideTimer);
  element.hideTimer = setTimeout(() => { element.className = ''; }, isError ? 8000 : 4000);
}

export async function filePayload(file) {
  if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name} dépasse 25 Mo.`);
  const encoded = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Lecture impossible : ${file.name}`));
    reader.readAsDataURL(file);
  });
  return { name: file.name, content: String(encoded).split(',')[1] };
}

