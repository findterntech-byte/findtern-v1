import React, { useEffect, useMemo, useRef, useState } from 'react';
import { countryCodes } from '../../lib/countryCodes';

interface Props {
  id?: string;
  name?: string;
  value: string; // e.g. "+91"
  onChange: (code: string) => void;
  placeholder?: string;
}

export default function CountrySelect({ id, name, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState<number>(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(
    () => [...countryCodes].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const filtered = query
    ? options.filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => setQuery(''), [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      setHighlight(0);
      return;
    }

    if (e.key === 'ArrowDown') {
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlight((h) => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (open && highlight >= 0 && highlight < filtered.length) {
        onChange(filtered[highlight].code);
        setOpen(false);
      } else {
        setOpen((s) => !s);
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.preventDefault();
    }
  }

  const selected = options.find((c) => c.code === value);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        id={id}
        name={name}
        value={query || (selected ? `${selected.code} ${selected.name}` : '')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Search country or code'}
        className="contact-v5__input"
        aria-expanded={open}
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-autocomplete="list"
        role="combobox"
        autoComplete="off"
      />

      {open && (
        <div
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 40,
            width: '100%',
            maxHeight: 280,
            overflow: 'auto',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            marginTop: 6,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: 10, color: '#666' }}>No countries found.</div>
          )}

          {filtered.map((c, i) => (
            <div
              key={`${c.code}-${c.name}`}
              role="option"
              aria-selected={value === c.code}
              onMouseDown={(ev) => {
                // prevent blur
                ev.preventDefault();
                onChange(c.code);
                setOpen(false);
              }}
              onMouseEnter={() => setHighlight(i)}
              style={{
                padding: '8px 10px',
                cursor: 'pointer',
                background: highlight === i ? '#f3f7ff' : 'transparent',
                borderLeft: value === c.code ? '3px solid #2b6cb0' : '3px solid transparent',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontWeight: 700, color: '#111827', flex: '0 0 auto' }}>{c.code}</span>
              <span style={{ color: '#333', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
