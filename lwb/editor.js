// === UIkit Website Editor - Clean, Feature Complete ===

// --- Config: List all preset modules here (by file name) ---
const presetFiles = ['hero.html', 'card.html', 'image.html'];

// --- Get Elements ---
const moduleList = document.getElementById('module-list');
const canvas = document.getElementById('canvas');
const search = document.getElementById('search');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const animSelect = document.getElementById('textAnimationSelect');
const parallaxSelect = document.getElementById('parallaxSelect');

// --- Image Upload Helper ---
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

// --- Color Picker Helper ---
let colorInput = document.getElementById('lwb-color-picker');
if (!colorInput) {
  colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.id = 'lwb-color-picker';
  colorInput.style.position = 'absolute';
  colorInput.style.display = 'none';
  colorInput.style.width = '40px';
  colorInput.style.height = '40px';
  colorInput.style.border = '2px solid #1787fc';
  colorInput.style.borderRadius = '50%';
  colorInput.style.zIndex = 99999;
  colorInput.style.boxShadow = '0 2px 16px #1787fc22';
  document.body.appendChild(colorInput);
}
let colorTarget = null;

// --- Load Module List ---
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

// --- Add Preset Module to Canvas ---
function addModuleToCanvas(file) {
  fetch(`presets/${file}`)
    .then(r => r.text())
    .then(html => {
      const wrapper = document.createElement('div');
      wrapper.className = 'module-wrapper uk-margin uk-card uk-card-default uk-card-body uk-position-relative';
      wrapper.innerHTML = html;

      // Add UIkit remove button (not exported)
      const del = document.createElement('button');
      del.type = 'button';
      del.setAttribute('aria-label', 'Close');
      del.className = 'uk-close uk-close-large uk-position-absolute lwb-remove-btn';
      del.style.top = '15px';
      del.style.left = '15px';
      del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
      wrapper.appendChild(del);

      // Mark for animation/parallax (per block)
      wrapper.setAttribute('data-lwb-anim', '');
      wrapper.setAttribute('data-lwb-parallax', '');

      // Content Editable Fields
      wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);

      // [data-color-editable] for color picking
      wrapper.querySelectorAll('[data-color-editable]').forEach(el => {
        el.style.cursor = 'pointer';
      });

      // UIkit-style image placeholder
      wrapper.querySelectorAll('.lwb-image, .lwb-image-placeholder').forEach(img => {
        img.style.cursor = 'pointer';
        img.onclick = imageClickHandler;
        if (!img.src) img.src = "https://getuikit.com/images/placeholder_600x400.svg";
      });

      // Assign click for buttons
      wrapper.querySelectorAll('button, a.uk-button').forEach(btn => {
        btn.ondblclick = buttonEditDialog;
      });

      // Add to canvas
      canvas.appendChild(wrapper);

      // Animation/parallax per block (nothing assigned initially)
      applyBlockAnimation(wrapper, '');
      applyBlockParallax(wrapper, '');
    });
}

// --- Per-Block Animation Assign ---
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

// --- Per-Block Parallax Assign ---
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

// --- Color Picker: On Click for Any [data-color-editable] ---
canvas.addEventListener('click', e => {
  // Color
  const colorEl = e.target.closest('[data-color-editable]');
  if (colorEl) {
    colorTarget = colorEl;
    let prop = colorEl.getAttribute('data-color-editable') === 'background' ? 'backgroundColor' : 'color';
    let style = getComputedStyle(colorEl)[prop];
    let hex = "#ffffff";
    if (style.startsWith("rgb")) {
      const vals = style.match(/\d+/g);
      if (vals) hex = '#' + ((1<<24) + (+vals[0]<<16) + (+vals[1]<<8) + +vals[2]).toString(16).slice(1);
    } else if (style.startsWith("#")) {
      hex = style;
    }
    colorInput.value = hex;
    const r = colorEl.getBoundingClientRect();
    colorInput.style.left = `${r.right + 8 + window.scrollX}px`;
    colorInput.style.top = `${r.top + window.scrollY}px`;
    colorInput.style.display = 'block';
    colorInput.focus();
    return;
  } else {
    colorInput.style.display = 'none';
    colorTarget = null;
  }
});
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

