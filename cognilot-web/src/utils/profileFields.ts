// Profile field definitions and validation

export type ProfileField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select' | 'date' | 'social';
  readOnly?: boolean;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select inputs
  group?: string; // For internal grouping within a section
  maxLength?: number;
};

export type ProfileSection = {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: ProfileField[];
  required: boolean;
};

export const profileSections: ProfileSection[] = [
  {
    id: 'location',
    title: 'Localización',
    description: 'Ubicación geográfica para filtros de búsqueda.',
    icon: '📍',
    required: false,
    fields: [
      { name: 'country', label: 'País', type: 'text' },
      { name: 'city', label: 'Ciudad', type: 'text' },
      { name: 'address', label: 'Dirección', type: 'text' },
    ],
  },
  {
    id: 'experience',
    title: 'Experiencia',
    description: 'Trayectoria profesional y rol actual.',
    icon: '💼',
    required: false,
    fields: [
      { name: 'current_company', label: 'Empresa Actual', type: 'text' },
      { name: 'current_role', label: 'Rol Actual', type: 'text' },
      { name: 'years_experience', label: 'Años de Experiencia', type: 'text' },
    ],
  },
  {
    id: 'education',
    title: 'Educación',
    description: 'Formación académica principal.',
    icon: '🎓',
    required: false,
    fields: [
      { name: 'degree', label: 'Título', type: 'text' },
      { name: 'university', label: 'Institución', type: 'text' },
    ],
  },
];

export function calculateSectionCompletion(
  section: ProfileSection,
  profileData: Record<string, unknown>
): { completed: number; total: number } {
  const total = section.fields.length;
  const completed = section.fields.filter((field) => {
    const value = profileData[field.name];
    return value !== undefined && value !== null && value !== '';
  }).length;

  return { completed, total };
}

export function calculateOverallCompletion(profileData: Record<string, unknown>): number {
  let totalFields = 0;
  let completedFields = 0;

  profileSections.forEach((section) => {
    const { completed, total } = calculateSectionCompletion(section, profileData);
    totalFields += total;
    completedFields += completed;
  });

  return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
}

export function areRequiredFieldsComplete(profileData: Record<string, unknown>): boolean {
  return profileSections
    .filter((s) => s.required)
    .every((section) =>
      section.fields
        .filter((f) => f.required)
        .every((field) => {
          const value = profileData[field.name];
          return value !== undefined && value !== null && value !== '';
        })
    );
}
