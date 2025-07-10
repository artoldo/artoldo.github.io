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