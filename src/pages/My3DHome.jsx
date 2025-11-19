import My3DHomeScene from '@/components/My3DHomeScene';

export default function My3DHome() {
  return (
    <div className="w-full h-screen bg-gray-100 relative">
      <h1 className="sr-only">Mijn 3D Thuis</h1>
      <My3DHomeScene />
    </div>
  );
}