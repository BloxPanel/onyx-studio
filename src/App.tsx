import { useState } from 'react';
import './index.css';

type Framework = 'pycord' | 'discord.py' | 'discord.js';

function App() {
  const [framework, setFramework] = useState<Framework>('pycord');
  const [title, setTitle] = useState('Welcome to Onyx Studio!');
  const [description, setDescription] = useState('Design visually. Export real code.');
  const [color, setColor] = useState('#5865F2');
  const [footer, setFooter] = useState('Made with Onyx Studio');

  const pythonCode = `import discord

embed = discord.Embed(
    title=${JSON.stringify(title)},
    description=${JSON.stringify(description)},
    color=discord.Color(0x${color.slice(1)})
)
${footer ? `
embed.set_footer(text=${JSON.stringify(footer)})` : ''}`;

  const javascriptCode = `const { EmbedBuilder } = require('discord.js');

const embed = new EmbedBuilder()
    .setTitle(${JSON.stringify(title)})
    .setDescription(${JSON.stringify(description)})
    .setColor('${color}')${footer ? `
    .setFooter({ text: ${JSON.stringify(footer)} })` : ''};`;

  const code = framework === 'discord.js' ? javascriptCode : pythonCode;

  function downloadCode() {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = framework === 'discord.js' ? 'embed.js' : 'embed.py';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>◆ ONYX STUDIO</h2>
        <p className="subtitle">Visual Development Platform</p>
        <div className="nav active">Discord Studio</div>
        <div className="nav disabled">Website Studio — Soon</div>
        <div className="nav disabled">More editors coming</div>
        <div className="sidebar-bottom">Open Source • v0.1</div>
      </aside>

      <main className="main">
        <header>
          <div>
            <h1>Discord Studio</h1>
            <p>Build Discord embeds without writing code.</p>
          </div>
          <button onClick={downloadCode}>Export Code ↓</button>
        </header>

        <div className="workspace">
          <section className="panel">
            <h3>Properties</h3>

            <label>Embed Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} />

            <label>Description</label>
            <textarea rows={5} value={description}
              onChange={e => setDescription(e.target.value)} />

            <label>Accent Color</label>
            <input type="color" value={color}
              onChange={e => setColor(e.target.value)} />

            <label>Footer</label>
            <input value={footer} onChange={e => setFooter(e.target.value)} />
          </section>

          <section className="panel preview-panel">
            <h3>Live Preview</h3>
            <div className="discord">
              <div className="embed" style={{ borderColor: color }}>
                <strong>{title}</strong>
                <p>{description}</p>
                {footer && <small>{footer}</small>}
              </div>
            </div>
          </section>
        </div>

        <section className="panel code-panel">
          <div className="code-header">
            <h3>Generated Code</h3>
            <select value={framework}
              onChange={e => setFramework(e.target.value as Framework)}>
              <option value="pycord">Pycord</option>
              <option value="discord.py">discord.py</option>
              <option value="discord.js">discord.js</option>
            </select>
            <button onClick={() => navigator.clipboard.writeText(code)}>
              Copy Code
            </button>
          </div>
          <pre><code>{code}</code></pre>
        </section>
      </main>
    </div>
  );
}

export default App;
