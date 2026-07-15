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
    <div className="flex relative items-start hover:bg-white/5 -mx-4 px-4 rounded transition-colors group py-2">
      <input
        type="text"
        value={localKey}
        onChange={(e) => setLocalKey(e.target.value)}
        onBlur={handleKeyBlur}
        aria-label="Field name"
        placeholder="field name"
        className="text-white/90 font-medium bg-transparent outline-none w-[160px] md:w-[200px] shrink-0 py-1.5 focus:bg-white/5 rounded px-2 -ml-2 transition-colors"
      />
      <span className="text-white/20 py-1.5 pr-3 select-none -ml-1">:</span>

      <AutoResizeTextarea
        value={value}
        onChange={(e) => onChange(labelKey, e.target.value)}
        aria-label={labelKey}
        className="text-white/70 flex-1 py-1.5 min-w-0 placeholder:text-white/15 focus:bg-white/5 rounded px-2 -mx-2 transition-colors"
      />

      <button
        onClick={() => onDelete(labelKey)}
        className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 p-3 ml-2 -my-1.5 transition-opacity h-11 w-11 flex items-center justify-center rounded-md hover:bg-white/5 h-fit"
        title="Delete field"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

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
    onFieldChange(oldKey, undefined);
  };

  const handleCustomDelete = (key: string) => {
    const newData = { ...customData };
    delete newData[key];
    onFieldChange('data_learned', newData);
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
    <section className="bg-bg-primary/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden relative animate-fade-in">
      {(isSaving || showSaveSuccess) && (
        <div className="absolute inset-0 z-50 bg-surface/80 backdrop-blur-xl flex flex-col items-center justify-center transition-all duration-300">
          {isSaving ? (
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-4 border-white/10 border-t-accent-cyan rounded-full animate-spin" />
              <span className="text-white/60 font-medium text-sm animate-pulse">Saving...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 animate-scale-in">
              <div className="w-14 h-14 bg-success/10 text-success rounded-full flex items-center justify-center border border-success/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-success font-medium text-sm">Saved successfully</span>
            </div>
          )}
        </div>
      )}

      <div className="p-6 md:p-8">
        <div className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
          Learned Data
        </div>
        <div
          ref={customSectionRef}
          id="section-custom"
          className={`relative transition-all duration-1000 ${
            focusField === 'custom'
              ? 'ring-2 ring-accent-cyan/30 rounded-xl p-4 bg-accent-cyan/5'
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

            <div className="flex relative items-start mt-4 bg-white/2 border border-dashed border-white/10 rounded-lg p-2.5 hover:border-accent-cyan/30 transition-colors focus-within:border-accent-cyan/50 focus-within:bg-accent-cyan/5">
              <div className="text-accent-cyan/50 select-none shrink-0 mr-3 flex items-center font-bold">
                +
              </div>
              <input
                type="text"
                className="bg-transparent text-white outline-none flex-1 placeholder:text-white/20 text-sm"
                placeholder="Type 'Field: Value' and press Enter..."
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
