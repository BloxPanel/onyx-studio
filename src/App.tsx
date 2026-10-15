import { useState } from 'react';
import DiscordEditor from './editors/discord/DiscordEditor';
import WebsiteEditor from './editors/website/WebsiteEditor';

export default function App() {
  const [workspace, setWorkspace] = useState<'discord' | 'website'>('website');

  return (
    <>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        background: '#090d16',
        borderBottom: '1px solid #303648',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <strong style={{ marginRight: 15 }}>◆ ONYX STUDIO</strong>
        <button
          onClick={() => setWorkspace('website')}
          style={{
            background: workspace === 'website' ? '#6366f1' : '#242b3e',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            padding: '10px 14px',
            cursor: 'pointer',
          }}
        >
          Website Studio
        </button>
        <button
          onClick={() => setWorkspace('discord')}
          style={{
            background: workspace === 'discord' ? '#6366f1' : '#242b3e',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            padding: '10px 14px',
            cursor: 'pointer',
          }}
        >
          Discord Studio
        </button>
      </nav>
      {workspace === 'website' ? <WebsiteEditor /> : <DiscordEditor />}
    </>
  );
}
