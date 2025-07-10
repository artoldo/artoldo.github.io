// --- Module presets ---
const presetFiles = [
  'hero.html','navbar.html','grid-2col.html','card.html',
  'slider.html','accordion.html','modal.html','form.html','footer.html'
];

// --- DOM elements ---
const moduleList = document.getElementById('module-list');
const canvas = document.getElementById('canvas');
const search = document.getElementById('search');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');

// --- Live color picker ---
let colorInput = document.getElementById('lwb-color-picker');
if (!colorInput) {
  colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.id = 'lwb-color-picker';
  document.body.appendChild(colorInput);
}
let colorTarget = null;

// --- Image upload helper ---
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

// --- Rich text toolbar (bold, italic, links, headings) ---
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

// --- List modules in sidebar, filter by search ---
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

// --- Drag/drop canvas setup ---
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

// --- Make all contenteditable areas editable ---
function makeEditableAll() {
  document.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
}

// --- Add a module (preset) to the canvas ---
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

      // Remove any submit action on forms inside this module
      wrapper.querySelectorAll('form').forEach(form => {
        form.onsubmit = e => { e.preventDefault(); return false; };
      });

      // Main block close (always circular)
      const del = document.createElement('button');
      del.textContent = '×';
      del.className = 'uk-button uk-button-danger uk-button-small uk-position-top-right';
      del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
      wrapper.appendChild(del);

      // All text editable
      wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);

      // Forms: submit button editable
      wrapper.querySelectorAll('button[type="submit"]').forEach(btn => btn.setAttribute('data-editable', ''));

      // Accordions: apply editable/drag/removal setup
      makeAccordionEditable(wrapper);

      // Add to canvas
      canvas.appendChild(wrapper);

      // Animate text, padding
      animateAllTextElements();
      setGlobalBlockPadding(paddingRange.value, false);
      makeEditableAll();
    })
    .catch(err => {
      UIkit.notification(err.message, 'danger');
      console.error(err);
    });
}

