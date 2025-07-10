// --- DOM Elements & Presets ---
const presetFiles = [
  'hero.html', 'card.html', 'image.html'
];
const moduleList = document.getElementById('module-list');
const canvas = document.getElementById('canvas');
const search = document.getElementById('search');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const textAnimationSelect = document.getElementById('textAnimationSelect');
const parallaxSelect = document.getElementById('parallaxSelect');

// --- Color Picker ---
let colorInput = document.getElementById('lwb-color-picker');
if (!colorInput) {
  colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.id = 'lwb-color-picker';
  document.body.appendChild(colorInput);
}
let colorTarget = null;

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

// --- Rich Text Toolbar ---
let lwbToolbar = document.getElementById('lwb-toolbar');
if (!lwbToolbar) {
  lwbToolbar = document.createElement('div');
  lwbToolbar.id = 'lwb-toolbar';
  lwbToolbar.innerHTML = `
    <button data-cmd="bold" title="Bold"><b>B</b></button>
    <button data-cmd="italic" title="Italic"><i>I</i></button>
    <button data-cmd="link" title="Add Link">🔗</button>
    <button data-cmd="unlink" title="Remove Link">✖️</button>
    <button data-cmd="formatBlock-h1" title="H1">H1</button>
    <button data-cmd="formatBlock-h2" title="H2">H2</button>
    <button data-cmd="formatBlock-h3" title="H3">H3</button>
    <button data-cmd="formatBlock-h4" title="H4">H4</button>
    <button data-cmd="formatBlock-p" title="Paragraph">P</button>
  `;
  document.body.appendChild(lwbToolbar);
}
lwbToolbar.style.display = 'none';

// --- Module List Logic ---
function loadModuleList(filter = '') {
  moduleList.innerHTML = '';
  presetFiles
    .filter(f => f.toLowerCase().includes(filter.toLowerCase()))
    .forEach(file => {
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
search.addEventListener('input', () => loadModuleList(search.value));
loadModuleList();

// --- Drag/Drop Canvas Setup ---
canvas.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
canvas.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.getData('text/plain');
  const placeholder = canvas.querySelector('.uk-text-center.uk-text-meta');
  if (placeholder) placeholder.remove();
  if (file) addModuleToCanvas(file);
});

// --- Content Editable Helper ---
function makeEditableAll() {
  document.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
}

// --- Add Module/Preset to Canvas ---
function addModuleToCanvas(file) {
  fetch(`presets/${file}`)
    .then(r => {
      if (!r.ok) throw new Error("Preset not found: " + file);
      return r.text();
    })
    .then(html => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('module-wrapper','uk-margin');
      wrapper.innerHTML = html;

      // Place main close button at the left, always circular
      const del = document.createElement('button');
      del.textContent = '×';
      del.className = 'uk-button uk-button-danger uk-button-small uk-position-top-left';
      del.style.left = '-1.6em';
      del.style.top = '1.1em';
      del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
      wrapper.appendChild(del);

      // All text editable
      wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);

      // Add to canvas
      canvas.appendChild(wrapper);

      // Animate text
      animateAllTextElements();

      // Re-initialize UIkit Parallax if needed
      if (wrapper.hasAttribute('uk-parallax')) {
        UIkit.parallax(wrapper);
      }
      makeEditableAll();
    })
    .catch(err => {
      UIkit.notification(err.message, 'danger');
      console.error(err);
    });
}

