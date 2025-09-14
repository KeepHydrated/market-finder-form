import { Heart } from "lucide-react";

const Likes = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-16">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-3xl font-bold mb-2">Your Likes</h1>
          <p className="text-muted-foreground">
            Items you've liked will appear here
          </p>
        </div>
      </div>
    </div>
  );
};

export default Likes;