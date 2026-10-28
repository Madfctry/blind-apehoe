import Link from 'next/link';
import { PixelText } from '@/components/PixelText';

export default function NotFound() {
  return (
    <main className="shell flex min-h-[100svh] flex-col items-start justify-center gap-8 pt-8">
      <p className="label">ERROR 404 · FILE NOT FOUND</p>
      <PixelText as="h1" text="this page was never here." className="t-px" />
      <Link href="/" className="btn">
        BACK TO THE ARCHIVE
      </Link>
    </main>
  );
}
