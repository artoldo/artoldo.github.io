// --- Minimal UIkit Editor JS ---
// List your preset file names here:
const presetFiles = ['hero.html', 'card.html', 'image.html'];

// Get DOM elements
const moduleList = document.getElementById('module-list');
const canvas = document.getElementById('canvas');
const search = document.getElementById('search');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const textAnimationSelect = document.getElementById('textAnimationSelect');
const parallaxSelect = document.getElementById('parallaxSelect');

// --- Preset List ---
function loadModuleList(filter = '') {
  moduleList.innerHTML = '';
  presetFiles
    .filter(f => f.toLowerCase().includes(filter.toLowerCase()))
    .forEach(file => {
      const li = document.createElement('li');
      li.className = 'uk-padding-small uk-background-muted uk-margin-small uk-border-rounded';
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
search.addEventListener('input', () => loadModuleList(search.value));
loadModuleList();

// --- Drag and Drop Canvas ---
canvas.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
canvas.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.getData('text/plain');
  canvas.querySelector('.uk-text-center.uk-text-meta')?.remove();
  if (file) addModuleToCanvas(file);
});

// --- Add Preset to Canvas ---
function addModuleToCanvas(file) {
  fetch(`presets/${file}`)
    .then(r => r.text())
    .then(html => {
      const wrapper = document.createElement('div');
      wrapper.className = 'module-wrapper uk-margin uk-position-relative uk-card uk-card-default uk-card-body';
      wrapper.innerHTML = html;

      // Remove button (UIkit native style, top-left)
      const del = document.createElement('button');
      del.setAttribute('type', 'button');
      del.setAttribute('aria-label', 'Close');
      del.className = 'uk-close uk-close-large uk-position-absolute';
      del.style.top = '10px';
      del.style.left = '10px';
      del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
      wrapper.appendChild(del);

      // Make all [data-editable] contentEditable
      wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);

      // Image upload/click logic
      wrapper.querySelectorAll('.lwb-image, .lwb-image-placeholder').forEach(img => {
        img.style.cursor = 'pointer';
        img.onclick = imageClickHandler;
      });

      // Add to canvas
      canvas.appendChild(wrapper);

      // Animate/parallax
      animateText(wrapper);
      if (wrapper.hasAttribute('uk-parallax')) UIkit.parallax(wrapper);
    });
}

// --- Editable text: Focus shows toolbar, or just double-click to edit ---
canvas.addEventListener('dblclick', e => {
  const el = e.target.closest('[data-editable]');
  if (el) {
    el.focus();
    document.execCommand('selectAll', false, null);
    return;
  }
});

// --- Image Upload & URL Logic ---
let imageInput = document.getElementById('lwb-image-input');
if (!imageInput) {
  imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.style.display = 'none';
  imageInput.id = 'lwb-image-input';
  document.body.appendChild(imageInput);
}
let imgTarget = null;

function imageClickHandler(e) {
  imgTarget = e.target;
  UIkit.modal.prompt('Paste image URL or click OK to upload:', '', function(val) {
    if (val && val.trim()) {
      imgTarget.src = val.trim();
    } else {
      imageInput.value = '';
      imageInput.click();
    }
  });
}
imageInput.onchange = () => {
  if (!imgTarget) return;
  if (imageInput.files && imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { imgTarget.src = e.target.result; };
    reader.readAsDataURL(imageInput.files[0]);
  }
};

// --- Animation Logic ---
textAnimationSelect.addEventListener('change', () => {
  canvas.querySelectorAll('.module-wrapper').forEach(animateText);
});
function animateText(wrapper) {
  const anim = textAnimationSelect.value;
  wrapper.querySelectorAll('h1, h2, h3, h4, p, [data-editable]').forEach(el => {
    el.classList.remove(
      'uk-animation-fade','uk-animation-scale-up',
      'uk-animation-slide-top-small','uk-animation-slide-bottom-small',
      'uk-animation-slide-left-small','uk-animation-slide-right-small'
    );
    if (anim) el.classList.add(anim);
  });
}

// --- Parallax: Click block, then set effect from select ---
let parallaxTarget = null;
canvas.addEventListener('click', e => {
  const wrapper = e.target.closest('.module-wrapper');
  if (wrapper) parallaxTarget = wrapper;
});
parallaxSelect.addEventListener('change', function() {
  if (!parallaxTarget) {
    UIkit.notification('Click a block to select it first!', 'warning');
    return;
  }
  parallaxTarget.removeAttribute('uk-parallax');
  if (parallaxTarget._parallax) {
    parallaxTarget._parallax.$destroy(true);
    delete parallaxTarget._parallax;
  }
  const val = parallaxSelect.value;
  if (val) {
    parallaxTarget.setAttribute('uk-parallax', val);
    UIkit.parallax(parallaxTarget);
  }
});

// --- Save/Load/Export ---
saveBtn.onclick = () => {
  const data = Array.from(canvas.querySelectorAll('.module-wrapper')).map(m => ({ html: m.innerHTML }));
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "site.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  UIkit.notification('Saved as JSON file!', 'success');
};
loadBtn.onclick = () => { importFile.value = ''; importFile.click(); };
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
        wrapper.className = 'module-wrapper uk-margin uk-position-relative uk-card uk-card-default uk-card-body';
        wrapper.innerHTML = m.html;
        // Re-attach remove btn
        const del = document.createElement('button');
        del.innerHTML = '<span uk-icon="close"></span>';
        del.className = 'uk-icon-button uk-button-danger lwb-remove-btn';
        del.style.position = 'absolute';
        del.style.top = '10px';
        del.style.left = '10px';
        del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
        wrapper.appendChild(del);

        // Editable fields
        wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
        // Image upload
        wrapper.querySelectorAll('.lwb-image, .lwb-image-placeholder').forEach(img => {
          img.style.cursor = 'pointer';
          img.onclick = imageClickHandler;
        });
        canvas.appendChild(wrapper);
        animateText(wrapper);
        if (wrapper.hasAttribute('uk-parallax')) UIkit.parallax(wrapper);
      });
      UIkit.notification('Loaded!', 'primary');
    } catch { UIkit.notification('Import failed.', 'danger'); }
  };
  r.readAsText(f);
};
exportBtn.onclick = async () => {
  let uikitCSS = '';
  try { uikitCSS = await fetch('https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/css/uikit.min.css').then(r => r.text()); } catch{}
  let bodyContent = '';
  document.querySelectorAll('.module-wrapper').forEach(m => {
    const clone = m.cloneNode(true);
    clone.querySelectorAll('button.lwb-remove-btn').forEach(b => b.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    bodyContent += clone.innerHTML;
  });
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${uikitCSS}</style>
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/js/uikit.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/js/uikit-icons.min.js"></script>
</head>
<body>
${bodyContent}
</body>
</html>`;
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download='site.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  UIkit.notification('Exported as HTML!', 'success');
};