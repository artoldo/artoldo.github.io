exportBtn.onclick = async () => {
  // Fetch UIkit CSS as text
  const uikitCSS = await fetch('https://cdn.jsdelivr.net/npm/uikit@3.19.2/dist/css/uikit.min.css').then(r => r.text());

  // Fetch your custom style.css as text (must be in the same directory as exported html)
  const customCSS = await fetch('style.css').then(r => r.text()).catch(() => '');

  // Collect any dynamic (inline) color styles as a CSS block
  let dynamicCSS = '';
  let styleCounter = 0;
  canvas.querySelectorAll('.module-wrapper').forEach(m => {
    // For every editable color element, create a unique class for its style
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

  // Build the HTML as a standalone file
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
  /* UIkit CSS */
  ${uikitCSS}
  /* Your custom styles */
  ${customCSS}
  /* Dynamic colors set in builder */
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