import type { FC } from 'react';
import type { Student } from '@/lib/types';
import NotificationCenter from './notification-center';


interface WelcomeHeaderProps {
  student?: Student;
  name?: string;
  onClearNotifications?: () => void;
}

const WelcomeHeader: FC<WelcomeHeaderProps> = ({ student, name, onClearNotifications }) => {
  const displayName = student?.name || name || '';

  return (
    <div className="flex items-center justify-between space-y-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          {displayName === 'Admin' ? 'Hoş geldin, Admin!' : `Hoş geldin, ${displayName}!`}
        </h1>
        <p className="text-muted-foreground">
          {displayName === 'Admin' ? 'Sisteme genel bir bakış.' : 'İşte bugünkü ilerlemen ve analizlerin.'}
        </p>
      </div>
       {student && onClearNotifications && (
        <NotificationCenter student={student} onClear={onClearNotifications} />
      )}
    </div>
  );
};

export default WelcomeHeader;
