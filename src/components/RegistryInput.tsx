const REGISTRY_SUGGESTIONS = [
  'aflobaton/laurel-infra-manager:latest',
  'aflobaton/configurator-lob:latest',
  'aflobaton/manejo-finanzas:latest',
  'aflobaton/cronogramas-api:latest',
  'aflobaton/cronograms-worker-fcm:latest',
  'aflobaton/tomanotas:latest',
];

interface RegistryInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

// Campo de texto con sugerencias (datalist) para el registro de imagen Docker.
// El usuario puede elegir una opcion predefinida o escribir lo que quiera.
export function RegistryInput({ value, onChange, className, disabled }: RegistryInputProps) {
  return (
    <>
      <input
        type="text"
        list="registry-suggestions"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="aflobaton/mi-app:latest"
        className={className}
      />
      <datalist id="registry-suggestions">
        {REGISTRY_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
