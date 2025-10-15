const Test = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Column 1</h2>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Column 2</h2>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Column 3</h2>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Column 4</h2>
        </div>
      </div>
    </div>
  );
};

export default Test;

