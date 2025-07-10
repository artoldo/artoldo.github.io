// --- Globals & Presets ---
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

const paddingRange = document.getElementById('paddingRange');
const paddingValue = document.getElementById('paddingValue');
const marginRange = document.getElementById('marginRange');
const marginValue = document.getElementById('marginValue');
const textAnimationSelect = document.getElementById('textAnimationSelect');

// --- Image input for all image uploads ---
let lwbImageInput = document.getElementById('lwb-image-input');
if (!lwbImageInput) {
  lwbImageInput = document.createElement('input');
  lwbImageInput.type = 'file';
  lwbImageInput.accept = 'image/*';
  lwbImageInput.style.display = 'none';
  lwbImageInput.id = 'lwb-image-input';
  document.body.appendChild(lwbImageInput);
}
let lwbImgTarget = null;

// --- Load & Filter Module List ---
function loadModuleList(filter = '') {
  moduleList.innerHTML = '';
  presetFiles.filter(f => f.toLowerCase().includes(filter.toLowerCase())).forEach(file => {
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

// --- Canvas Drag/Drop ---
canvas.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
canvas.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.getData('text/plain');
  if (file) addModuleToCanvas(file);
});

// --- Sortable Main Canvas ---
new Sortable(canvas, { animation:150, ghostClass:'uk-background-muted', draggable: '.module-wrapper' });

// --- Initial Load ---
window.addEventListener('DOMContentLoaded', () => {
  loadModuleList();
  setGlobalBlockPadding(parseInt(paddingRange.value, 10), false);
  setGlobalBlockMargin(parseInt(marginRange.value, 10), false);
  animateAllTextElements();
  makeEditableAll();
});

// --- Ensure .module-content wrapper (for padding control) ---
function ensureModuleContent(wrapper) {
  if (!wrapper.querySelector('.module-content')) {
    // Don't wrap the close button
    let btn = wrapper.querySelector('button.uk-button-danger');
    let nodes = Array.from(wrapper.childNodes).filter(n => n !== btn);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'module-content';
    nodes.forEach(n => contentDiv.appendChild(n));
    wrapper.appendChild(contentDiv);
  }
}

// --- Add Module to Canvas ---
function addModuleToCanvas(file) {
  fetch(`presets/${file}`).then(r => r.text()).then(html => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('module-wrapper', 'uk-margin');
    // Close (remove) button
    const del = document.createElement('button');
    del.textContent = '×';
    del.className = 'uk-button uk-button-danger uk-button-small';
    del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
    wrapper.appendChild(del);

    // Insert module content and ensure wrapped
    wrapper.innerHTML += html;
    ensureModuleContent(wrapper);

    // Set all editable, color-editable, etc.
    makeEditableAll(wrapper);
    makeAccordionEditable(wrapper);
    makeSliderEditable(wrapper);

    // Re-enable editable for submit buttons
    wrapper.querySelectorAll('button[type="submit"]').forEach(btn => btn.setAttribute('data-editable', ''));

    canvas.appendChild(wrapper);
    animateAllTextElements();
    setGlobalBlockPadding(paddingRange.value, false);
    setGlobalBlockMargin(marginRange.value, false);
  });
}

// --- Padding & Margin Sliders ---
function setGlobalBlockPadding(val, animate = true) {
  document.querySelectorAll('.module-wrapper .module-content').forEach(content => {
    content.style.transition = animate ? 'padding 0.22s cubic-bezier(.47,1.64,.41,.8)' : '';
    content.style.padding = `${val}px 1.5em ${val}px 1.5em`;
  });
}
paddingRange.addEventListener('input', e => {
  const val = parseInt(e.target.value, 10);
  paddingValue.textContent = `${val}px`;
  setGlobalBlockPadding(val, true);
});
function setGlobalBlockMargin(val, animate = true) {
  document.querySelectorAll('.module-wrapper').forEach(block => {
    block.style.transition = animate ? 'margin 0.22s cubic-bezier(.47,1.64,.41,.8)' : '';
    block.style.marginBottom = `${val}px`;
  });
}
marginRange.addEventListener('input', e => {
  const val = parseInt(e.target.value, 10);
  marginValue.textContent = `${val}px`;
  setGlobalBlockMargin(val, true);
});

// --- UIkit Animation ---
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

