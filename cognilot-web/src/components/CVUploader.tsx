import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import type { ApiError } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface CVUploaderProps {
  onUploadSuccess: (data: any) => void;
}

export const CVUploader: React.FC<CVUploaderProps> = ({ onUploadSuccess }) => {
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
      const result = await api.uploadFile<any>('/onboarding/parse-cv', file);

      // Check if result has any data
      const hasData = Object.values(result).some((v) => v !== null && v !== '');

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
      console.error('Error uploading CV:', error);
      const apiError = error as ApiError;

      let errorMessage = 'Hubo un error al procesar tu CV.';
      let description = 'Por favor intenta de nuevo más tarde.';

      if (apiError.status === 413) {
        errorMessage = 'Archivo demasiado grande';
        description = 'El límite máximo es de 5MB.';
      } else if (apiError.status === 400) {
        errorMessage = 'Formato no soportado';
        description = 'Asegúrate de subir un PDF o Word válido.';
      } else if (apiError.status === 500) {
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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 border-dashed p-4 transition-all duration-300 ${
        isDragging
          ? 'border-brand-secondary bg-surface-elevated'
          : 'border-surface-soft hover:border-white/20'
      }`}
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
        <div className="flex flex-col items-center justify-center py-2 animate-pulse">
          <div className="text-3xl mb-1">⚡</div>
          <p className="text-sm font-medium gradient-text">Analizando con IA...</p>
          <p className="text-[10px] text-ghost">Extrayendo datos...</p>
          <div className="w-full h-1 bg-surface-soft mt-4 rounded-full overflow-hidden">
            <div className="h-full bg-brand-gradient animate-shimmer w-full"></div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center cursor-pointer text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-3xl mb-1">📄</div>
          <h3 className="text-sm font-bold mb-0.5">
            <span className="gradient-text">Completar con IA</span>
          </h3>
          <p className="text-[10px] text-dim mb-2 leading-tight">
            Arrastra tu CV aquí o haz click para subir (PDF o DOCX)
          </p>
          <Button variant="secondary" size="sm" className="text-[10px] h-7 px-2.5">
            Subir Archivo
          </Button>
        </div>
      )}
    </div>
  );
};
