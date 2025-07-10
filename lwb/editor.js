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

// Always set contentEditable for all [data-editable]
function makeEditableAll() {
  document.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
}

// Sidebar preset drag setup
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

// Canvas drop events
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

search.addEventListener('input', () => loadModuleList(search.value));

// Color picker setup
let colorInput = document.getElementById('lwb-color-picker');
if (!colorInput) {
  colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.id = 'lwb-color-picker';
  document.body.appendChild(colorInput);
}
let colorTarget = null;

// Add module to canvas and set editability
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
      const del = document.createElement('button');
      del.textContent = '×';
      del.className = 'uk-button uk-button-danger uk-button-small uk-position-top-right';
      del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
      wrapper.appendChild(del);
      // Set contentEditable for live editing
      wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
      canvas.appendChild(wrapper);
      makeEditableAll();
    })
    .catch(err => {
      UIkit.notification(err.message, 'danger');
      console.error(err);
    });
}

// Double-click for color picker; click hides it
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
// Hide picker on normal click
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

// Make sure all [data-editable] are editable after load
window.addEventListener('DOMContentLoaded', makeEditableAll);

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
      makeEditableAll();
      UIkit.notification('Loaded!', 'primary');
    } catch {
      UIkit.notification('Import failed.', 'danger');
    }
  };
  r.readAsText(f);
};

