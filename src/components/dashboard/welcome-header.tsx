import type { FC } from 'react';

interface WelcomeHeaderProps {
  name: string;
}

const WelcomeHeader: FC<WelcomeHeaderProps> = ({ name }) => {
  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Welcome, {name}!
        </h1>
        <p className="text-muted-foreground">
          Here's your progress and insights for today.
        </p>
      </div>
    </div>
  );
};

export default WelcomeHeader;