// --- Color Picker Logic ---
canvas.addEventListener('dblclick', e => {
  const el = e.target.closest('[data-color-editable]');
  if (el) {
    colorTarget = el;
    const prop = el.getAttribute('data-color-editable') === 'background' ? 'backgroundColor' : 'color';
    const style = getComputedStyle(el)[prop];
    let hex = "#ffffff";
    if (style.startsWith("rgb")) {
      const vals = style.match(/\d+/g);
      if (vals) hex = '#' + ((1<<24) + (+vals[0]<<16) + (+vals[1]<<8) + +vals[2]).toString(16).slice(1);
    } else if (style.startsWith("#")) {
      hex = style;
    }
    colorInput.value = hex;
    const r = el.getBoundingClientRect();
    colorInput.style.left = `${r.right + 12 + window.scrollX}px`;
    colorInput.style.top = `${r.top + window.scrollY}px`;
    colorInput.style.display = 'block';
    colorInput.focus();
    e.preventDefault();
  }
});
canvas.addEventListener('click', e => {
  colorInput.style.display = 'none';
  colorTarget = null;
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

// --- Image Placeholder Logic ---
canvas.addEventListener('click', e => {
  const placeholder = e.target.closest('.lwb-image-placeholder');
  if (placeholder) {
    imgTarget = placeholder;
    UIkit.modal.prompt('Paste image URL or click OK to upload:', '', function(val) {
      if (val && val.trim()) {
        replacePlaceholderWithImage(placeholder, val.trim());
      } else {
        imageInput.click();
      }
    });
    return;
  }
  if (e.target.tagName === 'BUTTON' && e.target.hasAttribute('data-editable')) {
  e.preventDefault();
  const currentText = e.target.textContent;
  let currentUrl = "";
  // If the button is actually an <a>, or wrapped by <a>
  let btnLink = e.target.closest('a');
  if (btnLink && btnLink.hasAttribute('href')) {
    currentUrl = btnLink.getAttribute('href');
  }

  // Show a custom modal for both text and URL
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

  // Wait for modal to be shown, then set up handler
  setTimeout(() => {
    const textInput = document.getElementById('lwb-btn-text');
    const urlInput = document.getElementById('lwb-btn-url');
    textInput.focus();
    textInput.select();

    // Listen for Enter key (on either input)
    [textInput, urlInput].forEach(input => {
      input.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          modal.hide();
          // Set text
          e.target.textContent = textInput.value;
          // Set URL if possible
          if (btnLink && urlInput.value) {
            btnLink.setAttribute('href', urlInput.value);
          }
        }
      });
    });

    // On modal hide, set values
    modal.$el.on('hidden', () => {
      // Set text
      e.target.textContent = textInput.value;
      // Set URL if possible
      if (btnLink && urlInput.value) {
        btnLink.setAttribute('href', urlInput.value);
      }
    });
  }, 100);
  return;
}
});
imageInput.onchange = () => {
  if (!imgTarget) return;
  if (imageInput.files && imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      if (imgTarget.classList && imgTarget.classList.contains('lwb-image-placeholder')) {
        replacePlaceholderWithImage(imgTarget, e.target.result);
      } else if (imgTarget.tagName === 'IMG') {
        imgTarget.src = e.target.result;
      }
    };
    reader.readAsDataURL(imageInput.files[0]);
  }
};
function replacePlaceholderWithImage(placeholder, src) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Image';
  img.style.width = placeholder.style.width || '100%';
  img.style.height = placeholder.style.height || 'auto';
  img.style.borderRadius = placeholder.style.borderRadius || '1em';
  img.style.display = 'block';
  img.style.objectFit = 'cover';
  img.style.cursor = 'pointer';
  img.addEventListener('click', function(e) {
    e.stopPropagation();
    imgTarget = img;
    UIkit.modal.prompt('Paste image URL or click OK to upload:', '', function(val) {
      if (val && val.trim()) {
        img.src = val.trim();
      } else {
        imageInput.click();
      }
    });
  });
  placeholder.parentNode.replaceChild(img, placeholder);
}

// --- Rich Text Toolbar (as before, no change) ---