// --- Format Bar (UIkit icons) ---
let lwbToolbar = document.createElement('div');
lwbToolbar.id = 'lwb-toolbar';
lwbToolbar.style.display = 'none';
lwbToolbar.innerHTML = `
  <button data-cmd="bold" title="Bold"><span uk-icon="bold"></span></button>
  <button data-cmd="italic" title="Italic"><span uk-icon="italic"></span></button>
  <button data-cmd="formatBlock-p" title="Paragraph"><b>P</b></button>
  <button data-cmd="formatBlock-h1" title="H1">H1</button>
  <button data-cmd="formatBlock-h2" title="H2">H2</button>
  <button data-cmd="formatBlock-h3" title="H3">H3</button>
  <button data-cmd="link" title="Add Link"><span uk-icon="link"></span></button>
  <button data-cmd="unlink" title="Remove Link"><span uk-icon="close"></span></button>
`;
document.body.appendChild(lwbToolbar);
UIkit.icon(lwbToolbar);

let lwbToolbarTarget = null;
canvas.addEventListener('click', function(e) {
  // Format bar logic
  if (lwbToolbar.contains(e.target)) return;
  let editable = e.target.closest('[data-editable]');
  if (editable && editable.isContentEditable) {
    lwbToolbarTarget = editable;
    const rect = editable.getBoundingClientRect();
    lwbToolbar.style.top = (window.scrollY + rect.top - lwbToolbar.offsetHeight - 10) + "px";
    lwbToolbar.style.left = (window.scrollX + rect.left) + "px";
    lwbToolbar.style.display = 'flex';
    setTimeout(() => lwbToolbar.style.opacity = 1, 0);
  } else {
    lwbToolbar.style.display = 'none';
    lwbToolbarTarget = null;
  }
});
lwbToolbar.addEventListener('mousedown', e => e.preventDefault());
lwbToolbar.addEventListener('click', function(e) {
  if (!lwbToolbarTarget) return;
  let cmd = e.target.closest('button')?.getAttribute('data-cmd');
  if (!cmd) return;
  lwbToolbarTarget.focus();
  document.execCommand('styleWithCSS', false, true);
  if (cmd === 'bold' || cmd === 'italic') {
    document.execCommand(cmd, false, null);
  } else if (cmd === 'link') {
    let url = prompt("Link URL:");
    if (url) document.execCommand('createLink', false, url);
  } else if (cmd === 'unlink') {
    document.execCommand('unlink', false, null);
  } else if (cmd.startsWith('formatBlock-')) {
    let block = cmd.split('-')[1];
    document.execCommand('formatBlock', false, block);
  }
});

// --- Make everything editable (text, color) ---
function makeEditableAll(scope) {
  (scope || canvas).querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
  (scope || canvas).querySelectorAll('[data-color-editable]').forEach(el => el.style.cursor = 'pointer');
}

// --- Image Upload/Replace (URL or local file) ---
canvas.addEventListener('click', function(e) {
  let imgPlaceholder = e.target.closest('.lwb-image-placeholder');
  let realImg = e.target.tagName === 'IMG' && e.target.closest('.module-wrapper') ? e.target : null;

  if (imgPlaceholder || realImg) {
    e.preventDefault();
    lwbImgTarget = imgPlaceholder || realImg;

    UIkit.modal.prompt('Paste image URL or leave empty for upload:', '', function(val) {
      if (val && val.trim()) {
        lwbReplaceImage(lwbImgTarget, val.trim());
      } else {
        lwbImageInput.value = '';
        lwbImageInput.click();
      }
    });
    return;
  }
});
lwbImageInput.onchange = () => {
  if (!lwbImgTarget) return;
  const file = lwbImageInput.files && lwbImageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    lwbReplaceImage(lwbImgTarget, e.target.result);
  };
  reader.readAsDataURL(file);
};
function lwbReplaceImage(target, src) {
  if (!target) return;
  // Replace placeholder with real <img>
  if (target.classList && target.classList.contains('lwb-image-placeholder')) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Image';
    img.style.width = target.style.width || '100%';
    img.style.height = target.style.height || 'auto';
    img.style.borderRadius = target.style.borderRadius || '1em';
    img.style.display = 'block';
    img.style.objectFit = 'cover';
    img.style.cursor = 'pointer';
    img.addEventListener('click', function(e) {
      e.stopPropagation();
      lwbImgTarget = img;
      UIkit.modal.prompt('Paste image URL or leave empty for upload:', '', function(val) {
        if (val && val.trim()) {
          img.src = val.trim();
        } else {
          lwbImageInput.value = '';
          lwbImageInput.click();
        }
      });
    });
    target.parentNode.replaceChild(img, target);
  } else if (target.tagName === 'IMG') {
    target.src = src;
  }
}

