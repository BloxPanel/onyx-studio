import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

// Exercise the editor's actual event handlers without adding a DOM/test dependency.
const require = createRequire(import.meta.url);
function editor(initialProject) {
  const slots = [];
  const effects = [];
  const listeners = {};
  let saved;
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!deps || !slots[index] || deps.some((dep, i) => dep !== slots[index][i])) effects.push(effect);
      slots[index] = deps;
    },
  };
  class Element {
    constructor(editing = false) { this.isContentEditable = editing; }
    closest() { return this.isContentEditable ? this : null; }
  }
  const cache = new Map();
  const load = filename => {
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} };
    cache.set(filename, module.exports);
    const code = ts.transpileModule(readFileSync(new URL(filename), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
    }).outputText;
    const localRequire = name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') {
        const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
        return { jsx, jsxs: jsx };
      }
      if (name.endsWith('.css')) return {};
      if (name.startsWith('.')) return load(new URL(`${name}${name.endsWith('Inspector') ? '.tsx' : '.ts'}`, filename).href);
      return require(name);
    };
    vm.runInNewContext(code, {
      module, exports: module.exports, require: localRequire, crypto: globalThis.crypto,
      structuredClone, console, URL, HTMLElement: Element,
      localStorage: { getItem: () => initialProject ? JSON.stringify(initialProject) : null, setItem(key, value) { saved = value; } },
      window: { addEventListener: (name, handler) => { listeners[name] = handler; }, removeEventListener() {} },
    }, { filename });
    return module.exports;
  };
  const Component = load(new URL('../src/editors/website/WebsiteEditor.tsx', import.meta.url).href).default;
  let tree;
  function render() { cursor = 0; tree = Component(); effects.splice(0).forEach(effect => effect()); }
  function nodes(node = tree) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children].flat(Infinity).filter(child => child !== undefined).flatMap(child => nodes(child))];
  }
  const button = label => nodes().find(node => node.type === 'button' && [node.props.children].flat().join('') === label);
  function click(label) { const node = button(label); assert.ok(node, label); assert.ok(!node.props.disabled, `${label} enabled`); node.props.onClick(); render(); }
  function key(value, options = {}) {
    let prevented = false;
    listeners.keydown({ key: value, ctrlKey: true, target: new Element(), preventDefault() { prevented = true; }, ...options });
    render();
    return prevented;
  }
  const blocks = () => nodes().filter(node => node.props?.className?.startsWith('onyx-free-block'));
  render();
  const exportWebsite = load(new URL('../src/editors/website/websiteExporter.ts', import.meta.url).href).exportWebsite;
  const { validProject } = load(new URL('../src/editors/website/websiteValidation.ts', import.meta.url).href);
  return { button, click, key, blocks, nodes, render, Element, saved: () => saved, validProject,
    html: () => exportWebsite(JSON.parse(saved)) };
}

test('add, drag, edit properties, undo and redo preserve element data', () => {
  const app = editor();
  assert.equal(app.button('Undo').props.disabled, true);
  assert.equal(app.button('Redo').props.disabled, true);
  const count = app.blocks().length;
  app.click('+ Heading');
  let block = app.blocks().at(-1);
  const before = block.props.style.left;
  const pointer = { button: 0, pointerId: 1, clientX: 0, clientY: 0, stopPropagation() {}, preventDefault() {},
    currentTarget: { closest: () => ({ getBoundingClientRect: () => ({ width: 1000 }) }), setPointerCapture() {} } };
  block.props.onPointerDown(pointer);
  block.props.onPointerMove({ ...pointer, clientX: 43 });
  app.render();
  assert.equal(app.key('z'), false, 'history shortcuts ignored during drag');
  block.props.onPointerUp(pointer);
  app.render();
  const moved = app.blocks().at(-1).props.style.left;
  assert.notEqual(moved, before);
  app.nodes().find(node => node.type === 'textarea' && node.props.value === 'Your heading').props.onChange({ target: { value: 'Edited heading' } });
  app.render();
  app.click('Undo');
  assert.equal(app.blocks().at(-1).props.children[2].props.children, 'Your heading');
  app.key('z');
  assert.equal(app.blocks().at(-1).props.style.left, before);
  app.key('z');
  assert.equal(app.blocks().length, count);
  app.key('y');
  app.key('z', { shiftKey: true });
  app.click('Redo');
  assert.equal(app.blocks().length, count + 1);
  block = app.blocks().at(-1);
  assert.equal(block.props.style.left, moved);
  assert.equal(block.props.children[2].props.children, 'Edited heading');
  assert.equal(app.button('Redo').props.disabled, true);
  const saved = app.saved();
  const html = app.html();
  app.click('Undo');
  app.click('Redo');
  assert.equal(app.saved(), saved, 'autosaved project round trips exactly');
  assert.equal(app.html(), html, 'exported HTML round trips exactly');
});

