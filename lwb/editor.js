// Preset files
const presetFiles = [
  'hero.html','navbar.html','grid-2col.html','card.html',
  'slider.html','accordion.html','modal.html','form.html','footer.html'
];

const moduleList = document.getElementById('module-list');
const canvas = document.getElementById('canvas');
const search = document.getElementById('search');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');

// Sidebar preset drag setup
function loadModuleList(filter = '') {
  moduleList.innerHTML = '';
  presetFiles.filter(f => f.includes(filter)).forEach(file => {
    const li = document.createElement('li');
    li.className = 'uk-margin-small';
    li.textContent = file.replace('.html', '');
    li.draggable = true;
    li.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', file);
      e.dataTransfer.effectAllowed = 'copy';
    });
    li.onclick = () => addModuleToCanvas(file);
    moduleList.appendChild(li);
  });
}

// Canvas drop events (ONLY these, don't use canvas.ondragover/canvas.ondrop!)
canvas.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
canvas.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.getData('text/plain');
  // Remove placeholder if present
  const placeholder = canvas.querySelector('.uk-text-center.uk-text-meta');
  if (placeholder) placeholder.remove();
  if (file) addModuleToCanvas(file);
});

search.addEventListener('input', () => loadModuleList(search.value));

function addModuleToCanvas(file) {
  fetch(`presets/${file}`).then(r => r.text()).then(html => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('module-wrapper','uk-margin');
    wrapper.innerHTML = html;
    const del = document.createElement('button');
    del.textContent = '×';
    del.className = 'uk-button uk-button-danger uk-button-small uk-position-top-right';
    del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
    wrapper.appendChild(del);
    wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
    canvas.appendChild(wrapper);
  });
}

const colorInput = document.createElement('input');
colorInput.type = 'color';
colorInput.style.position = 'absolute';
colorInput.style.display = 'none';
document.body.appendChild(colorInput);
let colorTarget = null;

canvas.addEventListener('click', e => {
  const el = e.target.closest('[data-color-editable]');
  if (el) {
    colorTarget = el;
    const prop = el.getAttribute('data-color-editable')==='background' ? 'backgroundColor':'color';
    const style = getComputedStyle(el)[prop];
    const vals = style.match(/\d+/g);
    if (vals) colorInput.value = '#' + ((1<<24) + (+vals[0]<<16) + (+vals[1]<<8) + +vals[2]).toString(16).slice(1);
    const r = el.getBoundingClientRect();
    colorInput.style.left = `${r.right + 10 + window.scrollX}px`;
    colorInput.style.top = `${r.top + window.scrollY}px`;
    colorInput.style.display = 'block';
    colorInput.focus();
  } else {
    colorInput.style.display = 'none';
    colorTarget = null;
  }
});

colorInput.addEventListener('input', () => {
  if (colorTarget) {
    const prop = colorTarget.getAttribute('data-color-editable')==='background'?'backgroundColor':'color';
    colorTarget.style[prop] = colorInput.value;
  }
});
colorInput.addEventListener('blur', () => {
  colorInput.style.display = 'none';
  colorTarget = null;
});

new Sortable(canvas, { animation:150, ghostClass:'uk-background-muted' });

function getSiteData() {
  return Array.from(canvas.querySelectorAll('.module-wrapper')).map(m => ({ html: m.innerHTML }));
}

saveBtn.onclick = () => {
  localStorage.setItem('site', JSON.stringify(getSiteData()));
  UIkit.notification('Saved!', 'success');
};
loadBtn.onclick = () => importFile.click();

importFile.onchange = () => {
  const f = importFile.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      canvas.innerHTML = '';
      data.forEach(m => {
        const wrapper = document.createElement('div');
        wrapper.className = 'module-wrapper uk-margin';
        wrapper.innerHTML = m.html;
        wrapper.querySelectorAll('button').forEach(btn => {
          if(btn.textContent==='×') btn.onclick = e => wrapper.remove();
        });
        wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
        canvas.appendChild(wrapper);
      });
      UIkit.notification('Loaded!', 'primary');
    } catch {
      UIkit.notification('Import failed.', 'danger');
    }
  };
  r.readAsText(f);
};

exportBtn.onclick = () => {
  let bodyContent = '';
  canvas.querySelectorAll('.module-wrapper').forEach(m => {
    const clone = m.cloneNode(true);
    clone.querySelectorAll('button').forEach(b=>b.remove());
    bodyContent += clone.innerHTML;
  });
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/css/uikit.min.css"></head><body>${bodyContent}</body></html>`;
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download='site.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

loadModuleList();