// --- Button/link editing dialog (dblclick) ---
canvas.addEventListener('dblclick', function(e) {
  // Ignore builder control buttons
  const isEditorBtn = e.target.closest('.lwb-acc-add, .lwb-slider-add, .lwb-acc-remove, .lwb-slider-remove, .uk-button-danger');
  if (isEditorBtn) return;

  let btn = e.target.closest('button, a');
  if (btn && btn.closest('.module-wrapper')) {
    e.preventDefault();

    // If it's a link (<a>)
    if (btn.tagName === 'A' || btn.hasAttribute('href')) {
      const currentText = btn.textContent;
      const currentHref = btn.getAttribute('href') || '';
      UIkit.modal.prompt('Button Text:', currentText, function(newText) {
        if (newText !== null) {
          btn.textContent = newText;
          UIkit.modal.prompt('Button Link/URL:', currentHref, function(newHref) {
            if (newHref !== null) {
              btn.setAttribute('href', newHref);
            }
          });
        }
      });
      return;
    }

    // If it's a regular button
    if (btn.tagName === 'BUTTON') {
      const currentText = btn.textContent;
      UIkit.modal.prompt('Button Text:', currentText, function(newText) {
        if (newText !== null) {
          btn.textContent = newText;
        }
      });
      return;
    }
  }
});

// --- Accordion editable logic ---
function makeAccordionEditable(wrapper) {
  wrapper.querySelectorAll('.uk-accordion').forEach(acc => {
    // Remove any extra add/remove buttons first
    acc.querySelectorAll('.lwb-acc-add, .lwb-acc-remove').forEach(b => b.remove());

    // Add + button centered
    if (!acc.parentNode.querySelector('.lwb-acc-add')) {
      const addBtn = document.createElement('button');
      addBtn.textContent = '+';
      addBtn.className = 'uk-button uk-button-primary lwb-acc-add';
      addBtn.onclick = () => {
        const li = document.createElement('li');
        li.innerHTML = `
          <a class="uk-accordion-title" href="#" data-editable>Section</a>
          <div class="uk-accordion-content" data-editable>Content...</div>
        `;
        acc.appendChild(li);
        makeAccordionEditable(wrapper);
        makeEditableAll(wrapper);
      };
      acc.parentNode.appendChild(addBtn);
    }
    // Add remove button to each section
    acc.querySelectorAll('li').forEach(li => {
      li.querySelectorAll('.lwb-acc-remove').forEach(b => b.remove());
      const remBtn = document.createElement('button');
      remBtn.innerHTML = '&ndash;';
      remBtn.className = 'uk-button uk-button-danger uk-button-small lwb-acc-remove';
      remBtn.onclick = e => { e.stopPropagation(); li.remove(); };
      remBtn.style.position = 'absolute';
      remBtn.style.left = '-28px';
      remBtn.style.top = '10px';
      li.style.position = 'relative';
      li.appendChild(remBtn);
    });
    // Make accordion sections draggable
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

// --- Slider editable logic ---
function makeSliderEditable(wrapper) {
  wrapper.querySelectorAll('.uk-slideshow-items').forEach(slideshow => {
    // Add "+" button (once)
    if (!wrapper.querySelector('.lwb-slider-add')) {
      const addBtn = document.createElement('button');
      addBtn.innerHTML = '<span uk-icon="plus"></span>';
      addBtn.className = 'uk-button uk-button-primary lwb-slider-add';
      addBtn.onclick = () => {
        const li = document.createElement('li');
        li.innerHTML = `
          <a href="#" class="lwb-slide-image">
            <div class="lwb-image-placeholder" style="width: 320px; height: 180px;">
              <span uk-icon="icon: image; ratio: 2"></span>
            </div>
          </a>
          <div class="uk-overlay uk-overlay-primary uk-position-bottom uk-text-center">
            <span data-editable>New caption…</span>
          </div>
        `;
        slideshow.appendChild(li);
        makeSliderEditable(wrapper);
        makeEditableAll(wrapper);
      };
      wrapper.appendChild(addBtn);
      UIkit.icon(addBtn);
    }

    // Remove all delete buttons, then add
    slideshow.querySelectorAll('li').forEach(li => {
      li.querySelectorAll('.lwb-slider-remove').forEach(btn => btn.remove());
      const remBtn = document.createElement('button');
      remBtn.innerHTML = '–';
      remBtn.className = 'uk-button uk-button-danger uk-button-small lwb-slider-remove';
      remBtn.onclick = e => { e.stopPropagation(); li.remove(); };
      remBtn.style.position = 'absolute';
      remBtn.style.right = '-20px';
      remBtn.style.top = '10px';
      li.style.position = 'relative';
      li.appendChild(remBtn);
    });

    // Slides draggable
    if (!slideshow.lwbSortable) {
      new Sortable(slideshow, {
        handle: '.lwb-slide-image',
        animation: 150,
        ghostClass: 'uk-background-muted',
        draggable: 'li'
      });
      slideshow.lwbSortable = true;
    }

    // Lightbox on image click
    slideshow.querySelectorAll('.lwb-slide-image img').forEach(img => {
      img.onclick = e => {
        e.preventDefault();
        UIkit.lightboxPanel({items:[{source: img.src, type: 'image'}]}).show();
      };
    });
  });
}

// --- Save/Load/Export Functions ---

function getSiteData() {
  // Save each block’s inner HTML (including .module-content and controls)
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
        // Re-bind delete/edit controls:
        wrapper.querySelectorAll('button.uk-button-danger').forEach(btn => {
          btn.onclick = e => { e.stopPropagation(); wrapper.remove(); };
        });
        ensureModuleContent(wrapper);
        makeEditableAll(wrapper);
        makeAccordionEditable(wrapper);
        makeSliderEditable(wrapper);
        // Re-enable editable for submit buttons
        wrapper.querySelectorAll('button[type="submit"]').forEach(btn => btn.setAttribute('data-editable', ''));
        canvas.appendChild(wrapper);
      });
      animateAllTextElements();
      setGlobalBlockPadding(paddingRange.value, false);
      setGlobalBlockMargin(marginRange.value, false);
      makeEditableAll();
      UIkit.notification('Loaded!', 'primary');
    } catch {
      UIkit.notification('Import failed.', 'danger');
    }
  };
  r.readAsText(f);
};

