import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import type { ApiError } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';

interface CVUploaderProps {
  onUploadSuccess: (data: unknown) => void;
  className?: string;
}

export const CVUploader: React.FC<CVUploaderProps> = ({ onUploadSuccess, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;

    // Validate by MIME first and by extension as fallback for browsers that omit MIME.
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const lowerName = file.name.toLowerCase();
    const hasValidExtension = lowerName.endsWith('.pdf') || lowerName.endsWith('.docx');
    const hasValidMime = validTypes.includes((file.type || '').toLowerCase());

    if (!hasValidMime && !hasValidExtension) {
      alert('Por favor sube un archivo PDF o Word (.docx)');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Analizando CV con IA...', {
      description: 'Extrayendo datos estructurados de tu perfil',
    });

    try {
      const result = await api.uploadFile<Record<string, unknown>>('/onboarding/parse-cv', file);

      // Check if result has any data
      const hasData =
        result &&
        typeof result === 'object' &&
        Object.values(result).some((v) => v !== null && v !== '');

      if (!hasData) {
        toast.warning('No se pudo extraer mucha información', {
          id: toastId,
          description: 'Asegúrate de que el archivo sea legible o intenta con otro.',
        });
      } else {
        toast.success('¡CV Procesado!', {
          id: toastId,
          description: 'Datos extraídos correctamente.',
        });
      }

      onUploadSuccess(result);
    } catch (error) {
      const apiError = error && typeof error === 'object' ? (error as ApiError) : null;

      console.error('Error uploading CV:', {
        name: error instanceof Error ? error.name : typeof error,
        message: apiError?.message ?? (error instanceof Error ? error.message : error),
        status: apiError?.status,
      });

      let errorMessage = 'Hubo un error al procesar tu CV.';
      let description = 'Por favor intenta de nuevo más tarde.';

      if (apiError?.status === 401) {
        errorMessage = 'Sesión expirada';
        description = 'Por favor recarga la página e inicia sesión de nuevo.';
      } else if (apiError?.status === 413) {
        errorMessage = 'Archivo demasiado grande';
        description = 'El límite máximo es de 5MB.';
      } else if (apiError?.status === 400) {
        errorMessage = 'Formato no soportado';
        description = 'Asegúrate de subir un PDF o Word válido.';
      } else if (apiError?.status === 500) {
        errorMessage = 'Error del servidor';
        description = 'Nuestro motor de IA está teniendo dificultades. Reintenta en unos momentos.';
      }

      toast.error(errorMessage, {
        id: toastId,
        description,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file) {
        void processFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file) {
        void processFile(file);
      }
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-dashed p-6 transition-all duration-200 ${
        isDragging
          ? 'border-accent-cyan bg-accent-cyan/5'
          : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
      } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.docx"
        className="hidden"
        data-testid="cv-file-input"
      />

      {isUploading ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <Loader2 className="w-8 h-8 text-accent-cyan animate-spin mb-3" />
          <p className="text-sm font-medium text-white">Analizando CV con IA...</p>
          <p className="text-xs text-white/50 mt-1">Extrayendo experiencia laboral y habilidades</p>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center cursor-pointer text-center group"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 group-hover:border-accent-cyan/40 group-hover:text-accent-cyan transition-colors text-white/60">
            <UploadCloud className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">
            Completar con IA <span className="text-white/40 font-normal">o arrastra tu CV</span>
          </h3>
          <p className="text-xs text-white/50 mb-4 max-w-sm">
            Arrastra tu CV aquí o haz click para subir (archivos PDF o DOCX de hasta 5MB)
          </p>
          <Button
            variant="terminal"
            size="sm"
            type="button"
            className="pointer-events-none group-hover:bg-white/10"
          >
            <FileText className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Seleccionar Archivo</span>
          </Button>
        </div>
      )}
    </div>
  );
};
