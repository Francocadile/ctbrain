import RoutineEditor from '../RoutineEditor';

export default function NuevaRutinaCTPage() {
  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
  <h2 className="h2 text-ink-900 mb-4 tracking-tight">Nueva rutina de fuerza</h2>
      <RoutineEditor mode="nuevo" />
    </div>
  );
}
