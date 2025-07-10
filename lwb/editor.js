// --- Config ---
const presetFiles = ['hero.html', 'card.html', 'image.html'];

// --- DOM ---
const moduleList = document.getElementById('module-list');
const canvas = document.getElementById('canvas');
const search = document.getElementById('search');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const animSelect = document.getElementById('textAnimationSelect');
const parallaxSelect = document.getElementById('parallaxSelect');

// --- Color Picker ---
let colorInput = document.getElementById('lwb-color-picker');
if (!colorInput) {
  colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.id = 'lwb-color-picker';
  colorInput.style.position = 'absolute';
  colorInput.style.zIndex = 10002;
  colorInput.style.display = 'none';
  colorInput.style.width = '44px';
  colorInput.style.height = '44px';
  colorInput.style.borderRadius = '50%';
  colorInput.style.border = '2px solid #3387e6';
  colorInput.style.boxShadow = '0 4px 24px #8bc2ff38';
  document.body.appendChild(colorInput);
}
let colorTarget = null;

// --- Image Upload ---
let imageInput = document.getElementById('lwb-image-input');
if (!imageInput) {
  imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/*';
  imageInput.id = 'lwb-image-input';
  imageInput.style.display = 'none';
  document.body.appendChild(imageInput);
}
let imgTarget = null;

// --- List modules ---
function loadModuleList(filter = '') {
  moduleList.innerHTML = '';
  presetFiles
    .filter(f => f.toLowerCase().includes(filter.toLowerCase()))
    .forEach(file => {
      const li = document.createElement('li');
      li.className = 'uk-padding-small uk-background-muted uk-margin-small uk-border-rounded uk-flex uk-flex-middle';
      li.innerHTML = `<span uk-icon="file-text" class="uk-margin-small-right"></span>${file.replace('.html', '')}`;
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

// --- Drag/Drop Canvas ---
canvas.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
canvas.addEventListener('drop', e => {
  e.preventDefault();
  canvas.querySelector('.uk-text-center.uk-text-meta')?.remove();
  const file = e.dataTransfer.getData('text/plain');
  if (file) addModuleToCanvas(file);
});

// --- Add Module ---
function addModuleToCanvas(file) {
  fetch(`presets/${file}`)
    .then(r => r.text())
    .then(html => {
      const wrapper = document.createElement('div');
      wrapper.className = 'module-wrapper uk-margin uk-card uk-card-default uk-card-body uk-position-relative';
      wrapper.innerHTML = html;

      // Add visible remove button (not exported)
      const del = document.createElement('button');
      del.type = 'button';
      del.setAttribute('aria-label', 'Close');
      del.className = 'uk-close uk-close-large lwb-remove-btn uk-position-absolute';
      del.style.top = '15px';
      del.style.left = '15px';
      del.style.background = '#fff';
      del.style.border = '2px solid #e44';
      del.style.color = '#e44';
      del.style.opacity = '1';
      del.style.boxShadow = '0 3px 14px #e44a';
      del.style.width = '42px';
      del.style.height = '42px';
      del.style.borderRadius = '1em';
      del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
      wrapper.appendChild(del);

      wrapper.setAttribute('data-lwb-anim', '');
      wrapper.setAttribute('data-lwb-parallax', '');

      // Editable
      wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);

      // Color picker support
      wrapper.querySelectorAll('[data-color-editable]').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', colorEditHandler);
      });

      // Image upload/URL with icon
      wrapper.querySelectorAll('img.lwb-image, .lwb-image-placeholder').forEach(img => {
        img.style.cursor = 'pointer';
        img.onclick = imageClickHandler;
        if (!img.src) img.src = "https://getuikit.com/images/placeholder_600x400.svg";
      });

      // Double-click button: edit
      wrapper.querySelectorAll('button, a.uk-button').forEach(btn => {
        btn.ondblclick = buttonEditDialog;
      });

      // Place in canvas
      canvas.appendChild(wrapper);
      applyBlockAnimation(wrapper, '');
      applyBlockParallax(wrapper, '');
    });
}

// --- Animation: Per-block, assign on select ---
let animTarget = null;
canvas.addEventListener('click', e => {
  const wrapper = e.target.closest('.module-wrapper');
  if (wrapper) animTarget = wrapper;
});
animSelect.addEventListener('change', function() {
  if (!animTarget) {
    UIkit.notification('Click a block to select it first!', 'warning');
    return;
  }
  applyBlockAnimation(animTarget, animSelect.value);
  animTarget.setAttribute('data-lwb-anim', animSelect.value);
});
function applyBlockAnimation(wrapper, animation) {
  wrapper.classList.remove(
    'uk-animation-fade', 'uk-animation-scale-up',
    'uk-animation-slide-top-small', 'uk-animation-slide-bottom-small',
    'uk-animation-slide-left-small', 'uk-animation-slide-right-small'
  );
  if (animation) {
    wrapper.classList.add(animation);
    wrapper.style.animationDuration = "1.2s";
  } else {
    wrapper.style.animationDuration = "";
  }
}

// --- Parallax: Per-block ---
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
  applyBlockParallax(parallaxTarget, parallaxSelect.value);
  parallaxTarget.setAttribute('data-lwb-parallax', parallaxSelect.value);
});
function applyBlockParallax(wrapper, value) {
  wrapper.removeAttribute('uk-parallax');
  if (wrapper._parallax) { wrapper._parallax.$destroy(true); delete wrapper._parallax; }
  if (value) {
    wrapper.setAttribute('uk-parallax', value);
    UIkit.parallax(wrapper);
  }
}

// --- Color picker: On click for [data-color-editable] ---
function colorEditHandler(e) {
  colorTarget = e.target;
  let prop = colorTarget.getAttribute('data-color-editable') === 'background' ? 'backgroundColor' : 'color';
  let style = getComputedStyle(colorTarget)[prop];
  let hex = "#ffffff";
  if (style.startsWith("rgb")) {
    const vals = style.match(/\d+/g);
    if (vals) hex = '#' + ((1<<24) + (+vals[0]<<16) + (+vals[1]<<8) + +vals[2]).toString(16).slice(1);
  } else if (style.startsWith("#")) {
    hex = style;
  }
  colorInput.value = hex;
  const r = colorTarget.getBoundingClientRect();
  colorInput.style.left = `${r.right + 8 + window.scrollX}px`;
  colorInput.style.top = `${r.top + window.scrollY}px`;
  colorInput.style.display = 'block';
  colorInput.focus();
  e.stopPropagation();
}
colorInput.addEventListener('input', () => {
  if (colorTarget) {
    const prop = colorTarget.getAttribute('data-color-editable') === 'background' ? 'backgroundColor' : 'color';
    colorTarget.style[prop] = colorInput.value;
  }
});
colorInput.addEventListener('blur', () => {
  colorInput.style.display = 'none';
  colorTarget = null;
});

// --- UIkit image upload ---
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

// --- Button edit: text + url (in UIkit modal) ---
function buttonEditDialog(e) {
  e.preventDefault();
  const btn = e.target.closest('button, a.uk-button');
  if (!btn) return;
  let currentText = btn.textContent.trim();
  let currentUrl = "";
  let link = btn.closest('a.uk-button') || btn.closest('a');
  if (link && link.hasAttribute('href')) currentUrl = link.getAttribute('href');

const formHtml = `
  <form class="uk-form-stacked" style="padding:2em 1.2em;max-width:420px;margin:auto;">
    <h4 class="uk-margin-small-bottom uk-text-primary">Edit Button</h4>
    <div class="uk-margin">
      <label class="uk-form-label">Button Text</label>
      <input class="uk-input uk-border-rounded" id="lwb-btn-text" value="${currentText.replace(/"/g, "&quot;")}" type="text" autofocus placeholder="Button Text">
    </div>
    <div class="uk-margin">
      <label class="uk-form-label">Button Link URL</label>
      <input class="uk-input uk-border-rounded" id="lwb-btn-url" value="${currentUrl.replace(/"/g, "&quot;")}" type="text" placeholder="https://…">
    </div>
    <div class="uk-flex uk-flex-between uk-margin-top">
      <button class="uk-button uk-button-default uk-border-rounded" type="button" id="lwb-btn-cancel">Cancel</button>
      <button class="uk-button uk-button-primary uk-border-rounded" type="button" id="lwb-btn-ok">Save</button>
    </div>
  </form>
`;

  const modal = UIkit.modal.dialog(formHtml, {
    bgClose: true,
    escClose: true
  });
  setTimeout(() => {
    const textInput = document.getElementById('lwb-btn-text');
    const urlInput = document.getElementById('lwb-btn-url');
    const okBtn = document.getElementById('lwb-btn-ok');
    const cancelBtn = document.getElementById('lwb-btn-cancel');
    textInput.focus();
    okBtn.onclick = () => {
      btn.textContent = textInput.value;
      if (link) link.setAttribute('href', urlInput.value);
      modal.hide();
    };
    cancelBtn.onclick = () => modal.hide();
  }, 80);
  return false;
}

// --- Save/Load/Export ---
saveBtn.onclick = () => {
  const data = Array.from(canvas.querySelectorAll('.module-wrapper')).map(m => ({
    html: m.innerHTML,
    anim: m.getAttribute('data-lwb-anim') || "",
    parallax: m.getAttribute('data-lwb-parallax') || ""
  }));
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
        wrapper.className = 'module-wrapper uk-margin uk-card uk-card-default uk-card-body uk-position-relative';
        wrapper.innerHTML = m.html;

        // Remove button
        const del = document.createElement('button');
        del.type = 'button';
        del.setAttribute('aria-label', 'Close');
        del.className = 'uk-close uk-close-large lwb-remove-btn uk-position-absolute';
        del.style.top = '15px';
        del.style.left = '15px';
        del.style.background = '#fff';
        del.style.border = '2px solid #e44';
        del.style.color = '#e44';
        del.style.opacity = '1';
        del.style.boxShadow = '0 3px 14px #e44a';
        del.style.width = '42px';
        del.style.height = '42px';
        del.style.borderRadius = '1em';
        del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
        wrapper.appendChild(del);

        wrapper.setAttribute('data-lwb-anim', m.anim || "");
        wrapper.setAttribute('data-lwb-parallax', m.parallax || "");

        wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
        wrapper.querySelectorAll('[data-color-editable]').forEach(el => {
          el.style.cursor = 'pointer';
          el.addEventListener('click', colorEditHandler);
        });
        wrapper.querySelectorAll('img.lwb-image, .lwb-image-placeholder').forEach(img => {
          img.style.cursor = 'pointer';
          img.onclick = imageClickHandler;
        });
        wrapper.querySelectorAll('button, a.uk-button').forEach(btn => btn.ondblclick = buttonEditDialog);

        applyBlockAnimation(wrapper, m.anim);
        applyBlockParallax(wrapper, m.parallax);

        canvas.appendChild(wrapper);
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
    clone.querySelectorAll('.lwb-remove-btn').forEach(b => b.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.removeAttribute('data-lwb-anim');
    clone.removeAttribute('data-lwb-parallax');
    let anim = m.getAttribute('data-lwb-anim');
    if (anim) {
      clone.classList.add(anim);
      clone.style.animationDuration = "1.2s";
    }
    let parallax = m.getAttribute('data-lwb-parallax');
    if (parallax) clone.setAttribute('uk-parallax', parallax);
    bodyContent += clone.outerHTML;
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