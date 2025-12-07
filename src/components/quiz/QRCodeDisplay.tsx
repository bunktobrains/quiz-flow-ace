import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface QRCodeDisplayProps {
  joinUrl: string;
  quizTitle: string;
  token: string;
}

export const QRCodeDisplay = ({ joinUrl, quizTitle, token }: QRCodeDisplayProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-4 border-foreground shadow-lg">
      <CardHeader className="border-b-4 border-foreground bg-secondary text-secondary-foreground text-center">
        <CardTitle className="text-xl font-bold uppercase tracking-wide">
          Join Quiz
        </CardTitle>
        <p className="text-sm mt-1">{quizTitle}</p>
      </CardHeader>
      <CardContent className="p-8 flex flex-col items-center gap-6">
        <div className="p-4 bg-card border-4 border-foreground">
          <QRCodeSVG 
            value={joinUrl}
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Or enter code</p>
          <p className="font-mono text-3xl font-bold tracking-widest border-4 border-foreground px-6 py-3">
            {token}
          </p>
        </div>

        <div className="w-full">
          <p className="text-xs text-muted-foreground mb-2 text-center">Join URL</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm border-2 border-foreground bg-background font-mono truncate"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
