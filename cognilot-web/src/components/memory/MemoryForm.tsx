import { type FC, useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  formatLearnedTextarea,
  normalizeDataLearned,
  parseLearnedTextarea,
} from '../../utils/dataLearned';

interface MemoryFormProps {
  formData: Record<string, unknown>;
  onFieldChange: (name: string, value: unknown) => void;
  isLocating: boolean;
  onDetectLocation: () => Promise<void>;
  isSaving: boolean;
  showSaveSuccess: boolean;
  focusField?: string | null;
}

/**
 * Auto-resizing textarea that expands vertically as the user types.
 */
const AutoResizeTextarea: FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      className={`bg-transparent outline-none resize-none overflow-hidden block ${props.className || ''}`}
    />
  );
};

/**
 * Single editable key:value row rendered in the terminal/memory style.
 */
const CustomFieldRow: FC<{
  labelKey: string;
  value: string;
  onChange: (key: string, val: string) => void;
  onRename: (oldKey: string, newKey: string) => void;
  onDelete: (key: string) => void;
}> = ({ labelKey, value, onChange, onRename, onDelete }) => {
  const [localKey, setLocalKey] = useState(labelKey);

  const handleKeyBlur = () => {
    if (localKey !== labelKey && localKey.trim() !== '') {
      onRename(labelKey, localKey.trim());
    } else {
      setLocalKey(labelKey);
    }
  };

  return (
    <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors group py-1">
      <input
        type="text"
        value={localKey}
        onChange={(e) => setLocalKey(e.target.value)}
        onBlur={handleKeyBlur}
        aria-label="Clave de dato"
        placeholder="clave"
        className="text-accent-violet font-semibold bg-transparent outline-none w-[160px] md:w-[200px] shrink-0 py-1.5 focus:bg-white/5 rounded px-2 -ml-2 transition-colors"
      />
      <span className="text-accent-violet/50 py-1.5 pr-3 select-none -ml-1">:</span>

      <AutoResizeTextarea
        value={value}
        onChange={(e) => onChange(labelKey, e.target.value)}
        aria-label={labelKey}
        className="text-white flex-1 py-1.5 min-w-0 placeholder:text-white/10 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
      />

      <button
        onClick={() => onDelete(labelKey)}
        className="text-error/50 hover:text-error opacity-0 group-hover:opacity-100 p-3 ml-2 -my-1.5 transition-opacity h-11 w-11 flex items-center justify-center rounded-md hover:bg-white/5 h-fit"
        title="Eliminar campo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * MemoryForm
 *
 * Renders all profile memory data exclusively in the terminal key:value style.
 * There are no standard form inputs — every field follows the IDE/terminal aesthetic
 * consistent with the rest of the Cognilot design system.
 */
export const MemoryForm: FC<Omit<MemoryFormProps, 'isLocating' | 'onDetectLocation'>> = ({
  formData,
  onFieldChange,
  isSaving,
  showSaveSuccess,
  focusField,
}) => {
  const customSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusField) {
      const element = document.getElementById(`section-${focusField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (focusField === 'custom' && customSectionRef.current) {
        customSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusField]);

  // All memory data lives in the JSONB data_learned field
  const customData = normalizeDataLearned(formData.data_learned);
  const customKeys = Object.keys(customData);

  const handleCustomChange = (key: string, val: string) => {
    const options = parseLearnedTextarea(val);
    onFieldChange('data_learned', { ...customData, [key]: options });
    onFieldChange(key, options[0] || undefined);
  };

  const handleCustomRename = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const newData = { ...customData };
    newData[newKey] = newData[oldKey];
    delete newData[oldKey];
    onFieldChange('data_learned', newData);
    onFieldChange(newKey, newData[newKey]?.[0] || undefined);
    // Remove old flattened entry to prevent it being re-added on save
    onFieldChange(oldKey, undefined);
  };

  const handleCustomDelete = (key: string) => {
    const newData = { ...customData };
    delete newData[key];
    onFieldChange('data_learned', newData);
    // Remove flattened entry to prevent it being re-added on save
    onFieldChange(key, undefined);
  };

  const [newFieldText, setNewFieldText] = useState('');

  const handleNewFieldKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = newFieldText;
      const colonIdx = val.indexOf(':');
      if (colonIdx > 0) {
        const k = val.substring(0, colonIdx).trim();
        const v = val.substring(colonIdx + 1).trim();
        if (k) {
          handleCustomChange(k, v);
          setNewFieldText('');
        }
      }
    }
  };

  return (
    <section className="bg-surface/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden font-mono text-[13px] leading-relaxed relative animate-scale-in">
      {/* Saving / Success overlay */}
      {(isSaving || showSaveSuccess) && (
        <div className="absolute inset-0 z-50 bg-surface/80 backdrop-blur-xl flex flex-col items-center justify-center transition-all duration-300">
          {isSaving ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-brand-secondary/20 border-t-brand-secondary rounded-full animate-spin" />
              <span className="text-brand-secondary font-bold tracking-[0.2em] font-sans text-sm animate-pulse">
                GUARDANDO...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 animate-scale-in">
              <div className="w-14 h-14 bg-success/10 text-success rounded-full flex items-center justify-center border border-success/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-success font-bold tracking-[0.2em] font-sans text-sm">
                GUARDADO EXITOSO
              </span>
            </div>
          )}
        </div>
      )}

      {/* macOS window controls mock */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2 select-none">
        <div className="flex gap-2 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
          <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
        </div>
        <div className="text-white/30 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 font-sans font-bold flex-1 justify-end">
          MEMORY.MD
        </div>
      </div>

      <div className="p-6 md:p-8">
        {/* All memory fields rendered in terminal key:value style */}
        <div
          ref={customSectionRef}
          id="section-custom"
          className={`relative transition-all duration-1000 ${
            focusField === 'custom'
              ? 'ring-2 ring-brand-secondary/50 rounded-xl p-4 bg-brand-secondary/5'
              : ''
          }`}
        >
          <div className="space-y-1">
            {customKeys.map((key) => (
              <CustomFieldRow
                key={key}
                labelKey={key}
                value={formatLearnedTextarea(customData[key])}
                onChange={handleCustomChange}
                onRename={handleCustomRename}
                onDelete={handleCustomDelete}
              />
            ))}

            {/* New field input */}
            <div className="flex relative items-start mt-4 bg-black/20 border border-dashed border-white/10 rounded-lg p-2.5 hover:border-brand-secondary/30 transition-colors focus-within:border-brand-secondary/50 focus-within:bg-brand-secondary/5">
              <div className="text-brand-secondary/50 select-none shrink-0 mr-3 flex items-center font-bold">
                +
              </div>
              <input
                type="text"
                className="bg-transparent text-white outline-none flex-1 placeholder:text-white/20 text-sm"
                placeholder="Ejemplo: 'Disponibilidad: Inmediata' y presiona Enter..."
                value={newFieldText}
                onChange={(e) => setNewFieldText(e.target.value)}
                onKeyDown={handleNewFieldKeyDown}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