test('new edits clear redo; editable fields keep native undo', () => {
  const app = editor();
  app.click('+ Heading');
  assert.equal(app.key('z', { target: new app.Element(true) }), false);
  assert.equal(app.button('Undo').props.disabled, false);
  app.click('Undo');
  app.click('+ Text');
  assert.equal(app.button('Redo').props.disabled, true);
  assert.equal(app.key('y'), true);
});

for (const [axis, style, backward, forward, boundary] of [
  ['x', 'left', 'ArrowLeft', 'ArrowRight', 920],
  ['y', 'top', 'ArrowUp', 'ArrowDown', 360],
]) {
test(`${axis} arrows nudge 1px, respect canvas edges and text editing, and support history`, () => {
  const app = editor();
  assert.equal(app.key(backward, { ctrlKey: false }), false);
  app.click('+ Icon');
  const before = app.saved();
  const originalX = app.blocks().at(-1).props.style[style];
  assert.equal(app.key(forward, { ctrlKey: false }), true);
  assert.equal(app.blocks().at(-1).props.style[style], originalX + 1);
  assert.equal(app.key(backward, { ctrlKey: false }), true);
  assert.equal(app.saved(), before);
  assert.equal(app.key(forward, { ctrlKey: false, target: new app.Element(true) }), false);
  assert.equal(app.saved(), before);
  app.key(forward, { ctrlKey: false });
  app.click('Undo');
  assert.equal(app.saved(), before);
  app.click('Redo');
  assert.equal(app.blocks().at(-1).props.style[style], originalX + 1);
  for (const position of [0, boundary]) {
    const project = JSON.parse(before);
    project.blocks[0].children.at(-1)[axis] = position;
    const edge = editor(project);
    edge.blocks().at(-1).props.onClick({ stopPropagation() {} });
    edge.render();
    edge.key(position === 0 ? backward : forward, { ctrlKey: false });
    assert.equal(edge.saved(), JSON.stringify(project));
    assert.equal(edge.button('Undo').props.disabled, true);
  }
});
}

test('history retains at most 50 undo entries', () => {
  const app = editor();
  const count = app.blocks().length;
  for (let i = 0; i < 55; i++) app.click('+ Heading');
  for (let i = 0; i < 50; i++) app.click('Undo');
  assert.equal(app.button('Undo').props.disabled, true);
  assert.equal(app.blocks().length, count + 5);
  for (let i = 0; i < 50; i++) app.click('Redo');
  assert.equal(app.blocks().length, count + 55);
  assert.equal(app.button('Redo').props.disabled, true);
});

for (const label of ['Icon', 'Badge', 'Container', 'Screenshot Frame', 'FAQ']) {
  test(`${label}: defaults, resizing, history, autosave and reload`, () => {
    const app = editor();
    const count = app.blocks().length;
    app.click(`+ ${label}`);
    assert.equal(app.blocks().length, count + 1);
    assert.deepEqual(app.nodes().filter(node => node.type === 'legend').map(node => node.props.children), ['Content', 'Typography', 'Appearance', 'Layout']);
    let project = JSON.parse(app.saved());
    assert.equal(app.validProject(project), true);
    const before = app.saved();
    const block = app.blocks().at(-1);
    const handle = app.nodes(block).find(node => node.props?.className === 'onyx-resize-handle');
    const pointer = { button: 0, pointerId: 1, clientX: 0, clientY: 0, stopPropagation() {}, preventDefault() {},
      currentTarget: { closest: () => ({ getBoundingClientRect: () => ({ width: 1000 }) }), setPointerCapture() {} } };
    handle.props.onPointerDown(pointer);
    block.props.onPointerMove({ ...pointer, clientX: -10, clientY: -5 });
    block.props.onPointerUp(pointer);
    app.render();
    project = JSON.parse(app.saved());
    assert.equal(project.blocks[0].children.at(-1).width, block.props.style.width - 10);
    const after = app.saved();
    app.click('Undo');
    assert.equal(app.saved(), before);
    app.click('Redo');
    assert.equal(app.saved(), after);
    const restored = editor(project);
    assert.equal(restored.saved(), after);
    assert.equal(restored.html(), app.html());
  });
}

test('layering changes paint order and round trips through undo/redo', () => {
  const app = editor();
  app.click('+ Badge');
  const before = app.saved();
  const addedId = JSON.parse(before).blocks[0].children.at(-1).id;
  app.click('Send Backward');
  assert.equal(JSON.parse(app.saved()).blocks[0].children.at(-2).id, addedId);
  assert.equal(app.blocks().at(-2).props.style.zIndex, 2);
  app.click('Bring Forward');
  assert.equal(app.saved(), before);
  app.click('Undo');
  assert.equal(JSON.parse(app.saved()).blocks[0].children.at(-2).id, addedId);
  app.click('Redo');
  assert.equal(app.saved(), before);
});

