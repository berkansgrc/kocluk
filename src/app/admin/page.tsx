import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function AdminPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">
            Admin Paneli
          </h1>
          <p className="text-muted-foreground">
            Uygulama verilerini ve ayarlarını yönetin.
          </p>
        </div>
      </div>
      <Separator />
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Hoş Geldiniz</CardTitle>
            <CardDescription>
              Burası sizin admin paneliniz. Gelecekte buraya daha fazla özellik
              ekleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Yönetim görevlerinizi buradan gerçekleştirebilirsiniz.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