exportBtn.onclick = async () => {
  // Fetch UIkit CSS
  let uikitCSS = '';
  try {
    uikitCSS = await fetch('https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/css/uikit.min.css').then(r => r.text());
  } catch(e) {}
  // Fetch your custom CSS
  let customCSS = '';
  try {
    customCSS = await fetch('style.css').then(r => r.text());
  } catch(e) {}

  // Gather dynamic inline styles (padding, margin, color edits)
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
    // padding and margin handled in .module-content and .module-wrapper
    const modContent = m.querySelector('.module-content');
    if (modContent) {
      const pad = modContent.style.padding;
      if (pad) {
        styleCounter++;
        const uniqueBlockClass = `lwb-blockpad-${styleCounter}`;
        modContent.classList.add(uniqueBlockClass);
        dynamicCSS += `.${uniqueBlockClass} { padding: ${pad} !important; }\n`;
      }
    }
    const margin = m.style.marginBottom;
    if (margin) {
      styleCounter++;
      const uniqueBlockClass = `lwb-blockmargin-${styleCounter}`;
      m.classList.add(uniqueBlockClass);
      dynamicCSS += `.${uniqueBlockClass} { margin-bottom: ${margin} !important; }\n`;
    }
  });

  // Strip ALL builder-only controls and edit modes
  let bodyContent = '';
  document.querySelectorAll('.module-wrapper').forEach(m => {
    const clone = m.cloneNode(true);
    // Remove all builder controls
    clone.querySelectorAll(
      'button.uk-button-danger, .uk-position-top-right, .uk-position-top-left, .lwb-acc-add, .lwb-acc-remove, .lwb-slider-add, .lwb-slider-remove, #lwb-toolbar'
    ).forEach(b => b.remove());
    // Remove contenteditable
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    // Remove onsubmit handlers
    clone.querySelectorAll('form').forEach(form => form.removeAttribute('onsubmit'));
    bodyContent += clone.innerHTML;
  });

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

  // Download file
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