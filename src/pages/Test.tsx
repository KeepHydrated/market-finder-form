const Test = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Reported By:</h2>
        </div>
        <div className="rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Person Reported:</h2>
        </div>
        <div className="rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Report:</h2>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 border rounded-lg p-6 bg-card">
        <div>
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">NH</span>
            </div>
            <div className="flex flex-col">
              <p className="font-medium text-foreground">Nadia Hibri</p>
              <p className="text-sm text-muted-foreground">nadiachibri@gmail.com</p>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">NT</span>
            </div>
            <div className="flex flex-col">
              <p className="font-medium text-foreground">Nadia's Test account</p>
              <p className="text-sm text-muted-foreground">info@quotally.com</p>
            </div>
          </div>
        </div>
        <div>
          <div>
            <p className="text-foreground font-semibold">Inappropriate Content</p>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                This vendor has been posting inappropriate content on their profile page that violates community guidelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;