// --- ACCORDION: only a single "+" (centered), red circular "-" per section, drag by header ---
function makeAccordionEditable(wrapper) {
  wrapper.querySelectorAll('.uk-accordion').forEach(acc => {
    // Ensure only one add button
    acc.parentElement.querySelectorAll('.lwb-acc-add').forEach(btn => btn.remove());
    const addBtn = document.createElement('button');
    addBtn.innerHTML = '<span uk-icon="plus"></span>';
    addBtn.className = 'uk-button uk-button-primary lwb-acc-add';
    addBtn.style.display = 'block';
    addBtn.style.margin = '1.2em auto 0 auto';
    addBtn.style.borderRadius = '50%';
    addBtn.style.width = '38px';
    addBtn.style.height = '38px';
    addBtn.style.padding = '0';
    addBtn.onclick = () => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div style="position:relative;">
          <a class="uk-accordion-title" href="#" data-editable>New Section</a>
          <button class="uk-button uk-button-danger uk-button-small lwb-acc-remove" 
            style="position:absolute;right:-48px;top:50%;transform:translateY(-50%);width:30px;height:30px;border-radius:50%;">–</button>
        </div>
        <div class="uk-accordion-content"><p data-editable>New content…</p></div>
      `;
      acc.appendChild(li);
      makeAccordionEditable(wrapper);
      makeEditableAll();
    };
    acc.parentElement.appendChild(addBtn);

    // Remove/replace all delete buttons (right side, circle minus)
    acc.querySelectorAll('li').forEach(li => {
      // Remove old delete
      li.querySelectorAll('.lwb-acc-remove').forEach(btn => btn.remove());
      // Add red minus (right)
      const headerDiv = li.querySelector('.uk-accordion-title')?.parentElement;
      if (headerDiv && !headerDiv.querySelector('.lwb-acc-remove')) {
        const remBtn = document.createElement('button');
        remBtn.innerHTML = '–';
        remBtn.className = 'uk-button uk-button-danger uk-button-small lwb-acc-remove';
        remBtn.style.position = 'absolute';
        remBtn.style.right = '-48px';
        remBtn.style.top = '50%';
        remBtn.style.transform = 'translateY(-50%)';
        remBtn.style.width = '30px';
        remBtn.style.height = '30px';
        remBtn.style.borderRadius = '50%';
        remBtn.onclick = e => { e.stopPropagation(); li.remove(); };
        headerDiv.appendChild(remBtn);
      }
      li.style.position = 'relative';
    });

    // Make sections draggable
    if (!acc.lwbSortable) {
      new Sortable(acc, {
        handle: '.uk-accordion-title',
        animation: 150,
        ghostClass: 'uk-background-muted',
        draggable: 'li'
      });
      acc.lwbSortable = true;
    }
  });
}

// --- COLOR PICKER: double click to show, click to hide ---
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
    // Position the color picker
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

// --- IMAGE PLACEHOLDER: click to set image ---
canvas.addEventListener('click', e => {
  // For image placeholders (blue box)
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
  // For <img> elements
  if (e.target.tagName === 'IMG') {
    imgTarget = e.target;
    UIkit.modal.prompt('Paste image URL or click OK to upload:', '', function(val) {
      if (val && val.trim()) {
        imgTarget.src = val.trim();
      } else {
        imageInput.click();
      }
    });
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

// --- FORM BUTTONS & PLACEHOLDERS ARE EDITABLE ---
canvas.addEventListener('dblclick', e => {
  // Editable placeholders (on input, textarea with data-editable-placeholder)
  const input = e.target.closest('[data-editable-placeholder]');
  if (input) {
    e.preventDefault();
    const current = input.getAttribute('placeholder') || '';
    UIkit.modal.prompt('Edit placeholder:', current, val => {
      if (val !== null) input.setAttribute('placeholder', val);
    });
    return;
  }
  // Editable button (including submit)
  if (e.target.tagName === 'BUTTON' && e.target.hasAttribute('data-editable')) {
    e.preventDefault();
    const current = e.target.textContent;
    UIkit.modal.prompt('Edit button text:', current, val => {
      if (val !== null) e.target.textContent = val;
    });
    return;
  }
  // Editable link
  let a = null;
  if (e.target.tagName === 'A') a = e.target;
  else if (e.target.closest('a')) a = e.target.closest('a');
  if (a && a.hasAttribute('href')) {
    e.preventDefault();
    UIkit.modal.prompt('Edit link URL:', a.getAttribute('href') || '', function(val){
      if (val && val.trim()) a.setAttribute('href', val.trim());
    });
    return;
  }
});

// --- Rich text toolbar for [data-editable] areas ---
let lwbSelEditable = null;
document.addEventListener('selectionchange', function() {
  const sel = window.getSelection();
  if (!sel.rangeCount) {
    lwbToolbar.style.display = 'none';
    lwbSelEditable = null;
    return;
  }
  const range = sel.getRangeAt(0);
  const parent = range.startContainer.parentElement;
  const editable = parent && parent.closest('[data-editable]');
  if (
    editable && sel.toString().trim() &&
    editable.contains(sel.anchorNode) && editable.contains(sel.focusNode)
  ) {
    lwbSelEditable = editable;
    const rect = range.getBoundingClientRect();
    lwbToolbar.style.left = `${rect.left + window.scrollX}px`;
    lwbToolbar.style.top = `${rect.top + window.scrollY - 44}px`;
    lwbToolbar.style.display = 'flex';
  } else {
    lwbToolbar.style.display = 'none';
    lwbSelEditable = null;
  }
});
document.addEventListener('click', e => {
  if (!lwbToolbar.contains(e.target)) {
    lwbToolbar.style.display = 'none';
  }
});
lwbToolbar.addEventListener('mousedown', function(e) {
  e.preventDefault(); // So selection doesn't collapse
});
lwbToolbar.addEventListener('click', function(e) {
  const btn = e.target.closest('button[data-cmd]');
  if (!btn) return;
  const cmd = btn.getAttribute('data-cmd');
  if (!lwbSelEditable) return;
  lwbSelEditable.focus();
  if (cmd === 'bold' || cmd === 'italic') {
    document.execCommand(cmd, false, null);
  } else if (cmd === 'link') {
    let url = prompt('Enter URL:');
    if (url) document.execCommand('createLink', false, url);
  } else if (cmd === 'unlink') {
    document.execCommand('unlink', false, null);
  } else if (cmd.startsWith('formatBlock-')) {
    let block = cmd.split('-')[1];
    document.execCommand('formatBlock', false, block);
  }
  lwbToolbar.style.display = 'none';
});

// --- Padding control ---
const paddingRange = document.getElementById('paddingRange');
const paddingValue = document.getElementById('paddingValue');
function setGlobalBlockPadding(val, animate = true) {
  document.querySelectorAll('.module-wrapper').forEach(block => {
    block.style.transition = animate
      ? 'padding 0.22s cubic-bezier(.47,1.64,.41,.8)'
      : '';
    block.style.padding = `${val}px 1.5em ${val}px 1.5em`;
  });
}
paddingRange.addEventListener('input', e => {
  const val = parseInt(e.target.value, 10);
  paddingValue.textContent = `${val}px`;
  setGlobalBlockPadding(val, true);
});
window.addEventListener('DOMContentLoaded', () => {
  setGlobalBlockPadding(parseInt(paddingRange.value, 10), false);
  animateAllTextElements();
  makeEditableAll();
});

// --- Text animation control ---
const textAnimationSelect = document.getElementById('textAnimationSelect');
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
  });
}
textAnimationSelect.addEventListener('change', e => {
  currentTextAnimation = e.target.value;
  updateTextAnimations();
});
function animateAllTextElements(animationClass = currentTextAnimation) {
  canvas.querySelectorAll('h1, h2, h3, h4, p, [data-editable]').forEach(el => {
    el.classList.add(animationClass);
  });
}

// --- Save/load/export (no changes needed) ---
function getSiteData() {
  return Array.from(canvas.querySelectorAll('.module-wrapper')).map(m => ({ html: m.innerHTML }));
}
saveBtn.onclick = () => {
  const data = JSON.stringify(getSiteData());
  localStorage.setItem('site', data);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'website-project.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  UIkit.notification('Project saved (and downloaded)!');
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
        // Remove submit actions
        wrapper.querySelectorAll('form').forEach(form => {
          form.onsubmit = e => { e.preventDefault(); return false; };
        });
        // Module delete btn
        wrapper.querySelectorAll('button').forEach(btn => {
          if(btn.textContent==='×') btn.onclick = e => wrapper.remove();
        });
        wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
        makeAccordionEditable(wrapper);
        canvas.appendChild(wrapper);
      });
      animateAllTextElements();
      setGlobalBlockPadding(paddingRange.value, false);
      makeEditableAll();
      UIkit.notification('Project loaded!');
    } catch {
      UIkit.notification('Import failed.', 'danger');
    }
  };
  r.readAsText(f);
};

// --- Export: UIkit CSS, custom CSS, and dynamic inline styles ---
exportBtn.onclick = async () => {
  // 1. Fetch UIkit CSS
  let uikitCSS = '';
  try {
    uikitCSS = await fetch('https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/css/uikit.min.css').then(r => r.text());
  } catch(e) {
    uikitCSS = '';
  }

  // 2. Fetch your custom style.css (if you have one)
  let customCSS = '';
  try {
    customCSS = await fetch('style.css').then(r => r.text());
  } catch(e) {
    customCSS = '';
  }

  // 3. Collect dynamic color styles and paddings
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
    // Padding for each block (if not default)
    const pad = m.style.padding;
    if (pad) {
      styleCounter++;
      const uniqueBlockClass = `lwb-blockpad-${styleCounter}`;
      m.classList.add(uniqueBlockClass);
      dynamicCSS += `.${uniqueBlockClass} { padding: ${pad} !important; }\n`;
    }
  });

  // 4. Remove all editor-only controls for export
  let bodyContent = '';
  document.querySelectorAll('.module-wrapper').forEach(m => {
    const clone = m.cloneNode(true);
    clone.querySelectorAll('button.uk-button-danger, .uk-position-top-right, .lwb-acc-add, .lwb-acc-remove').forEach(b => b.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    // Remove any leftover form submit handler
    clone.querySelectorAll('form').forEach(form => form.removeAttribute('onsubmit'));
    bodyContent += clone.innerHTML;
  });

  // 5. Compose the exported HTML
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
</head>
<body>
${bodyContent}
</body>
</html>`;

  // 6. Download as file
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