// --- UIkit Image Upload + Icon ---
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

// --- UIkit Modal For Button (and Link) Edit ---
function buttonEditDialog(e) {
  e.preventDefault();
  const btn = e.target.closest('button, a.uk-button');
  if (!btn) return;
  let currentText = btn.textContent;
  let currentUrl = "";
  let link = btn.closest('a.uk-button') || btn.closest('a');
  if (link && link.hasAttribute('href')) currentUrl = link.getAttribute('href');

  const formHtml = `
    <div class="uk-margin">
      <label class="uk-form-label">Button Text</label>
      <input class="uk-input" id="lwb-btn-text" value="${currentText.replace(/"/g, "&quot;")}" type="text">
    </div>
    <div class="uk-margin">
      <label class="uk-form-label">Button Link URL</label>
      <input class="uk-input" id="lwb-btn-url" value="${currentUrl.replace(/"/g, "&quot;")}" type="text">
    </div>
  `;
  const modal = UIkit.modal.dialog(`<form onsubmit="return false">${formHtml}</form>`, {
    bgClose: false,
    escClose: true
  });
  setTimeout(() => {
    const textInput = document.getElementById('lwb-btn-text');
    const urlInput = document.getElementById('lwb-btn-url');
    textInput.focus(); textInput.select();

    [textInput, urlInput].forEach(input => {
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          modal.hide();
          btn.textContent = textInput.value;
          if (link) link.setAttribute('href', urlInput.value);
        }
      });
    });
    modal.$el.on('hidden', () => {
      btn.textContent = textInput.value;
      if (link) link.setAttribute('href', urlInput.value);
    });
  }, 100);
  return false;
}

// --- Save, Load, Export ---
// Save (JSON, UIkit-notification)
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
// Load
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

        // Remove button (UIkit, not exported)
        const del = document.createElement('button');
        del.type = 'button';
        del.setAttribute('aria-label', 'Close');
        del.className = 'uk-close uk-close-large uk-position-absolute lwb-remove-btn';
        del.style.top = '15px';
        del.style.left = '15px';
        del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
        wrapper.appendChild(del);

        wrapper.setAttribute('data-lwb-anim', m.anim || "");
        wrapper.setAttribute('data-lwb-parallax', m.parallax || "");

        // Editable and interactive fields
        wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
        wrapper.querySelectorAll('[data-color-editable]').forEach(el => el.style.cursor = 'pointer');
        wrapper.querySelectorAll('.lwb-image, .lwb-image-placeholder').forEach(img => {
          img.style.cursor = 'pointer';
          img.onclick = imageClickHandler;
        });
        wrapper.querySelectorAll('button, a.uk-button').forEach(btn => btn.ondblclick = buttonEditDialog);

        // Anim/parallax
        applyBlockAnimation(wrapper, m.anim);
        applyBlockParallax(wrapper, m.parallax);

        canvas.appendChild(wrapper);
      });
      UIkit.notification('Loaded!', 'primary');
    } catch { UIkit.notification('Import failed.', 'danger'); }
  };
  r.readAsText(f);
};
// Export (HTML) - NO remove btn, NO editor meta
exportBtn.onclick = async () => {
  let uikitCSS = '';
  try { uikitCSS = await fetch('https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/css/uikit.min.css').then(r => r.text()); } catch{}
  let bodyContent = '';
  document.querySelectorAll('.module-wrapper').forEach(m => {
    const clone = m.cloneNode(true);
    // Remove all remove buttons
    clone.querySelectorAll('.lwb-remove-btn').forEach(b => b.remove());
    // Remove contenteditable
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    // Remove editor meta attrs
    clone.removeAttribute('data-lwb-anim');
    clone.removeAttribute('data-lwb-parallax');
    // Export animation/parallax only if set
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