test('all Card presets are editable, exported and undoable', () => {
  const app = editor();
  app.click('+ Card');
  const before = app.saved();
  for (const preset of ['feature', 'information', 'project']) {
    const select = app.nodes().find(node => node.props?.['aria-label'] === 'Card Preset');
    select.props.onChange({ target: { value: preset } });
    app.render();
    const block = JSON.parse(app.saved()).blocks[0].children.at(-1);
    assert.equal(block.cardPreset, preset);
    assert.ok(app.html().includes(block.text));
    assert.equal(app.validProject(JSON.parse(app.saved())), true);
  }
  app.click('Undo'); app.click('Undo'); app.click('Undo');
  assert.equal(app.saved(), before);
});

test('legacy version-1 projects load without new fields; malformed new fields are rejected', () => {
  const app = editor();
  const legacy = JSON.parse(app.saved());
  app.click('+ Card');
  legacy.blocks[0].children.push(JSON.parse(app.saved()).blocks[0].children.at(-1));
  delete legacy.blocks[0].children.at(-1).cardPreset;
  const restored = editor(legacy);
  assert.equal(restored.saved(), JSON.stringify(legacy));
  for (const change of [{ iconName: '../unsafe' }, { iconSize: 'large' }, { imageUrl: 42 }, { browserHeader: 'yes' }, { faqAnswer: {} }, { cardPreset: 'invalid' }]) {
    const invalid = structuredClone(legacy);
    Object.assign(invalid.blocks[0].children[0], change);
    assert.equal(app.validProject(invalid), false);
  }
});

test('FAQ export is native expandable HTML and all new text/URLs are escaped', () => {
  const app = editor();
  for (const type of ['Icon', 'Badge', 'Container', 'Screenshot Frame', 'FAQ']) app.click(`+ ${type}`);
  const project = JSON.parse(app.saved());
  const blocks = project.blocks[0].children;
  for (const block of blocks.slice(-5)) Object.assign(block, {
    text: '<script>unsafe</script>', url: 'javascript:alert(1)', imageUrl: 'javascript:alert(1)', faqAnswer: '<img onerror=alert(1)>',
  });
  const faq = blocks.at(-1);
  faq.faqOpen = true;
  const html = editor(project).html();
  assert.ok(html.includes('<details open'));
  assert.ok(html.includes('<summary'));
  assert.ok(html.includes('&lt;img onerror=alert(1)&gt;'));
  assert.ok(html.includes("mask:url('https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/"));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('<script>unsafe'));
});

test('export metadata edits persist, support undo/redo, and generate escaped head tags', () => {
  const app = editor();
  const panel = () => app.nodes().find(node => node.props?.className === 'website-export-metadata');
  const edit = (label, value) => {
    const node = app.nodes(panel()).find(node => node.type === 'label' && node.props.children[0] === label);
    const input = app.nodes(node).find(node => ['input', 'textarea'].includes(node.type));
    input.props.onChange({ target: { value } });
    app.render();
  };
  edit('Page Title', 'My "Website"');
  edit('Description', 'A <great> site & more');
  edit('Author', 'Onyx');
  edit('Keywords (comma-separated)', 'website, studio');
  edit('Canonical URL', 'https://example.com/?a=1&b=2');
  edit('Social Preview Image URL', 'https://example.com/preview.png');
  edit('Favicon URL', 'https://example.com/favicon.ico');
  edit('Language (e.g. en or en-US)', 'en-US');
  const saved = app.saved();
  assert.equal(app.validProject(JSON.parse(saved)), true);
  const html = app.html();
  assert.ok(html.includes('<html lang="en-US">'));
  assert.ok(html.includes('<title>My &quot;Website&quot;</title>'));
  assert.ok(html.includes('name="description" content="A &lt;great&gt; site &amp; more"'));
  assert.ok(html.includes('rel="canonical" href="https://example.com/?a=1&amp;b=2"'));
  assert.ok(html.includes('property="og:image" content="https://example.com/preview.png"'));
  assert.ok(html.includes('rel="icon" href="https://example.com/favicon.ico"'));
  app.click('Undo');
  assert.ok(app.html().includes('<html lang="en">'));
  app.click('Redo');
  assert.equal(app.saved(), saved);
  assert.equal(editor(JSON.parse(saved)).html(), html);
  const unsafe = JSON.parse(saved);
  unsafe.metadata.canonicalUrl = 'javascript:alert(1)';
  unsafe.metadata.imageUrl = 'javascript:alert(1)';
  unsafe.metadata.faviconUrl = 'javascript:alert(1)';
  unsafe.metadata.language = '\"><script>alert(1)</script>';
  const safeHtml = editor(unsafe).html();
  assert.ok(!safeHtml.includes('javascript:'));
  assert.ok(!safeHtml.includes('<script>alert(1)'));
  assert.ok(safeHtml.includes('<html lang="en">'));
  for (const metadata of [null, [], 'invalid', { description: 42 }]) {
    assert.equal(app.validProject({ ...JSON.parse(saved), metadata }), false);
  }
});