// --- UIkit Text Animation ---
let currentTextAnimation = textAnimationSelect.value;
function updateTextAnimations() {
  canvas.querySelectorAll('h1, h2, h3, h4, p, [data-editable]').forEach(el => {
    el.classList.remove(
      'uk-animation-fade',
      'uk-animation-scale-up',
      'uk-animation-slide-top-small',
      'uk-animation-slide-bottom-small',
      'uk-animation-slide-left-small',
      'uk-animation-slide-right-small'
    );
    el.classList.add(currentTextAnimation);
    void el.offsetWidth;
    el.style.animationDuration = "1.15s";
    el.style.transitionDuration = "0.85s";
  });
}
textAnimationSelect.addEventListener('change', e => {
  currentTextAnimation = e.target.value;
  updateTextAnimations();
});
function animateAllTextElements(animationClass = currentTextAnimation) {
  canvas.querySelectorAll('h1, h2, h3, h4, p, [data-editable]').forEach(el => {
    el.classList.add(animationClass);
    el.style.animationDuration = "1.15s";
    el.style.transitionDuration = "0.85s";
  });
}

// --- Save/Load/Export logic ---
saveBtn.onclick = () => {
  const data = Array.from(canvas.querySelectorAll('.module-wrapper')).map(m => ({
    html: m.innerHTML
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "site.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  UIkit.notification('Saved as JSON file!', 'success');
};
loadBtn.onclick = () => {
  importFile.value = '';
  importFile.click();
};
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
        // Restore controls/events:
        wrapper.querySelectorAll('button.uk-button-danger').forEach(btn => {
          btn.onclick = e => { e.stopPropagation(); wrapper.remove(); };
        });
        wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
        // Parallax re-init if present
        if (wrapper.hasAttribute('uk-parallax')) {
          UIkit.parallax(wrapper);
        }
        canvas.appendChild(wrapper);
      });
      animateAllTextElements();
      makeEditableAll();
      UIkit.notification('Loaded!', 'primary');
    } catch {
      UIkit.notification('Import failed.', 'danger');
    }
  };
  r.readAsText(f);
};
exportBtn.onclick = async () => {
  // 1. Fetch UIkit CSS
  let uikitCSS = '';
  try {
    uikitCSS = await fetch('https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/css/uikit.min.css').then(r => r.text());
  } catch(e) { uikitCSS = ''; }
  // 2. Fetch your custom CSS
  let customCSS = '';
  try {
    customCSS = await fetch('style.css').then(r => r.text());
  } catch(e) { customCSS = ''; }
  // 3. Collect dynamic styles (colors, etc.)
  let dynamicCSS = '';
  let styleCounter = 0;
  document.querySelectorAll('.module-wrapper').forEach(m => {
    m.querySelectorAll('[data-color-editable]').forEach(el => {
      styleCounter++;
      const uniqueClass = `lwb-dyn-${styleCounter}`;
      el.classList.add(uniqueClass);
      const prop = el.getAttribute('data-color-editable') === 'background' ? 'background-color' : 'color';
      const value = el.style[prop];
      if (value) {
        dynamicCSS += `.${uniqueClass} { ${prop}: ${value} !important; }\n`;
      }
    });
  });
  // 4. Export content: strip only editor controls, keep all attributes (incl. uk-parallax)
  let bodyContent = '';
  document.querySelectorAll('.module-wrapper').forEach(m => {
    const clone = m.cloneNode(true);
    clone.querySelectorAll('button.uk-button-danger, .uk-position-top-right, .uk-position-top-left, #lwb-toolbar').forEach(b => b.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    // DO NOT remove or touch uk-parallax or other UIkit attributes!
    bodyContent += clone.innerHTML;
  });
  // 5. Compose final HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
  ${uikitCSS}
  ${customCSS}
  ${dynamicCSS}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/js/uikit.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/js/uikit-icons.min.js"></script>
</head>
<body>
${bodyContent}
</body>
</html>`;
  // 6. Download
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download='site.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  UIkit.notification('Exported as HTML!', 'success');
};

// --- Parallax (block level only, recommended) ---
let parallaxTarget = null;
canvas.addEventListener('click', function(e) {
  let wrapper = e.target.closest('.module-wrapper');
  if (wrapper) {
    parallaxTarget = wrapper;
  }
});
parallaxSelect.addEventListener('change', function(e) {
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