// EXPORT: async, standalone, with UIkit + custom + dynamic CSS embedded
exportBtn.onclick = async () => {
  // Fetch UIkit CSS
  let uikitCSS = '';
  try {
    uikitCSS = await fetch('https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/css/uikit.min.css').then(r => r.text());
  } catch(e) {
    uikitCSS = '';
  }

  // Fetch custom CSS
  let customCSS = '';
  try {
    customCSS = await fetch('style.css').then(r => r.text());
  } catch(e) {
    customCSS = '';
  }

  // Collect dynamic color styles
  let dynamicCSS = '';
  let styleCounter = 0;
  canvas.querySelectorAll('.module-wrapper').forEach(m => {
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

  // Build the exported HTML
  let bodyContent = '';
  canvas.querySelectorAll('.module-wrapper').forEach(m => {
    const clone = m.cloneNode(true);
    clone.querySelectorAll('button').forEach(b => b.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
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

// Save to localStorage and as file
saveBtn.onclick = () => {
  const data = JSON.stringify(getSiteData());
  localStorage.setItem('site', data);
  // Download as file
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

// Load from file
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
      makeEditableAll();
      UIkit.notification('Project loaded!');
    } catch {
      UIkit.notification('Import failed.', 'danger');
    }
  };
  r.readAsText(f);
};

// Create a hidden file input for image uploads
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

// Listen for clicks on images to select a new one
canvas.addEventListener('click', e => {
  // For images: single click with alt key, or double click
  if (
    (e.target.tagName === 'IMG' && (e.altKey || e.detail === 2)) ||
    (e.target.closest('img') && (e.altKey || e.detail === 2))
  ) {
    imgTarget = e.target.tagName === 'IMG' ? e.target : e.target.closest('img');
    // Ask: Upload or URL?
    UIkit.modal.prompt('Paste image URL or click OK to upload an image:', '', function(val){
      if (val && val.trim()) {
        imgTarget.src = val.trim();
      } else {
        imageInput.click();
      }
    });
  }
});

// On image file input change, update image src
imageInput.onchange = () => {
  if (imageInput.files && imageInput.files[0] && imgTarget) {
    const reader = new FileReader();
    reader.onload = e => {
      imgTarget.src = e.target.result;
    };
    reader.readAsDataURL(imageInput.files[0]);
  }
};

// Inline link editing: double-click a link or button with href
canvas.addEventListener('dblclick', e => {
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
  // (existing double-click handler for color picker continues...)
});

// Make any UIkit accordion dynamic (add/remove sections)
function makeAccordionEditable(wrapper) {
  wrapper.querySelectorAll('.uk-accordion').forEach(acc => {
    // Add "+" button if not present
    if (!acc.querySelector('.lwb-acc-add')) {
      const addBtn = document.createElement('button');
      addBtn.textContent = '+ Add Section';
      addBtn.className = 'uk-button uk-button-small uk-button-primary lwb-acc-add';
      addBtn.style.marginTop = '1em';
      addBtn.onclick = () => {
        const li = document.createElement('li');
        li.innerHTML = `
          <a class="uk-accordion-title" href="#" data-editable>New Section</a>
          <div class="uk-accordion-content"><p data-editable>New content…</p></div>
          <button class="uk-button uk-button-danger uk-button-small lwb-acc-remove" style="position:absolute;right:1em;top:0.6em;">×</button>
        `;
        acc.appendChild(li);
        makeAccordionEditable(wrapper);
        makeEditableAll();
      };
      acc.parentElement.appendChild(addBtn);
    }
    // Add remove buttons for each item
    acc.querySelectorAll('li').forEach(li => {
      if (!li.querySelector('.lwb-acc-remove')) {
        const remBtn = document.createElement('button');
        remBtn.textContent = '×';
        remBtn.className = 'uk-button uk-button-danger uk-button-small lwb-acc-remove';
        remBtn.style.position = 'absolute';
        remBtn.style.right = '1em';
        remBtn.style.top = '0.6em';
        remBtn.onclick = e => { e.stopPropagation(); li.remove(); };
        li.appendChild(remBtn);
      }
    });
  });
}

// Call after adding modules
function addModuleToCanvas(file) {
  fetch(`presets/${file}`)
    .then(r => r.text())
    .then(html => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('module-wrapper','uk-margin');
      wrapper.innerHTML = html;
      const del = document.createElement('button');
      del.textContent = '×';
      del.className = 'uk-button uk-button-danger uk-button-small uk-position-top-right';
      del.onclick = e => { e.stopPropagation(); wrapper.remove(); };
      wrapper.appendChild(del);
      wrapper.querySelectorAll('[data-editable]').forEach(el => el.contentEditable = true);
      // Make accordions editable
      makeAccordionEditable(wrapper);
      canvas.appendChild(wrapper);
      makeEditableAll();
    })
    .catch(err => {
      UIkit.notification(err.message, 'danger');
      console.error(err);
    });
}

function makeAccordionEditable(wrapper) {
  wrapper.querySelectorAll('.uk-accordion').forEach(acc => {
    // Only one add button per accordion
    let addBtn = acc.parentElement.querySelector('.lwb-acc-add');
    if (!addBtn) {
      addBtn = document.createElement('button');
      addBtn.textContent = '+ Add Section';
      addBtn.className = 'uk-button uk-button-primary lwb-acc-add';
      addBtn.style.display = 'block';
      addBtn.style.margin = '1.5em auto 0 auto';
      addBtn.style.borderRadius = '1em';
      addBtn.style.fontWeight = '600';
      addBtn.style.fontSize = '1em';
      addBtn.style.padding = '0.3em 1.2em';
      addBtn.style.textAlign = 'center';
      addBtn.onclick = () => {
        const li = document.createElement('li');
        li.innerHTML = `
          <a class="uk-accordion-title" href="#" data-editable>New Section</a>
          <div class="uk-accordion-content"><p data-editable>New content…</p></div>
          <button class="uk-button uk-button-danger uk-button-small lwb-acc-remove" style="position:absolute;left:-1.8em;top:0.6em;z-index:10;">×</button>
        `;
        acc.appendChild(li);
        makeAccordionEditable(wrapper);
        makeEditableAll();
      };
      acc.parentElement.appendChild(addBtn);
    }
    // Remove all delete buttons, then add them at left edge of each section
    acc.querySelectorAll('li').forEach(li => {
      li.querySelectorAll('.lwb-acc-remove').forEach(btn => btn.remove());
      const remBtn = document.createElement('button');
      remBtn.textContent = '×';
      remBtn.className = 'uk-button uk-button-danger uk-button-small lwb-acc-remove';
      remBtn.style.position = 'absolute';
      remBtn.style.left = '-1.8em';
      remBtn.style.top = '0.6em';
      remBtn.style.zIndex = '10';
      remBtn.onclick = e => { e.stopPropagation(); li.remove(); };
      li.appendChild(remBtn);
      // Ensure relative for button position
      li.style.position = 'relative';
    });

    // Make sections draggable
    if (!acc.lwbSortable) {
      new Sortable(acc, {
        handle: '.uk-accordion-title',
        animation: 160,
        ghostClass: 'uk-background-muted',
        draggable: 'li'
      });
      acc.lwbSortable = true;
    }
  });
}

// Editable placeholders and submit button in forms
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
  // Editable button (e.g., submit)
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
  // (existing color picker logic)
  const el = e.target.closest('[data-color-editable]');
  if (el) {
    // ... color picker code as before ...
  }
});

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
    // Position toolbar
    const rect = range.getBoundingClientRect();
    lwbToolbar.style.left = `${rect.left + window.scrollX}px`;
    lwbToolbar.style.top = `${rect.top + window.scrollY - 44}px`;
    lwbToolbar.style.display = 'flex';
  } else {
    lwbToolbar.style.display = 'none';
    lwbSelEditable = null;
  }
});

