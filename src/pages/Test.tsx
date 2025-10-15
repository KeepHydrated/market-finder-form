import { Link } from 'react-router-dom';

const Test = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Person Reported:</h2>
          <Link 
            to="/profile" 
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">NT</span>
            </div>
            <div className="flex flex-col">
              <p className="font-medium text-foreground">Nadia's Test account</p>
              <p className="text-sm text-muted-foreground">info@quotally.com</p>
            </div>
          </Link>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Reported By:</h2>
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