// Hide on click outside
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
  // Execute formatting commands
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
  // Hide toolbar after action
  lwbToolbar.style.display = 'none';
});


// Image upload handler for placeholders and images
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

// Show prompt/input on click of placeholder or img
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

// Handle file input for image upload
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

// Helper: Replace placeholder with real image
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
  // Clicking image opens image picker again
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

const paddingRange = document.getElementById('paddingRange');
const paddingValue = document.getElementById('paddingValue');

// Helper: animate padding change for all blocks
function setGlobalBlockPadding(val, animate = true) {
  document.querySelectorAll('.module-wrapper').forEach(block => {
    if (animate) {
      block.style.transition = 'padding 0.22s cubic-bezier(.47,1.64,.41,.8)';
    } else {
      block.style.transition = '';
    }
    block.style.padding = `${val}px 1.5em ${val}px 1.5em`;
  });
}

// On range change: update blocks and label
paddingRange.addEventListener('input', e => {
  const val = parseInt(e.target.value, 10);
  paddingValue.textContent = `${val}px`;
  setGlobalBlockPadding(val, true);
});

// Also apply on page load (default 24px or whatever the initial value is)
window.addEventListener('DOMContentLoaded', () => {
  setGlobalBlockPadding(parseInt(paddingRange.value, 10), false);
});

function animateAllTextElements(animationClass = 'uk-animation-fade') {
  canvas.querySelectorAll('h1, h2, h3, h4, p, [data-editable]').forEach(el => {
    el.classList.add(animationClass);
  });
}

// Call after adding a module or loading site:
function addModuleToCanvas(file) {
  fetch(`presets/${file}`)
    .then(r => r.text())
    .then(html => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('module-wrapper','uk-margin');
      wrapper.innerHTML = html;
      // ... existing code for delete btn etc ...
      canvas.appendChild(wrapper);
      makeEditableAll();
      makeAccordionEditable(wrapper);
      animateAllTextElements(); // Add animation to new content!
    })
    .catch(err => {
      UIkit.notification(err.message, 'danger');
      console.error(err);
    });
}

window.addEventListener('DOMContentLoaded', () => {
  setGlobalBlockPadding(parseInt(paddingRange.value, 10), false);
  animateAllTextElements();
});

const textAnimationSelect = document.getElementById('textAnimationSelect');
let currentTextAnimation = textAnimationSelect.value;

// Remove old and add new animation class to all text elements
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

// Update after module add/load
function animateAllTextElements(animationClass = currentTextAnimation) {
  canvas.querySelectorAll('h1, h2, h3, h4, p, [data-editable]').forEach(el => {
    el.classList.add(animationClass);
  });
}

// Call updateTextAnimations() after adding module or loading site, as before

